import { Order, ProductType } from '@/types'

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  graduation_cap: 'قبعة تخرج',
  graduation_sash: 'وشاح تخرج',
  graduation_jacket: 'جاكيت تخرج',
  hoodie: 'هودي',
  tshirt: 'تيشيرت',
  other: 'منتج آخر',
}

export function getProductTypeLabel(productType: ProductType | null | undefined, fallback?: string | null) {
  if (productType && PRODUCT_TYPE_LABELS[productType]) return PRODUCT_TYPE_LABELS[productType]
  return fallback || 'غير محدد'
}

export function getOrderThumbnail(order: Pick<Order, 'images' | 'attachments'>) {
  const image = order.images?.[0]?.url
  if (image) return image

  return order.attachments?.find(attachment =>
    attachment.file_type?.startsWith('image/') ||
    /\.(png|jpe?g|webp|gif|svg)$/i.test(attachment.file_name)
  )?.file_url || null
}

export function getFactoryOrderType(productType: ProductType | null | undefined, fallback?: string | null) {
  if (productType === 'graduation_cap') return 'cap'
  if (productType === 'graduation_sash') return 'scarf'
  if (productType === 'graduation_jacket') return 'jacket'
  if (productType === 'hoodie') return 'hoodie'
  if (productType === 'tshirt') return 'T-shirt'
  return fallback || 'other'
}
