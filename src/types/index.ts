export type UserRole = 'admin' | 'factory'

export type OrderStatus =
  | 'pending'
  | 'in_progress'
  | 'review'
  | 'completed'
  | 'cancelled'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  factory_id: string | null
  created_at: string
}

export interface Factory {
  id: string
  name: string
  slug: string
  description: string | null
  contact_email: string | null
  contact_phone: string | null
  is_active: boolean
  created_at: string
}

export interface Order {
  id: string
  order_number: string
  title: string
  description: string | null
  status: OrderStatus
  factory_id: string
  created_by: string
  due_date: string | null
  quantity: number | null
  notes: string | null
  ai_summary: string | null
  created_at: string
  updated_at: string
  factory?: Factory
  images?: OrderImage[]
  creator?: Profile
}

export interface OrderImage {
  id: string
  order_id: string
  url: string
  caption: string | null
  created_at: string
}

export interface AIChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'قيد الانتظار',
  in_progress: 'جاري التنفيذ',
  review: 'تحت المراجعة',
  completed: 'مكتمل',
  cancelled: 'ملغي',
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  review: 'bg-purple-100 text-purple-800 border-purple-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
}
