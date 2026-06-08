import { Attachment, ExecutionType, Order, OrderStatus, ProductType } from '@/types'
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

export const EXECUTION_TYPE_LABELS: Record<Locale, Record<ExecutionType, string>> = {
  ar: {
    printing: 'طباعة',
    embroidery: 'تطريز',
  },
  en: {
    printing: 'Printing',
    embroidery: 'Embroidery',
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
  customOption?: string
  customPlaceholder?: string
  showWhen?: {
    key: string
    values: string[]
  }
}

const sizes = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']

const arabicProductColors = ['أسود', 'رمادي', 'كحلي', 'أبيض', 'أصفر', 'أحمر', 'زهري', 'أخرى...']
const englishProductColors = ['Black', 'Gray', 'Navy', 'White', 'Yellow', 'Red', 'Pink', 'Other...']
const arabicCapColors = ['أسود', 'كحلي', 'ليلكي', 'برغندي', 'أخرى...']
const englishCapColors = ['Black', 'Navy', 'Lilac', 'Burgundy', 'Other...']
const arabicSashColors = ['أسود', 'كحلي', 'ليلكي', 'برغندي', 'أبيض', 'أخرى...']
const englishSashColors = ['Black', 'Navy', 'Lilac', 'Burgundy', 'White', 'Other...']

export const PRODUCT_DETAIL_FIELDS_BY_LOCALE: Record<Locale, Record<ProductType, ProductDetailField[]>> = {
  ar: {
    graduation_cap: [
    {
      key: 'cap_color',
      label: 'لون القبعة',
      type: 'select',
      options: arabicCapColors,
      customOption: 'أخرى...',
      customPlaceholder: 'اكتب لون القبعة',
    },
    { key: 'cap_size', label: 'مقاس القبعة', type: 'select', options: ['صغير 21×21', 'وسط 24×24', 'كبير 27×27'] },
    { key: 'tassel_color', label: 'لون الهدب', type: 'select', options: ['فضي', 'ذهبي', 'أسود'] },
    ],
    graduation_sash: [
    {
      key: 'fabric_color',
      label: 'لون القماش',
      type: 'select',
      options: arabicSashColors,
      customOption: 'أخرى...',
      customPlaceholder: 'اكتب لون القماش',
    },
    { key: 'fabric_type', label: 'نوع القماش', type: 'select', options: ['مخمل', 'تفته', 'غير مخمل'] },
    { key: 'embroidery_font', label: 'الخط المستخدم للكتابة' },
    { key: 'cord', label: 'قيطان أو بدون', type: 'select', options: ['قيطان', 'بدون قيطان'] },
    { key: 'cord_color', label: 'لون القيطان', type: 'select', options: ['فضي', 'ذهبي'], showWhen: { key: 'cord', values: ['قيطان', 'Cord'] } },
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
    { key: 'size', label: 'المقاس', type: 'select', options: sizes },
    {
      key: 'sleeve_color',
      label: 'لون الأكمام',
      type: 'select',
      options: arabicProductColors,
      customOption: 'أخرى...',
      customPlaceholder: 'اكتب لون الأكمام',
    },
    {
      key: 'rib_color',
      label: 'لون الريب',
      type: 'select',
      options: arabicProductColors,
      customOption: 'أخرى...',
      customPlaceholder: 'اكتب لون الريب',
    },
    {
      key: 'jacket_color',
      label: 'لون الجاكيت',
      type: 'select',
      options: arabicProductColors,
      customOption: 'أخرى...',
      customPlaceholder: 'اكتب لون الجاكيت',
    },
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
      {
        key: 'cap_color',
        label: 'Cap color',
        type: 'select',
        options: englishCapColors,
        customOption: 'Other...',
        customPlaceholder: 'Type cap color',
      },
      { key: 'cap_size', label: 'Cap size', type: 'select', options: ['Small 21×21', 'Medium 24×24', 'Large 27×27'] },
      { key: 'tassel_color', label: 'Tassel color', type: 'select', options: ['Silver', 'Gold', 'Black'] },
    ],
    graduation_sash: [
      {
        key: 'fabric_color',
        label: 'Fabric color',
        type: 'select',
        options: englishSashColors,
        customOption: 'Other...',
        customPlaceholder: 'Type fabric color',
      },
      { key: 'fabric_type', label: 'Fabric type', type: 'select', options: ['Velvet', 'Taffeta', 'Non-velvet'] },
      { key: 'embroidery_font', label: 'Writing font' },
      { key: 'cord', label: 'Cord option', type: 'select', options: ['Cord', 'No cord'] },
      { key: 'cord_color', label: 'Cord color', type: 'select', options: ['Silver', 'Gold'], showWhen: { key: 'cord', values: ['Cord', 'قيطان'] } },
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
      { key: 'size', label: 'Size', type: 'select', options: sizes },
      {
        key: 'sleeve_color',
        label: 'Sleeve color',
        type: 'select',
        options: englishProductColors,
        customOption: 'Other...',
        customPlaceholder: 'Type sleeve color',
      },
      {
        key: 'rib_color',
        label: 'Rib color',
        type: 'select',
        options: englishProductColors,
        customOption: 'Other...',
        customPlaceholder: 'Type rib color',
      },
      {
        key: 'jacket_color',
        label: 'Jacket color',
        type: 'select',
        options: englishProductColors,
        customOption: 'Other...',
        customPlaceholder: 'Type jacket color',
      },
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

export function getExecutionTypeOptions(locale: Locale = 'ar') {
  return (Object.keys(EXECUTION_TYPE_LABELS[locale]) as ExecutionType[]).map(value => ({
    value,
    label: EXECUTION_TYPE_LABELS[locale][value],
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

export function getExecutionTypeLabel(executionType: ExecutionType | null | undefined, locale: Locale = 'ar') {
  if (executionType && EXECUTION_TYPE_LABELS[locale][executionType]) return EXECUTION_TYPE_LABELS[locale][executionType]
  return locale === 'ar' ? 'غير محدد' : 'Not specified'
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
