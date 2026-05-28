export type UserRole = 'Admin' | 'Factory'

export type OrderStatus =
  | 'pending'
  | 'sewing'
  | 'in_progress'
  | 'rework'
  | 'review'
  | 'completed'
  | 'cancelled'

export type ProductType =
  | 'graduation_cap'
  | 'graduation_sash'
  | 'graduation_gown'
  | 'graduation_jacket'
  | 'hoodie'
  | 'tshirt'
  | 'other'

export interface Profile {
  id: string
  name: string
  email: string
  password: string | null
  role: UserRole
  factory_id: string | null
  auth_user_id: string | null
  created_at: string
}

export interface Factory {
  id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  is_active: boolean
  created_at: string
}

export interface Order {
  id: string
  order_number: string
  salla_order_number: string | null
  customer_name: string | null
  customer_phone: string | null
  product_type: ProductType | null
  details: Record<string, unknown> | null
  status: OrderStatus
  assigned_factory_id: string | null
  created_by: string | null
  order_date: string | null
  due_date: string | null
  quantity: number | null
  general_notes: string | null
  is_urgent: boolean
  archived: boolean
  created_at: string
  updated_at: string
  factory?: Factory
  images?: OrderImage[]
  attachments?: Attachment[]
  creator?: Profile
}

export interface OrderImage {
  id: string
  order_id: string
  url: string
  caption: string | null
  created_at: string
}

export interface Attachment {
  id: string
  order_id: string
  file_url: string
  file_name: string
  attachment_type: string
  storage_path: string | null
  notes: string | null
  created_at: string
}

export interface Comment {
  id: string
  order_id: string
  user_id: string | null
  comment_text: string
  is_internal: boolean
  created_at: string
}

export interface StatusHistory {
  id: string
  order_id: string
  old_status: OrderStatus | null
  new_status: OrderStatus
  changed_by: string | null
  notes: string | null
  created_at: string
}

export interface AIChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'قيد الانتظار',
  sewing: 'الخياطة',
  in_progress: 'جاري التنفيذ',
  rework: 'مرتجع / إعادة عمل',
  review: 'تحت المراجعة',
  completed: 'مكتمل',
  cancelled: 'ملغي',
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  sewing: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  rework: 'bg-orange-100 text-orange-800 border-orange-200',
  review: 'bg-purple-100 text-purple-800 border-purple-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
}
