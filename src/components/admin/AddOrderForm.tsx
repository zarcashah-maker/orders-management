'use client'

import { useId, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Factory, ProductType } from '@/types'
import {
  getProductTypeLabel,
  PRODUCT_DETAIL_FIELDS_BY_LOCALE,
  getProductTypeOptions,
  isImageAttachment,
} from '@/lib/orders'
import { generateOrderNumber } from '@/lib/utils'
import { usePreferences } from '@/lib/i18n'
import { X, Package, Image as ImageIcon, Paperclip } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'

interface AddOrderFormProps {
  factories: Factory[]
  onCancel: () => void
  onCreated: () => void
  variant?: 'modal' | 'page'
}

type PendingUpload = {
  file: File
  isDesignImage: boolean
}

type UploadedOrderFile = PendingUpload & {
  storagePath: string
  publicUrl: string
}

const customDetailSuffix = '__custom'

export function AddOrderForm({ factories, onCancel, onCreated, variant = 'page' }: AddOrderFormProps) {
  const idPrefix = useId()
  const createInFlightRef = useRef(false)
  const [productType, setProductType] = useState<ProductType | ''>('')
  const [details, setDetails] = useState<Record<string, string>>({})
  const [sallaOrderNumber, setSallaOrderNumber] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [designImages, setDesignImages] = useState<File[]>([])
  const [attachments, setAttachments] = useState<File[]>([])
  const [factoryId, setFactoryId] = useState(factories[0]?.id || '')
  const [quantity, setQuantity] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const { profile } = useAuth()
  const { locale, t } = usePreferences()
  const productTypeOptions = getProductTypeOptions(locale)
  const isPage = variant === 'page'

  async function handleCreate() {
    if (createInFlightRef.current || saving) return
    if (!productType || !factoryId) {
      toast.error(locale === 'ar' ? 'يرجى اختيار نوع المنتج واختيار المصنع' : 'Please select a product type and factory')
      return
    }

    createInFlightRef.current = true
    setSaving(true)
    const orderId = crypto.randomUUID()
    let uploadedFiles: UploadedOrderFile[] = []
    let orderWasInserted = false

    try {
      const orderDetails = buildOrderDetails()
      const internalOrderNumber = generateOrderNumber()
      const files: PendingUpload[] = [
        ...designImages.map(file => ({ file, isDesignImage: true })),
        ...attachments.map(file => ({ file, isDesignImage: false })),
      ]

      uploadedFiles = await uploadOrderFiles(orderId, files)

      const { error } = await supabase.from('orders').insert({
        id: orderId,
        order_number: internalOrderNumber,
        salla_order_number: sallaOrderNumber.trim() || null,
        customer_phone: customerPhone.trim() || null,
        product_type: productType,
        details: orderDetails,
        assigned_factory_id: factoryId,
        quantity: quantity ? parseInt(quantity) : 1,
        due_date: dueDate || null,
        general_notes: notes.trim() || null,
        status: 'pending',
        created_by: profile?.id || null,
        order_date: new Date().toISOString().slice(0, 10),
      })
      if (error) throw error
      orderWasInserted = true

      if (uploadedFiles.length > 0) {
        const attachmentRows = uploadedFiles.map(item => ({
          id: crypto.randomUUID(),
          order_id: orderId,
          file_url: item.publicUrl,
          file_name: item.file.name,
          attachment_type: item.file.type || 'application/octet-stream',
          storage_path: item.storagePath,
          notes: item.isDesignImage ? 'Design image' : null,
        }))
        const { error: attachmentError } = await supabase.from('attachments').insert(attachmentRows)
        if (attachmentError) throw attachmentError

        const imageRows = uploadedFiles
          .filter(item => item.isDesignImage || isImageAttachment({ file_name: item.file.name, attachment_type: item.file.type || 'application/octet-stream' }))
          .map(item => ({
            order_id: orderId,
            url: item.publicUrl,
            caption: item.isDesignImage ? 'Design image' : item.file.name,
          }))

        if (imageRows.length > 0) {
          const { error: imageError } = await supabase.from('order_images').insert(imageRows)
          if (imageError && process.env.NODE_ENV === 'development') {
            console.warn('Order thumbnail rows were not created, but the order and attachments were saved.', imageError)
          }
        }
      }

      toast.success(locale === 'ar' ? 'تم إنشاء الطلب بنجاح' : 'Order created successfully')
      onCreated()
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Create order error:', err)
      }
      await rollbackFailedCreate(orderId, uploadedFiles, orderWasInserted)
      toast.error(locale === 'ar' ? 'تعذر إنشاء الطلب. لم يتم حفظ طلب جزئي.' : 'Could not create order. No partial order was saved.')
    } finally {
      setSaving(false)
      createInFlightRef.current = false
    }
  }

  function buildOrderDetails() {
    if (!productType) return {}
    const fields = PRODUCT_DETAIL_FIELDS_BY_LOCALE[locale][productType]
    const result: Record<string, string> = {}

    fields.forEach(field => {
      if (!isDetailFieldVisible(field.key)) return
      const selectedValue = (details[field.key] || '').trim()
      const customValue = (details[`${field.key}${customDetailSuffix}`] || '').trim()
      const finalValue = field.customOption && selectedValue === field.customOption ? customValue : selectedValue
      if (finalValue) result[field.key] = finalValue
    })

    return result
  }

  async function uploadOrderFiles(orderId: string, files: PendingUpload[]) {
    const uploaded: UploadedOrderFile[] = []

    try {
      for (const item of files) {
        const safeName = item.file.name.replace(/[^\w.\-]+/g, '-')
        const storagePath = `${orderId}/${crypto.randomUUID()}-${safeName}`
        const { error: uploadError } = await supabase.storage
          .from('order-attachments')
          .upload(storagePath, item.file)
        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('order-attachments')
          .getPublicUrl(storagePath)

        uploaded.push({
          ...item,
          storagePath,
          publicUrl: publicUrlData.publicUrl,
        })
      }
    } catch (err) {
      await removeUploadedFiles(uploaded)
      throw err
    }

    return uploaded
  }

  async function rollbackFailedCreate(orderId: string, uploaded: UploadedOrderFile[], orderWasInserted: boolean) {
    if (orderWasInserted) {
      await supabase.from('orders').delete().eq('id', orderId)
    }
    await removeUploadedFiles(uploaded)
  }

  async function removeUploadedFiles(uploaded: UploadedOrderFile[]) {
    const paths = uploaded.map(item => item.storagePath)
    if (paths.length === 0) return
    const { error } = await supabase.storage.from('order-attachments').remove(paths)
    if (error && process.env.NODE_ENV === 'development') {
      console.warn('Could not remove uploaded files after failed order creation.', error)
    }
  }

  function updateDetail(key: string, value: string) {
    setDetails(current => {
      const next = { ...current, [key]: value }
      const customKey = `${key}${customDetailSuffix}`
      if (value !== getDetailField(key)?.customOption) delete next[customKey]

      PRODUCT_DETAIL_FIELDS_BY_LOCALE[locale][productType as ProductType]?.forEach(field => {
        if (field.showWhen?.key === key && !field.showWhen.values.includes(value)) {
          delete next[field.key]
          delete next[`${field.key}${customDetailSuffix}`]
        }
      })

      return next
    })
  }

  function getDetailField(key: string) {
    if (!productType) return undefined
    return PRODUCT_DETAIL_FIELDS_BY_LOCALE[locale][productType].find(field => field.key === key)
  }

  function isDetailFieldVisible(key: string) {
    const field = getDetailField(key)
    if (!field?.showWhen) return true
    return field.showWhen.values.includes(details[field.showWhen.key])
  }

  const fileInputClass = isPage
    ? 'block w-full text-sm text-stone-500 file:ml-3 file:border-0 file:rounded-lg file:bg-stone-700 file:text-white file:px-3 file:py-2 file:text-sm'
    : 'sr-only'

  return (
    <div className={isPage ? 'bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden' : 'flex h-full w-full flex-col overflow-hidden bg-white lg:max-h-[calc(100vh-2rem)] lg:rounded-2xl'}>
      <div className="flex shrink-0 items-center justify-between border-b border-stone-100 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
            <Package size={18} className="text-white" />
          </div>
          <h2 className="font-bold text-stone-900">{t('newOrder')}</h2>
        </div>
        <button type="button" onClick={onCancel} disabled={saving} className="text-stone-400 hover:text-stone-600 disabled:opacity-40 transition-colors p-1">
          <X size={20} />
        </button>
      </div>

      <div className={isPage ? 'p-4 sm:p-5 space-y-4' : 'min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5 [-webkit-overflow-scrolling:touch]'}>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">{t('productType')} *</label>
          <select
            value={productType}
            onChange={e => {
              setProductType(e.target.value as ProductType | '')
              setDetails({})
            }}
            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent appearance-none"
          >
            <option value="">{locale === 'ar' ? 'اختر نوع المنتج' : 'Select product type'}</option>
            {productTypeOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">{t('sallaOrderNumber')}</label>
            <input
              type="text"
              value={sallaOrderNumber}
              onChange={e => setSallaOrderNumber(e.target.value)}
              placeholder={locale === 'ar' ? 'مثال: 123456789' : 'Example: 123456789'}
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">{t('customerPhone')}</label>
            <input
              type="tel"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              placeholder={locale === 'ar' ? 'اختياري' : 'Optional'}
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
              dir="ltr"
            />
          </div>
        </div>

        {productType && (
          <div className="rounded-2xl bg-brand-50/40 border border-brand-100 p-4">
            <p className="text-sm font-semibold text-stone-800 mb-3">{t('details')} {getProductTypeLabel(productType, null, locale)}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {PRODUCT_DETAIL_FIELDS_BY_LOCALE[locale][productType].filter(field => isDetailFieldVisible(field.key)).map(field => {
                const selectedValue = details[field.key] || ''
                const customKey = `${field.key}${customDetailSuffix}`
                const isCustom = Boolean(field.customOption && selectedValue === field.customOption)

                return (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">{field.label}</label>
                    {field.type === 'select' ? (
                      <div className="space-y-2">
                        <select
                          value={selectedValue}
                          onChange={e => updateDetail(field.key, e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent appearance-none"
                        >
                          <option value="">{locale === 'ar' ? 'اختر' : 'Select'}</option>
                          {field.options?.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                        {isCustom && (
                          <input
                            type="text"
                            value={details[customKey] || ''}
                            onChange={e => setDetails(current => ({ ...current, [customKey]: e.target.value }))}
                            placeholder={field.customPlaceholder || (locale === 'ar' ? 'اكتب القيمة' : 'Type value')}
                            className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                          />
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={details[field.key] || ''}
                        onChange={e => updateDetail(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">{t('factory')} *</label>
            <select
              value={factoryId}
              onChange={e => setFactoryId(e.target.value)}
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent appearance-none"
            >
              {factories.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">{t('quantity')}</label>
            <input
              type="number"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="0"
              min="1"
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
              dir="ltr"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">{t('dueDate')}</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
              dir="ltr"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">{t('notes')}</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder={locale === 'ar' ? 'أي تعليمات مهمة للمصنع...' : 'Any important instructions for the factory...'}
            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-2xl bg-stone-50 border border-stone-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon size={16} className="text-stone-500" />
              <label htmlFor={`${idPrefix}-design-images`} className="text-sm font-semibold text-stone-800">{locale === 'ar' ? 'صور التصميم / المنتج' : 'Design / Product Images'}</label>
            </div>
            <input
              id={`${idPrefix}-design-images`}
              type="file"
              accept="image/*"
              multiple
              onChange={e => setDesignImages(Array.from(e.currentTarget.files || []))}
              className={fileInputClass.replace('bg-stone-700', 'bg-brand-500')}
            />
            {!isPage && (
              <label htmlFor={`${idPrefix}-design-images`} className="mt-0 inline-flex w-full cursor-pointer items-center justify-center rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600">
                {locale === 'ar' ? 'اختيار الصور' : 'Choose Images'}
              </label>
            )}
            <p className="mt-2 text-xs text-stone-400">
              {designImages.length
                ? `${designImages.length} ${locale === 'ar' ? 'ملف محدد' : 'selected files'}`
                : (locale === 'ar' ? 'الصورة هي المتطلب الأساسي للطلب' : 'The image is the main order requirement')}
            </p>
            {designImages.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-stone-500">
                {designImages.map(file => (
                  <li key={`${file.name}-${file.lastModified}`} className="truncate">{file.name}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl bg-stone-50 border border-stone-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Paperclip size={16} className="text-stone-500" />
              <label htmlFor={`${idPrefix}-attachments`} className="text-sm font-semibold text-stone-800">{locale === 'ar' ? 'مرفقات إضافية' : 'Additional Attachments'}</label>
            </div>
            <input
              id={`${idPrefix}-attachments`}
              type="file"
              accept=".pdf,application/pdf,image/*"
              multiple
              onChange={e => setAttachments(Array.from(e.currentTarget.files || []))}
              className={fileInputClass}
            />
            {!isPage && (
              <label htmlFor={`${idPrefix}-attachments`} className="mt-0 inline-flex w-full cursor-pointer items-center justify-center rounded-xl bg-stone-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-800">
                {locale === 'ar' ? 'اختيار PDF / ملف' : 'Choose PDF / File'}
              </label>
            )}
            <p className="mt-2 text-xs text-stone-400">
              {attachments.length
                ? `${attachments.length} ${locale === 'ar' ? 'ملف محدد' : 'selected files'}`
                : (locale === 'ar' ? 'صور، PDF، أو ملفات تنفيذ' : 'Images, PDF, or production files')}
            </p>
            {attachments.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-stone-500">
                {attachments.map(file => (
                  <li key={`${file.name}-${file.lastModified}`} className="truncate">{file.name}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className={isPage ? 'flex gap-3 pt-2' : 'sticky bottom-0 -mx-4 flex gap-3 border-t border-stone-100 bg-white px-4 pt-3 sm:-mx-5 sm:px-5'}>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium rounded-xl transition-all"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl transition-all"
          >
            {saving ? (locale === 'ar' ? 'جاري الإنشاء...' : 'Creating...') : t('create')}
          </button>
        </div>
      </div>
    </div>
  )
}
