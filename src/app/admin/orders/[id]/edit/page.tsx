'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ArrowRight, FileDown, Image as ImageIcon, Package, Paperclip, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Attachment, ExecutionType, Factory, Order, OrderStatus, ProductType } from '@/types'
import {
  getExecutionTypeOptions,
  getOrderStatusOptions,
  getProductTypeLabel,
  getProductTypeOptions,
  isImageAttachment,
  PRODUCT_DETAIL_FIELDS_BY_LOCALE,
} from '@/lib/orders'
import { normalizeOptionalUrl } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { usePreferences } from '@/lib/i18n'

type PendingUpload = {
  file: File
  isDesignImage: boolean
}

type UploadedOrderFile = PendingUpload & {
  storagePath: string
  publicUrl: string
}

type AttachmentInputStrategy = 'pdfOnly' | 'allFiles' | 'multipleFiles'

const customDetailSuffix = '__custom'

const attachmentInputStrategies: Array<{ key: AttachmentInputStrategy; labelAr: string; labelEn: string }> = [
  { key: 'pdfOnly', labelAr: 'اختيار PDF من الملفات', labelEn: 'Choose PDF from files' },
  { key: 'allFiles', labelAr: 'اختيار ملف بدون فلترة', labelEn: 'Choose file without filter' },
  { key: 'multipleFiles', labelAr: 'اختيار عدة مرفقات', labelEn: 'Choose multiple attachments' },
]

export default function AdminOrderEditPage() {
  const { id } = useParams()
  const orderId = Array.isArray(id) ? id[0] : id
  const router = useRouter()
  const idPrefix = useId()
  const saveInFlightRef = useRef(false)
  const newImagesRef = useRef<File[]>([])
  const newAttachmentsRef = useRef<File[]>([])
  const supabase = createClient()
  const { profile, loading: authLoading } = useAuth()
  const { locale, t } = usePreferences()
  const productTypeOptions = getProductTypeOptions(locale)
  const executionTypeOptions = getExecutionTypeOptions(locale)
  const statusOptions = getOrderStatusOptions(locale)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [factories, setFactories] = useState<Factory[]>([])
  const [order, setOrder] = useState<Order | null>(null)
  const [productType, setProductType] = useState<ProductType | ''>('')
  const [executionType, setExecutionType] = useState<ExecutionType | ''>('')
  const [designUrl, setDesignUrl] = useState('')
  const [details, setDetails] = useState<Record<string, string>>({})
  const [factoryId, setFactoryId] = useState('')
  const [status, setStatus] = useState<OrderStatus>('pending')
  const [isUrgent, setIsUrgent] = useState(false)
  const [sallaOrderNumber, setSallaOrderNumber] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [quantity, setQuantity] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [orderDate, setOrderDate] = useState('')
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([])
  const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<string[]>([])
  const [newImages, setNewImages] = useState<File[]>([])
  const [newAttachments, setNewAttachments] = useState<File[]>([])
  const [fileReadMessage, setFileReadMessage] = useState('')

  useEffect(() => {
    async function load() {
      if (!orderId || authLoading) return
      if (profile?.role !== 'Admin') {
        setLoading(false)
        return
      }

      const [{ data: orderData }, { data: factoryData }] = await Promise.all([
        supabase
          .from('orders')
          .select('*, factory:factories(*), images:order_images(*), attachments(*)')
          .eq('id', orderId)
          .single(),
        supabase.from('factories').select('*').order('name'),
      ])

      if (orderData) {
        const loadedOrder = orderData as Order
        setOrder(loadedOrder)
        setProductType(loadedOrder.product_type || '')
        setExecutionType(loadedOrder.execution_type || '')
        setDesignUrl(loadedOrder.design_url || '')
        setDetails(normalizeDetails(loadedOrder.product_type || '', loadedOrder.details))
        setFactoryId(loadedOrder.assigned_factory_id || '')
        setStatus(loadedOrder.status)
        setIsUrgent(Boolean(loadedOrder.is_urgent))
        setSallaOrderNumber(loadedOrder.salla_order_number || '')
        setCustomerPhone(loadedOrder.customer_phone || '')
        setNotes(loadedOrder.general_notes || '')
        setQuantity(loadedOrder.quantity ? String(loadedOrder.quantity) : '')
        setDueDate(loadedOrder.due_date || '')
        setOrderDate(loadedOrder.order_date || '')
        setExistingAttachments(loadedOrder.attachments || [])
      }
      setFactories(factoryData || [])
      setLoading(false)
    }

    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, authLoading, profile?.role])

  function normalizeDetails(nextProductType: ProductType | '', rawDetails: Record<string, unknown> | null | undefined) {
    if (!nextProductType || !rawDetails) return {}
    const fields = PRODUCT_DETAIL_FIELDS_BY_LOCALE[locale][nextProductType] || []
    const next: Record<string, string> = {}

    Object.entries(rawDetails).forEach(([key, value]) => {
      if (value === null || value === undefined || String(value).trim() === '') return
      const stringValue = String(value)
      const field = fields.find(item => item.key === key)
      const shouldUseCustom = field?.type === 'select' && field.customOption && !(field.options || []).includes(stringValue)
      if (shouldUseCustom && field?.customOption) {
        next[key] = field.customOption
        next[`${key}${customDetailSuffix}`] = stringValue
      } else {
        next[key] = stringValue
      }
    })

    return next
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

  function changeProductType(nextProductType: ProductType | '') {
    if (nextProductType !== productType && Object.values(details).some(Boolean)) {
      if (!window.confirm(t('productChangeConfirm'))) return
    }
    setProductType(nextProductType)
    setDetails(nextProductType === order?.product_type ? normalizeDetails(nextProductType, order.details) : {})
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

  function getDetailField(key: string) {
    if (!productType) return undefined
    return PRODUCT_DETAIL_FIELDS_BY_LOCALE[locale][productType].find(field => field.key === key)
  }

  function isDetailFieldVisible(key: string) {
    const field = getDetailField(key)
    if (!field?.showWhen) return true
    return field.showWhen.values.includes(details[field.showWhen.key])
  }

  function getFileKey(file: File) {
    return `${file.name}-${file.size}-${file.lastModified}-${file.type || 'unknown'}`
  }

  function mergeFiles(existing: File[], incoming: File[]) {
    return Array.from(new Map([...existing, ...incoming].map(file => [getFileKey(file), file])).values())
  }

  function handleNewImagesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files || [])
    if (files.length === 0) return
    const next = mergeFiles(newImagesRef.current, files)
    newImagesRef.current = next
    setNewImages(next)
  }

  function handleAttachmentInput(strategy: AttachmentInputStrategy, eventName: 'input' | 'change', input: HTMLInputElement) {
    const files = Array.from(input.files || [])
    if (process.env.NODE_ENV === 'development') {
      console.info('[edit-order-attachments]', {
        strategy,
        eventName,
        count: files.length,
        files: files.map(file => ({ name: file.name, type: file.type || '(empty)', size: file.size })),
      })
    }

    if (files.length === 0) {
      setFileReadMessage(locale === 'ar'
        ? 'لم يتمكن المتصفح من قراءة الملف، يرجى تجربة خيار اختيار ملف بدون فلترة أو استخدام مدير الملفات'
        : 'The browser could not read the file. Try choosing a file without filter or use the file manager.')
      return
    }

    setFileReadMessage('')
    const validFiles = files.filter(file => file.name || file.size > 0)
    const next = mergeFiles(newAttachmentsRef.current, validFiles)
    newAttachmentsRef.current = next
    setNewAttachments(next)
  }

  function markAttachmentForDelete(attachment: Attachment) {
    setDeletedAttachmentIds(current =>
      current.includes(attachment.id)
        ? current.filter(id => id !== attachment.id)
        : [...current, attachment.id]
    )
  }

  async function uploadOrderFiles(files: PendingUpload[]) {
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

        uploaded.push({ ...item, storagePath, publicUrl: publicUrlData.publicUrl })
      }
    } catch (err) {
      await removeUploadedFiles(uploaded)
      throw err
    }

    return uploaded
  }

  async function removeUploadedFiles(uploaded: UploadedOrderFile[]) {
    const paths = uploaded.map(item => item.storagePath)
    if (paths.length === 0) return
    const { error } = await supabase.storage.from('order-attachments').remove(paths)
    if (error && process.env.NODE_ENV === 'development') {
      console.warn('Could not remove uploaded edit files after failure.', error)
    }
  }

  async function deleteMarkedAttachments() {
    const deleted = existingAttachments.filter(attachment => deletedAttachmentIds.includes(attachment.id))
    if (deleted.length === 0) return

    const imageUrls = deleted.filter(isImageAttachment).map(attachment => attachment.file_url)
    if (imageUrls.length > 0) {
      await supabase.from('order_images').delete().in('url', imageUrls)
    }

    const { error } = await supabase.from('attachments').delete().in('id', deleted.map(attachment => attachment.id))
    if (error) throw error

    const storagePaths = deleted.map(attachment => attachment.storage_path).filter(Boolean) as string[]
    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage.from('order-attachments').remove(storagePaths)
      if (storageError && process.env.NODE_ENV === 'development') {
        console.warn('Attachment database rows were deleted, but some storage files could not be removed.', storageError)
      }
    }
  }

  async function saveOrder() {
    if (!order || !productType || saveInFlightRef.current || saving) return
    saveInFlightRef.current = true
    setSaving(true)
    let uploadedFiles: UploadedOrderFile[] = []

    try {
      let normalizedDesignUrl = ''
      try {
        normalizedDesignUrl = normalizeOptionalUrl(designUrl)
      } catch {
        toast.error(t('invalidDesignLink'))
        return
      }

      const { error: orderError } = await supabase
        .from('orders')
        .update({
          product_type: productType,
          execution_type: executionType || null,
          design_url: normalizedDesignUrl || null,
          details: buildOrderDetails(),
          assigned_factory_id: factoryId || null,
          status,
          is_urgent: isUrgent,
          salla_order_number: sallaOrderNumber.trim() || null,
          customer_phone: customerPhone.trim() || null,
          general_notes: notes.trim() || null,
          quantity: quantity ? parseInt(quantity) : null,
          due_date: dueDate || null,
          order_date: orderDate || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      if (orderError) throw orderError

      const files: PendingUpload[] = [
        ...newImagesRef.current.map(file => ({ file, isDesignImage: true })),
        ...newAttachmentsRef.current.map(file => ({ file, isDesignImage: false })),
      ]
      uploadedFiles = await uploadOrderFiles(files)

      if (uploadedFiles.length > 0) {
        const attachmentRows = uploadedFiles.map(item => ({
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

        const imageRows = uploadedFiles
          .filter(item => item.isDesignImage || isImageAttachment({ file_name: item.file.name, attachment_type: item.file.type || 'application/octet-stream' }))
          .map(item => ({
            order_id: order.id,
            url: item.publicUrl,
            caption: item.isDesignImage ? 'Design image' : item.file.name,
          }))

        if (imageRows.length > 0) {
          const { error: imageError } = await supabase.from('order_images').insert(imageRows)
          if (imageError && process.env.NODE_ENV === 'development') {
            console.warn('Order thumbnail rows were not created during edit, but attachments were saved.', imageError)
          }
        }
      }

      await deleteMarkedAttachments()
      toast.success(t('orderUpdated'))
      router.push(`/admin/orders/${order.id}`)
    } catch (err) {
      await removeUploadedFiles(uploadedFiles)
      if (process.env.NODE_ENV === 'development') console.error('Edit order error:', err)
      toast.error(t('orderUpdateFailed'))
    } finally {
      setSaving(false)
      saveInFlightRef.current = false
    }
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 skeleton rounded-xl" />
        <div className="h-96 skeleton rounded-2xl" />
      </div>
    )
  }

  if (profile?.role !== 'Admin') {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-stone-500">
        {t('unauthorized')}
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="text-stone-500">{locale === 'ar' ? 'الطلب غير موجود' : 'Order not found'}</p>
        <Link href="/admin/orders" className="text-brand-600 text-sm mt-2 inline-block">{t('orders')}</Link>
      </div>
    )
  }

  const visibleAttachments = existingAttachments.filter(attachment => !deletedAttachmentIds.includes(attachment.id))
  const deletedAttachments = existingAttachments.filter(attachment => deletedAttachmentIds.includes(attachment.id))
  const fileInputClass = 'block w-full text-sm text-stone-500 file:ml-3 file:border-0 file:rounded-lg file:bg-stone-700 file:text-white file:px-3 file:py-2 file:text-sm'

  return (
    <div className="mx-auto max-w-4xl space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/admin/orders/${order.id}`} className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors">
          <ArrowRight size={16} />
          {t('orders')}
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push(`/admin/orders/${order.id}`)}
            disabled={saving}
            className="rounded-xl bg-stone-100 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-200 disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={saveOrder}
            disabled={saving}
            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:bg-brand-300"
          >
            {saving ? t('saving') : t('saveOrderChanges')}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200/60 bg-white shadow-sm">
        <div className="border-b border-stone-100 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500">
              <Package size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-stone-900">{t('editOrder')}</h1>
              <p className="font-mono text-xs text-stone-400">{order.order_number}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">{t('productType')} *</label>
              <select
                value={productType}
                onChange={event => changeProductType(event.target.value as ProductType | '')}
                className="w-full appearance-none rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                <option value="">{locale === 'ar' ? 'اختر نوع المنتج' : 'Select product type'}</option>
                {productTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">{t('internalOrderNumber')}</label>
              <input
                type="text"
                value={order.order_number}
                readOnly
                className="w-full rounded-xl border border-stone-200 bg-stone-100 px-4 py-2.5 text-sm text-stone-500"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">{t('executionType')}</label>
            <select
              value={executionType}
              onChange={event => setExecutionType(event.target.value as ExecutionType | '')}
              className="w-full appearance-none rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <option value="">{locale === 'ar' ? 'غير محدد' : 'Not specified'}</option>
              {executionTypeOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">{t('designLink')}</label>
            <input
              type="url"
              value={designUrl}
              onChange={event => setDesignUrl(event.target.value)}
              placeholder={locale === 'ar' ? 'مثال: www.example.com/design' : 'Example: www.example.com/design'}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-400"
              dir="ltr"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">{t('sallaOrderNumber')}</label>
              <input
                type="text"
                value={sallaOrderNumber}
                onChange={event => setSallaOrderNumber(event.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-400"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">{t('customerPhone')}</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={event => setCustomerPhone(event.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-400"
                dir="ltr"
              />
            </div>
          </div>

          {productType && (
            <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
              <p className="mb-3 text-sm font-semibold text-stone-800">{t('details')} {getProductTypeLabel(productType, null, locale)}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {PRODUCT_DETAIL_FIELDS_BY_LOCALE[locale][productType].filter(field => isDetailFieldVisible(field.key)).map(field => {
                  const selectedValue = details[field.key] || ''
                  const customKey = `${field.key}${customDetailSuffix}`
                  const isCustom = Boolean(field.customOption && selectedValue === field.customOption)

                  return (
                    <div key={field.key}>
                      <label className="mb-1.5 block text-sm font-medium text-stone-700">{field.label}</label>
                      {field.type === 'select' ? (
                        <div className="space-y-2">
                          <select
                            value={selectedValue}
                            onChange={event => updateDetail(field.key, event.target.value)}
                            className="w-full appearance-none rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-400"
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
                              onChange={event => setDetails(current => ({ ...current, [customKey]: event.target.value }))}
                              placeholder={field.customPlaceholder || (locale === 'ar' ? 'اكتب القيمة' : 'Type value')}
                              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-400"
                            />
                          )}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={details[field.key] || ''}
                          onChange={event => updateDetail(field.key, event.target.value)}
                          placeholder={field.placeholder}
                          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-400"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">{t('factory')}</label>
              <select
                value={factoryId}
                onChange={event => setFactoryId(event.target.value)}
                className="w-full appearance-none rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                <option value="">{t('unassigned')}</option>
                {factories.map(factory => (
                  <option key={factory.id} value={factory.id}>{factory.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">{t('status')}</label>
              <select
                value={status}
                onChange={event => setStatus(event.target.value as OrderStatus)}
                className="w-full appearance-none rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">{t('quantity')}</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={event => setQuantity(event.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-400"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">{t('dueDate')}</label>
              <input
                type="date"
                value={dueDate}
                onChange={event => setDueDate(event.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-400"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">{t('orderDate')}</label>
              <input
                type="date"
                value={orderDate}
                onChange={event => setOrderDate(event.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-400"
                dir="ltr"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50/70 px-4 py-3 text-sm font-semibold text-red-700">
            <input
              type="checkbox"
              checked={isUrgent}
              onChange={event => setIsUrgent(event.target.checked)}
              className="h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-400"
            />
            {t('urgentOrder')}
          </label>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">{t('notes')}</label>
            <textarea
              value={notes}
              onChange={event => setNotes(event.target.value)}
              rows={4}
              className="w-full resize-none rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <FileDown size={17} className="text-stone-400" />
          <h2 className="font-bold text-stone-900">{t('currentAttachments')}</h2>
        </div>

        {visibleAttachments.length === 0 && deletedAttachments.length === 0 ? (
          <p className="text-sm text-stone-400">{t('noAttachments')}</p>
        ) : (
          <div className="space-y-3">
            {[...visibleAttachments, ...deletedAttachments].map(attachment => {
              const isDeleted = deletedAttachmentIds.includes(attachment.id)
              return (
                <div
                  key={attachment.id}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
                    isDeleted ? 'border-red-200 bg-red-50/60' : 'border-stone-200 bg-stone-50'
                  }`}
                >
                  <a
                    href={attachment.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex flex-1 items-center gap-2 text-sm text-stone-700 hover:text-brand-600"
                  >
                    {isImageAttachment(attachment) ? <ImageIcon size={15} /> : <Paperclip size={15} />}
                    <span className="truncate">{attachment.file_name}</span>
                  </a>
                  {isDeleted && <span className="text-xs font-medium text-red-600">{t('attachmentWillBeDeleted')}</span>}
                  <button
                    type="button"
                    onClick={() => markAttachmentForDelete(attachment)}
                    disabled={saving}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-100 disabled:opacity-40"
                    title={t('deleteAttachment')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <ImageIcon size={16} className="text-stone-500" />
            <label htmlFor={`${idPrefix}-new-images`} className="text-sm font-semibold text-stone-800">
              {locale === 'ar' ? 'إضافة صور جديدة' : 'Add new images'}
            </label>
          </div>
          <input
            id={`${idPrefix}-new-images`}
            type="file"
            accept="image/*"
            multiple
            onChange={handleNewImagesChange}
            className={fileInputClass.replace('bg-stone-700', 'bg-brand-500')}
          />
          {newImages.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-stone-500">
              {newImages.map(file => (
                <li key={getFileKey(file)} className="truncate">{file.name}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Paperclip size={16} className="text-stone-500" />
            <p className="text-sm font-semibold text-stone-800">{t('addAttachments')}</p>
          </div>
          <div className="space-y-3">
            {attachmentInputStrategies.map(strategy => (
              <div key={strategy.key} className="rounded-xl border border-stone-200 bg-white p-3">
                <label htmlFor={`${idPrefix}-edit-attachments-${strategy.key}`} className="mb-2 block text-sm font-medium text-stone-700">
                  {locale === 'ar' ? strategy.labelAr : strategy.labelEn}
                </label>
                <input
                  id={`${idPrefix}-edit-attachments-${strategy.key}`}
                  type="file"
                  accept={strategy.key === 'pdfOnly' ? 'application/pdf,.pdf' : undefined}
                  multiple={strategy.key === 'multipleFiles'}
                  onInput={event => handleAttachmentInput(strategy.key, 'input', event.currentTarget)}
                  onChange={event => handleAttachmentInput(strategy.key, 'change', event.currentTarget)}
                  className={fileInputClass}
                />
              </div>
            ))}
          </div>
          {fileReadMessage && <p className="mt-2 text-xs font-medium text-red-600">{fileReadMessage}</p>}
          {newAttachments.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-stone-500">
              {newAttachments.map(file => (
                <li key={getFileKey(file)} className="truncate">
                  {file.name} · {file.type || 'unknown'} · {Math.ceil(file.size / 1024)} KB
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.push(`/admin/orders/${order.id}`)}
          disabled={saving}
          className="flex-1 rounded-xl bg-stone-100 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-200 disabled:opacity-50"
        >
          {t('cancel')}
        </button>
        <button
          type="button"
          onClick={saveOrder}
          disabled={saving}
          className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:bg-brand-300"
        >
          {saving ? t('saving') : t('saveOrderChanges')}
        </button>
      </div>
    </div>
  )
}
