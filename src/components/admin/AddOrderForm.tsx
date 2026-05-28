'use client'

import { useEffect, useId, useRef, useState } from 'react'
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
const draftStorageKey = 'add_order_draft_v1'
const draftDbName = 'orders_management_add_order_draft'
const draftDbVersion = 1
const draftFilesStore = 'files'

type DraftFileKind = 'designImages' | 'attachments'

type StoredDraftFile = {
  id: string
  kind: DraftFileKind
  file: File | Blob
  name: string
  type: string
  lastModified: number
  savedAt: number
}

type AddOrderDraft = {
  productType: ProductType | ''
  details: Record<string, string>
  sallaOrderNumber: string
  customerPhone: string
  notes: string
  factoryId: string
  quantity: string
  dueDate: string
}

type AttachmentDebugFile = {
  name: string
  type: string
  size: number
  accepted: boolean
  reason: string
  rejectionReason?: string
}

type AttachmentDebugState = {
  lastEvent: string
  rawFilesLength: number
  acceptedCount: number
  rejectedCount: number
  files: AttachmentDebugFile[]
  uploadPayloadAttachmentsCount: number
  uploadError: string
}

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
  const [draftRestored, setDraftRestored] = useState(false)
  const [attachmentDebug, setAttachmentDebug] = useState<AttachmentDebugState>({
    lastEvent: 'none',
    rawFilesLength: 0,
    acceptedCount: 0,
    rejectedCount: 0,
    files: [],
    uploadPayloadAttachmentsCount: 0,
    uploadError: '',
  })
  const supabase = createClient()
  const { profile } = useAuth()
  const { locale, t } = usePreferences()
  const productTypeOptions = getProductTypeOptions(locale)
  const isPage = variant === 'page'

  function logForm(message: string, data?: Record<string, unknown>) {
    if (process.env.NODE_ENV === 'development') {
      console.info(`[add-order-form] ${message}`, data || {})
    }
  }

  useEffect(() => {
    let cancelled = false

    async function restoreDraft() {
      try {
        const saved = window.sessionStorage.getItem(draftStorageKey)
        if (saved) {
          const draft = JSON.parse(saved) as Partial<AddOrderDraft>
          if (cancelled) return
          setProductType(draft.productType || '')
          setDetails(draft.details || {})
          setSallaOrderNumber(draft.sallaOrderNumber || '')
          setCustomerPhone(draft.customerPhone || '')
          setNotes(draft.notes || '')
          setFactoryId(draft.factoryId || factories[0]?.id || '')
          setQuantity(draft.quantity || '')
          setDueDate(draft.dueDate || '')
        }

        const files = await readDraftFiles()
        if (cancelled) return
        const restoredDesignImages = files.filter(item => item.kind === 'designImages').map(item => ensureFile(item.file, item.name, item.type, item.lastModified))
        const restoredAttachments = files.filter(item => item.kind === 'attachments').map(item => ensureFile(item.file, item.name, item.type, item.lastModified))
        if (restoredDesignImages.length > 0) setDesignImages(restoredDesignImages)
        if (restoredAttachments.length > 0) {
          setAttachments(restoredAttachments)
          updateAttachmentDebug('restore', restoredAttachments, restoredAttachments, [])
        }
        if (saved || files.length > 0) {
          logForm('restored add order draft', {
            hasFields: Boolean(saved),
            designImages: restoredDesignImages.length,
            attachments: restoredAttachments.length,
          })
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[add-order-form] could not restore draft', err)
        }
      } finally {
        if (!cancelled) setDraftRestored(true)
      }
    }

    restoreDraft()

    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!draftRestored) return
    persistDraft()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftRestored, productType, details, sallaOrderNumber, customerPhone, notes, factoryId, quantity, dueDate])

  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      logForm('pageshow', { persisted: event.persisted })
    }

    function handlePageHide(event: PageTransitionEvent) {
      logForm('pagehide', { persisted: event.persisted })
      persistDraft()
    }

    window.addEventListener('pageshow', handlePageShow)
    window.addEventListener('pagehide', handlePageHide)
    return () => {
      window.removeEventListener('pageshow', handlePageShow)
      window.removeEventListener('pagehide', handlePageHide)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productType, details, sallaOrderNumber, customerPhone, notes, factoryId, quantity, dueDate])

  function persistDraft() {
    const draft: AddOrderDraft = {
      productType,
      details,
      sallaOrderNumber,
      customerPhone,
      notes,
      factoryId,
      quantity,
      dueDate,
    }
    window.sessionStorage.setItem(draftStorageKey, JSON.stringify(draft))
  }

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
      setAttachmentDebug(current => ({
        ...current,
        uploadPayloadAttachmentsCount: attachments.length,
        uploadError: '',
      }))
      logForm('create clicked; upload payload prepared', {
        designImages: designImages.length,
        attachments: attachments.length,
        files: getFileDebugInfo(attachments),
      })

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
      logForm('order created successfully; calling onCreated')
      await clearDraft().catch(err => {
        if (process.env.NODE_ENV === 'development') console.warn('[add-order-form] could not clear draft after create', err)
      })
      onCreated()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setAttachmentDebug(current => ({
        ...current,
        uploadError: message,
      }))
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

  async function openDraftDb() {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = window.indexedDB.open(draftDbName, draftDbVersion)

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(draftFilesStore)) {
          db.createObjectStore(draftFilesStore, { keyPath: 'id' })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async function readDraftFiles() {
    if (!('indexedDB' in window)) return []
    const db = await openDraftDb()
    return new Promise<StoredDraftFile[]>((resolve, reject) => {
      const transaction = db.transaction(draftFilesStore, 'readonly')
      const request = transaction.objectStore(draftFilesStore).getAll()
      request.onsuccess = () => resolve(request.result as StoredDraftFile[])
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => db.close()
      transaction.onerror = () => {
        db.close()
        reject(transaction.error)
      }
    })
  }

  async function replaceDraftFiles(kind: DraftFileKind, files: File[]) {
    if (!('indexedDB' in window)) return
    const db = await openDraftDb()
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(draftFilesStore, 'readwrite')
      const store = transaction.objectStore(draftFilesStore)
      const getAllRequest = store.getAll()

      getAllRequest.onsuccess = () => {
        const existing = getAllRequest.result as StoredDraftFile[]
        existing
          .filter(item => item.kind === kind)
          .forEach(item => store.delete(item.id))

        files.forEach(file => {
          store.put({
            id: `${kind}-${file.name}-${file.size}-${file.lastModified}`,
            kind,
            file,
            name: file.name,
            type: file.type || 'application/octet-stream',
            lastModified: file.lastModified,
            savedAt: Date.now(),
          } satisfies StoredDraftFile)
        })
      }

      transaction.oncomplete = () => {
        db.close()
        resolve()
      }
      transaction.onerror = () => {
        db.close()
        reject(transaction.error)
      }
      getAllRequest.onerror = () => reject(getAllRequest.error)
    })
  }

  async function clearDraft() {
    window.sessionStorage.removeItem(draftStorageKey)
    if (!('indexedDB' in window)) return
    const db = await openDraftDb()
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(draftFilesStore, 'readwrite')
      transaction.objectStore(draftFilesStore).clear()
      transaction.oncomplete = () => {
        db.close()
        resolve()
      }
      transaction.onerror = () => {
        db.close()
        reject(transaction.error)
      }
    })
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

  function getFileDebugInfo(files: File[]) {
    return files.map(file => ({
      name: file.name,
      type: file.type || '(empty)',
      size: file.size,
      lastModified: file.lastModified,
    }))
  }

  function ensureFile(file: File | Blob, fallbackName = 'restored-attachment', fallbackType?: string, fallbackLastModified?: number): File {
    if (file instanceof File) return file
    return new File([file], fallbackName, {
      type: file.type || fallbackType || 'application/octet-stream',
      lastModified: fallbackLastModified,
    })
  }

  function getFileKey(file: File) {
    return `${file.name}-${file.size}-${file.lastModified}-${file.type || 'unknown'}`
  }

  function classifyAttachment(file: File): AttachmentDebugFile {
    const name = file.name || ''
    const lowerName = name.toLowerCase()
    const type = file.type || ''
    const isPdf = type === 'application/pdf' || lowerName.endsWith('.pdf')
    const isImage = type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|heic|heif)$/i.test(name)

    if (!name && file.size === 0) {
      return {
        name: '(no name)',
        type: type || '(empty)',
        size: file.size,
        accepted: false,
        reason: 'rejected',
        rejectionReason: 'empty file object',
      }
    }

    return {
      name: name || '(unnamed file)',
      type: type || '(empty)',
      size: file.size,
      accepted: true,
      reason: isPdf ? (type === 'application/pdf' ? 'pdf MIME type' : 'pdf filename extension') : isImage ? 'image file' : 'other attachment file',
    }
  }

  function updateAttachmentDebug(eventName: string, rawFiles: File[], accepted: File[], rejected: AttachmentDebugFile[]) {
    const acceptedDebug = accepted.map(classifyAttachment)
    setAttachmentDebug(current => ({
      ...current,
      lastEvent: eventName,
      rawFilesLength: rawFiles.length,
      acceptedCount: accepted.length,
      rejectedCount: rejected.length,
      files: [...acceptedDebug, ...rejected],
    }))
  }

  function processAttachmentSelection(eventName: 'input' | 'change', input: HTMLInputElement) {
    const rawFiles = Array.from(input.files || []).map(file => ensureFile(file))
    const classified = rawFiles.map(classifyAttachment)
    const acceptedFiles = rawFiles.filter((_, index) => classified[index].accepted)
    const rejectedFiles = classified.filter(file => !file.accepted)

    logForm(`attachment input ${eventName}`, {
      rawFilesLength: rawFiles.length,
      accepted: acceptedFiles.length,
      rejected: rejectedFiles.length,
      files: classified,
    })

    if (rawFiles.length === 0) {
      setAttachmentDebug(current => ({
        ...current,
        lastEvent: `${eventName} (empty ignored)`,
        rawFilesLength: 0,
      }))
      return
    }

    const uniqueAccepted = Array.from(
      new Map(acceptedFiles.map(file => [getFileKey(file), file])).values()
    )

    setAttachments(uniqueAccepted)
    updateAttachmentDebug(eventName, rawFiles, uniqueAccepted, rejectedFiles)
    replaceDraftFiles('attachments', uniqueAccepted).catch(err => {
      if (process.env.NODE_ENV === 'development') console.warn(`[add-order-form] could not persist attachment files from ${eventName}`, err)
    })
  }

  function handleDesignImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.currentTarget.files || [])
    logForm('image input onChange', {
      count: files.length,
      files: getFileDebugInfo(files),
    })
    setDesignImages(files)
    replaceDraftFiles('designImages', files).catch(err => {
      if (process.env.NODE_ENV === 'development') console.warn('[add-order-form] could not persist image files', err)
    })
  }

  function handleAttachmentsClick() {
    logForm('attachment input clicked')
  }

  function handleAttachmentsChange(e: React.ChangeEvent<HTMLInputElement>) {
    processAttachmentSelection('change', e.currentTarget)
  }

  function handleAttachmentsInput(e: React.FormEvent<HTMLInputElement>) {
    processAttachmentSelection('input', e.currentTarget)
  }

  async function handleCancelClick() {
    logForm('cancel clicked; calling onCancel')
    await clearDraft().catch(err => {
      if (process.env.NODE_ENV === 'development') console.warn('[add-order-form] could not clear draft on cancel', err)
    })
    onCancel()
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
        <button type="button" onClick={handleCancelClick} disabled={saving} className="text-stone-400 hover:text-stone-600 disabled:opacity-40 transition-colors p-1">
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
              onChange={handleDesignImagesChange}
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
              multiple
              onClick={handleAttachmentsClick}
              onInput={handleAttachmentsInput}
              onChange={handleAttachmentsChange}
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
                  <li key={`${file.name}-${file.lastModified}`} className="truncate">
                    {file.name} · {file.type || 'unknown'} · {Math.ceil(file.size / 1024)} KB
                  </li>
                ))}
              </ul>
            )}
            {isPage && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="font-semibold">{locale === 'ar' ? 'تشخيص المرفقات المؤقت' : 'Temporary attachment debug'}</p>
                <div className="mt-2 grid gap-1">
                  <p>{locale === 'ar' ? 'آخر حدث' : 'Last event'}: {attachmentDebug.lastEvent}</p>
                  <p>{locale === 'ar' ? 'عدد الملفات من المتصفح' : 'Browser files length'}: {attachmentDebug.rawFilesLength}</p>
                  <p>{locale === 'ar' ? 'المقبولة' : 'Accepted'}: {attachmentDebug.acceptedCount}</p>
                  <p>{locale === 'ar' ? 'المرفوضة' : 'Rejected'}: {attachmentDebug.rejectedCount}</p>
                  <p>{locale === 'ar' ? 'عدد المرفقات عند الحفظ' : 'Upload payload attachments'}: {attachmentDebug.uploadPayloadAttachmentsCount}</p>
                  {attachmentDebug.uploadError && (
                    <p className="text-red-700">{locale === 'ar' ? 'خطأ الرفع' : 'Upload error'}: {attachmentDebug.uploadError}</p>
                  )}
                </div>
                {attachmentDebug.files.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {attachmentDebug.files.map((file, index) => (
                      <li key={`${file.name}-${file.size}-${index}`} className={file.accepted ? 'text-amber-900' : 'text-red-700'}>
                        {file.accepted ? '✓' : '×'} {file.name} · {file.type} · {Math.ceil(file.size / 1024)} KB · {file.reason}
                        {file.rejectionReason ? ` · ${file.rejectionReason}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={isPage ? 'flex gap-3 pt-2' : 'sticky bottom-0 -mx-4 flex gap-3 border-t border-stone-100 bg-white px-4 pt-3 sm:-mx-5 sm:px-5'}>
          <button
            type="button"
            onClick={handleCancelClick}
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
