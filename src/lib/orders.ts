import { Attachment, Order, OrderStatus, ProductType, ORDER_STATUS_LABELS } from '@/types'

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  graduation_cap: 'قبعة تخرج',
  graduation_sash: 'وشاح تخرج',
  graduation_gown: 'روب تخرج',
  graduation_jacket: 'جاكيت تخرج',
  hoodie: 'هودي',
  tshirt: 'تيشيرت',
  other: 'منتج آخر',
}

export type ProductDetailField = {
  key: string
  label: string
  placeholder?: string
  type?: 'text' | 'select'
  options?: string[]
}

export const PRODUCT_DETAIL_FIELDS: Record<ProductType, ProductDetailField[]> = {
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
}

export const PRODUCT_TYPE_OPTIONS = (Object.keys(PRODUCT_TYPE_LABELS) as ProductType[]).map(value => ({
  value,
  label: PRODUCT_TYPE_LABELS[value],
}))

export const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = (
  Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]
).map(value => ({
  value,
  label: ORDER_STATUS_LABELS[value],
}))

export function getProductTypeLabel(productType: ProductType | null | undefined, fallback?: string | null) {
  if (productType && PRODUCT_TYPE_LABELS[productType]) return PRODUCT_TYPE_LABELS[productType]
  return fallback || 'غير محدد'
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

export function getDetailEntries(productType: ProductType | null | undefined, details: Record<string, unknown> | null | undefined) {
  if (!details) return []
  const fields = productType ? PRODUCT_DETAIL_FIELDS[productType] : []
  const labels = new Map(fields.map(field => [field.key, field.label]))

  return Object.entries(details)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
    .map(([key, value]) => ({
      key,
      label: labels.get(key) || key.replace(/_/g, ' '),
      value: String(value),
    }))
}

export function getFactoryOrderType(productType: ProductType | null | undefined, fallback?: string | null) {
  if (productType === 'graduation_cap') return 'cap'
  if (productType === 'graduation_sash') return 'scarf'
  if (productType === 'graduation_gown') return 'gown'
  if (productType === 'graduation_jacket') return 'jacket'
  if (productType === 'hoodie') return 'hoodie'
  if (productType === 'tshirt') return 'T-shirt'
  return fallback || 'other'
}
