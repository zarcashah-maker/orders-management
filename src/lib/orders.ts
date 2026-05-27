import { Attachment, Order, OrderStatus, ProductType } from '@/types'
import type { Locale } from '@/lib/i18n'

export const PRODUCT_TYPE_LABELS: Record<Locale, Record<ProductType, string>> = {
  ar: {
    graduation_cap: 'قبعة تخرج',
    graduation_sash: 'وشاح تخرج',
    graduation_gown: 'روب تخرج',
    graduation_jacket: 'جاكيت تخرج',
    hoodie: 'هودي',
    tshirt: 'تيشيرت',
    other: 'منتج آخر',
  },
  en: {
    graduation_cap: 'Graduation Cap',
    graduation_sash: 'Graduation Sash',
    graduation_gown: 'Graduation Gown',
    graduation_jacket: 'Graduation Jacket',
    hoodie: 'Hoodie',
    tshirt: 'T-shirt',
    other: 'Other Product',
  },
}

export const ORDER_STATUS_LABELS_BY_LOCALE: Record<Locale, Record<OrderStatus, string>> = {
  ar: {
    pending: 'قيد الانتظار',
    sewing: 'الخياطة',
    in_progress: 'جاري التنفيذ',
    rework: 'مرتجع / إعادة عمل',
    review: 'تحت المراجعة',
    completed: 'مكتمل',
    cancelled: 'ملغي',
  },
  en: {
    pending: 'Pending',
    sewing: 'Sewing',
    in_progress: 'In Progress',
    rework: 'Returned / Rework',
    review: 'Review',
    completed: 'Completed',
    cancelled: 'Cancelled',
  },
}

export type ProductDetailField = {
  key: string
  label: string
  placeholder?: string
  type?: 'text' | 'select'
  options?: string[]
}

export const PRODUCT_DETAIL_FIELDS_BY_LOCALE: Record<Locale, Record<ProductType, ProductDetailField[]>> = {
  ar: {
    graduation_cap: [
    { key: 'cap_color', label: 'لون القبعة', placeholder: 'مثال: أسود' },
    { key: 'cap_size', label: 'مقاس القبعة', placeholder: 'مثال: قياسي' },
    { key: 'tassel_color', label: 'لون الدندوش', placeholder: 'مثال: ذهبي' },
    ],
    graduation_sash: [
    { key: 'fabric_color', label: 'لون القماش' },
    { key: 'fabric_type', label: 'نوع القماش' },
    { key: 'embroidery_font', label: 'خط التطريز' },
    { key: 'cord', label: 'الحبل', type: 'select', options: ['مع حبل', 'بدون حبل'] },
    { key: 'cord_color', label: 'لون الحبل' },
    { key: 'sash_cut', label: 'قصة الوشاح' },
    { key: 'sash_size', label: 'مقاس الوشاح' },
    ],
    graduation_gown: [
    { key: 'gown_color', label: 'لون الروب' },
    { key: 'gown_length', label: 'طول الروب' },
    { key: 'size', label: 'المقاس' },
    { key: 'gown_cut', label: 'قصة الروب' },
    { key: 'sleeve_style', label: 'شكل الكم' },
    ],
    graduation_jacket: [
    { key: 'size', label: 'المقاس' },
    {
      key: 'sleeve_color',
      label: 'لون الأكمام',
      type: 'select',
      options: ['أسود', 'رمادي', 'كحلي', 'أبيض', 'أصفر', 'أحمر', 'وردي'],
    },
    { key: 'rib_color', label: 'لون الريب' },
    { key: 'jacket_color', label: 'لون الجاكيت' },
    ],
    tshirt: [
    { key: 'size', label: 'المقاس' },
    { key: 'tshirt_color', label: 'لون التيشيرت' },
    ],
    hoodie: [
    { key: 'size', label: 'المقاس' },
    { key: 'hoodie_color', label: 'لون الهودي' },
    ],
    other: [
    { key: 'product_details', label: 'تفاصيل المنتج', placeholder: 'اكتب التفاصيل المطلوبة' },
    ],
  },
  en: {
    graduation_cap: [
      { key: 'cap_color', label: 'Cap color', placeholder: 'Example: Black' },
      { key: 'cap_size', label: 'Cap size', placeholder: 'Example: Standard' },
      { key: 'tassel_color', label: 'Tassel color', placeholder: 'Example: Gold' },
    ],
    graduation_sash: [
      { key: 'fabric_color', label: 'Fabric color' },
      { key: 'fabric_type', label: 'Fabric type' },
      { key: 'embroidery_font', label: 'Embroidery font' },
      { key: 'cord', label: 'Cord', type: 'select', options: ['With cord', 'Without cord'] },
      { key: 'cord_color', label: 'Cord color' },
      { key: 'sash_cut', label: 'Sash cut/style' },
      { key: 'sash_size', label: 'Sash size' },
    ],
    graduation_gown: [
      { key: 'gown_color', label: 'Gown color' },
      { key: 'gown_length', label: 'Gown length' },
      { key: 'size', label: 'Size' },
      { key: 'gown_cut', label: 'Gown style/cut' },
      { key: 'sleeve_style', label: 'Sleeve style' },
    ],
    graduation_jacket: [
      { key: 'size', label: 'Size' },
      {
        key: 'sleeve_color',
        label: 'Sleeve color',
        type: 'select',
        options: ['Black', 'Gray', 'Navy', 'White', 'Yellow', 'Red', 'Pink'],
      },
      { key: 'rib_color', label: 'Rib color' },
      { key: 'jacket_color', label: 'Jacket color' },
    ],
    tshirt: [
      { key: 'size', label: 'Size' },
      { key: 'tshirt_color', label: 'T-shirt color' },
    ],
    hoodie: [
      { key: 'size', label: 'Size' },
      { key: 'hoodie_color', label: 'Hoodie color' },
    ],
    other: [
      { key: 'product_details', label: 'Product details', placeholder: 'Write the required details' },
    ],
  },
}

export const PRODUCT_DETAIL_FIELDS = PRODUCT_DETAIL_FIELDS_BY_LOCALE.ar

export function getProductTypeOptions(locale: Locale = 'ar') {
  return (Object.keys(PRODUCT_TYPE_LABELS[locale]) as ProductType[]).map(value => ({
  value,
    label: PRODUCT_TYPE_LABELS[locale][value],
  }))
}

export const PRODUCT_TYPE_OPTIONS = getProductTypeOptions('ar')

export function getOrderStatusOptions(locale: Locale = 'ar') {
  return (Object.keys(ORDER_STATUS_LABELS_BY_LOCALE[locale]) as OrderStatus[]).map(value => ({
    value,
    label: ORDER_STATUS_LABELS_BY_LOCALE[locale][value],
  }))
}

export const ORDER_STATUS_OPTIONS = getOrderStatusOptions('ar')

export function getProductTypeLabel(productType: ProductType | null | undefined, fallback?: string | null, locale: Locale = 'ar') {
  if (productType && PRODUCT_TYPE_LABELS[locale][productType]) return PRODUCT_TYPE_LABELS[locale][productType]
  return fallback || (locale === 'ar' ? 'غير محدد' : 'Not set')
}

export function getOrderStatusLabel(status: OrderStatus, locale: Locale = 'ar') {
  return ORDER_STATUS_LABELS_BY_LOCALE[locale][status] || status
}

export function getOrderThumbnail(order: Pick<Order, 'images' | 'attachments'>) {
  const image = order.images?.[0]?.url
  if (image) return image

  return order.attachments?.find(attachment =>
    attachment.attachment_type?.startsWith('image/') ||
    /\.(png|jpe?g|webp|gif|svg)$/i.test(attachment.file_name)
  )?.file_url || null
}

export function isImageAttachment(attachment: Pick<Attachment, 'attachment_type' | 'file_name'>) {
  return Boolean(
    attachment.attachment_type?.startsWith('image/') ||
    /\.(png|jpe?g|webp|gif|svg)$/i.test(attachment.file_name)
  )
}

export function getDetailEntries(productType: ProductType | null | undefined, details: Record<string, unknown> | null | undefined, locale: Locale = 'ar') {
  if (!details) return []
  const fields = productType ? PRODUCT_DETAIL_FIELDS_BY_LOCALE[locale][productType] : []
  const labels = new Map(fields.map(field => [field.key, field.label]))

  return Object.entries(details)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
    .map(([key, value]) => ({
      key,
      label: labels.get(key) || key.replace(/_/g, ' '),
      value: String(value),
    }))
}

export function getFactoryOrderType(productType: ProductType | null | undefined, fallback?: string | null, locale: Locale = 'ar') {
  return getProductTypeLabel(productType, fallback, locale)
}
