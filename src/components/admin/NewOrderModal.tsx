'use client'

import { useState } from 'react'
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

interface Props {
  factories: Factory[]
  onClose: () => void
  onCreated: () => void
}

export function NewOrderModal({ factories, onClose, onCreated }: Props) {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!productType || !factoryId) {
      toast.error(locale === 'ar' ? 'يرجى اختيار نوع المنتج واختيار المصنع' : 'Please select a product type and factory')
      return
    }
    setSaving(true)
    try {
      const orderDetails = Object.fromEntries(
        Object.entries(details)
          .map(([key, value]) => [key, value.trim()])
          .filter(([, value]) => value)
      )
      const internalOrderNumber = generateOrderNumber()
      const { data: order, error } = await supabase.from('orders').insert({
        id: crypto.randomUUID(),
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
      }).select('id').single()
      if (error) throw error

      const files = [
        ...designImages.map(file => ({ file, isDesignImage: true })),
        ...attachments.map(file => ({ file, isDesignImage: false })),
      ]

      if (files.length > 0 && order?.id) {
        const uploaded = await Promise.all(files.map(async ({ file, isDesignImage }) => {
          const safeName = file.name.replace(/[^\w.\-]+/g, '-')
          const storagePath = `${order.id}/${crypto.randomUUID()}-${safeName}`
          const { error: uploadError } = await supabase.storage
            .from('order-attachments')
            .upload(storagePath, file)
          if (uploadError) throw uploadError

          const { data: publicUrlData } = supabase.storage
            .from('order-attachments')
            .getPublicUrl(storagePath)

          return {
            file,
            isDesignImage,
            storagePath,
            publicUrl: publicUrlData.publicUrl,
          }
        }))

        const attachmentRows = uploaded.map(item => ({
          id: crypto.randomUUID(),
          order_id: order.id,
          file_url: item.publicUrl,
          file_name: item.file.name,
          attachment_type: item.file.type || 'application/octet-stream',
          storage_path: item.storagePath,
          notes: item.isDesignImage ? 'Design image' : null,
        }))
        const { error: attachmentError } = await supabase.from('attachments').insert(attachmentRows)
        if (attachmentError) throw attachmentError

        const imageRows = uploaded
          .filter(item => item.isDesignImage || isImageAttachment({ file_name: item.file.name, attachment_type: item.file.type || 'application/octet-stream' }))
          .map(item => ({
            order_id: order.id,
            url: item.publicUrl,
            caption: item.isDesignImage ? 'Design image' : item.file.name,
          }))

        if (imageRows.length > 0) {
          const { error: imageError } = await supabase.from('order_images').insert(imageRows)
          if (imageError) throw imageError
        }
      }

      toast.success(locale === 'ar' ? 'تم إنشاء الطلب بنجاح' : 'Order created successfully')
      onCreated()
    } catch (err) {
      console.error('Create order error:', err)
      toast.error(locale === 'ar' ? 'حدث خطأ أثناء الإنشاء' : 'Could not create order')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[calc(100vh-2rem)] shadow-2xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
              <Package size={18} className="text-white" />
            </div>
            <h2 className="font-bold text-stone-900">{t('newOrder')}</h2>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[calc(100vh-6.5rem)]">
          {/* Product type */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">{t('productType')} *</label>
            <select
              value={productType}
              onChange={e => {
                setProductType(e.target.value as ProductType | '')
                setDetails({})
              }}
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm
                focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent appearance-none"
            >
              <option value="">{locale === 'ar' ? 'اختر نوع المنتج' : 'Select product type'}</option>
              {productTypeOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* Admin-only Salla info */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">{t('sallaOrderNumber')}</label>
              <input
                type="text"
                value={sallaOrderNumber}
                onChange={e => setSallaOrderNumber(e.target.value)}
                placeholder={locale === 'ar' ? 'مثال: 123456789' : 'Example: 123456789'}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
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
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                dir="ltr"
              />
            </div>
          </div>

          {/* Product-specific fields */}
          {productType && (
            <div className="rounded-2xl bg-brand-50/40 border border-brand-100 p-4">
              <p className="text-sm font-semibold text-stone-800 mb-3">{t('details')} {getProductTypeLabel(productType, null, locale)}</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {PRODUCT_DETAIL_FIELDS_BY_LOCALE[locale][productType].map(field => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">{field.label}</label>
                    {field.type === 'select' ? (
                      <select
                        value={details[field.key] || ''}
                        onChange={e => setDetails(current => ({ ...current, [field.key]: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm
                          focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent appearance-none"
                      >
                        <option value="">{locale === 'ar' ? 'اختر' : 'Select'}</option>
                        {field.options?.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={details[field.key] || ''}
                        onChange={e => setDetails(current => ({ ...current, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm
                          focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            {/* Factory */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">{t('factory')} *</label>
              <select
                value={factoryId}
                onChange={e => setFactoryId(e.target.value)}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent appearance-none"
              >
                {factories.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">{t('quantity')}</label>
              <input
                type="number"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="0"
                min="1"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
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
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                dir="ltr"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">{t('notes')}</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder={locale === 'ar' ? 'أي تعليمات مهمة للمصنع...' : 'Any important instructions for the factory...'}
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm resize-none
                focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
            />
          </div>

          {/* Uploads */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-2xl bg-stone-50 border border-stone-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon size={16} className="text-stone-500" />
                <label className="text-sm font-semibold text-stone-800">{locale === 'ar' ? 'صور التصميم / المنتج' : 'Design / Product Images'}</label>
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={e => setDesignImages(Array.from(e.target.files || []))}
                className="block w-full text-sm text-stone-500 file:ml-3 file:border-0 file:rounded-lg file:bg-brand-500 file:text-white file:px-3 file:py-2 file:text-sm"
              />
              <p className="mt-2 text-xs text-stone-400">
                {designImages.length
                  ? `${designImages.length} ${locale === 'ar' ? 'ملف محدد' : 'selected files'}`
                  : (locale === 'ar' ? 'الصورة هي المتطلب الأساسي للطلب' : 'The image is the main order requirement')}
              </p>
            </div>

            <div className="rounded-2xl bg-stone-50 border border-stone-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Paperclip size={16} className="text-stone-500" />
                <label className="text-sm font-semibold text-stone-800">{locale === 'ar' ? 'مرفقات إضافية' : 'Additional Attachments'}</label>
              </div>
              <input
                type="file"
                multiple
                onChange={e => setAttachments(Array.from(e.target.files || []))}
                className="block w-full text-sm text-stone-500 file:ml-3 file:border-0 file:rounded-lg file:bg-stone-700 file:text-white file:px-3 file:py-2 file:text-sm"
              />
              <p className="mt-2 text-xs text-stone-400">
                {attachments.length
                  ? `${attachments.length} ${locale === 'ar' ? 'ملف محدد' : 'selected files'}`
                  : (locale === 'ar' ? 'صور، PDF، أو ملفات تنفيذ' : 'Images, PDF, or production files')}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium rounded-xl transition-all"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300
                text-white text-sm font-semibold rounded-xl transition-all"
            >
              {saving ? (locale === 'ar' ? 'جاري الإنشاء...' : 'Creating...') : t('create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
