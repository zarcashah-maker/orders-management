'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Order, OrderStatus } from '@/types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate } from '@/lib/utils'
import { getFactoryOrderType, getOrderThumbnail } from '@/lib/orders'
import { useAuth } from '@/hooks/useAuth'
import { Package, Calendar, Hash, Clock, CheckCircle, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function FactoryDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    if (!profile?.factory_id) return
    supabase
      .from('orders')
      .select('*, images:order_images(*), attachments(*)')
      .eq('factory_id', profile.factory_id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders(data || [])
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  const pending = orders.filter(o => o.status === 'pending').length
  const inProgress = orders.filter(o => o.status === 'in_progress').length
  const completed = orders.filter(o => o.status === 'completed').length

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-stone-800 to-stone-900 rounded-2xl p-5 text-white">
        <p className="text-stone-400 text-sm">مرحباً،</p>
        <h1 className="text-xl font-display font-bold mt-0.5">
          {profile?.full_name || 'المصنع'}
        </h1>
        <p className="text-stone-400 text-sm mt-1">إجمالي {orders.length} طلب</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'انتظار', value: pending, icon: Clock, color: 'text-amber-500 bg-amber-50' },
          { label: 'تنفيذ', value: inProgress, icon: TrendingUp, color: 'text-blue-500 bg-blue-50' },
          { label: 'مكتمل', value: completed, icon: CheckCircle, color: 'text-green-500 bg-green-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-stone-200/60 p-4 text-center">
            <div className={`w-9 h-9 ${s.color} rounded-xl flex items-center justify-center mx-auto mb-2`}>
              <s.icon size={18} />
            </div>
            <p className="text-2xl font-display font-bold text-stone-900">{loading ? '...' : s.value}</p>
            <p className="text-xs text-stone-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Orders list */}
      <div>
        <h2 className="font-bold text-stone-900 mb-3">طلباتك</h2>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-24 skeleton rounded-2xl" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200/60 p-8 text-center text-stone-400">
            <Package size={32} className="mx-auto mb-2 opacity-30" />
            <p>لا توجد طلبات حتى الآن</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <Link
                key={order.id}
                href={`/factory/orders/${order.id}`}
                className="block bg-white rounded-2xl border border-stone-200/60 shadow-sm p-4 hover:shadow-md hover:border-stone-300 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 flex items-center justify-center flex-shrink-0">
                    {getOrderThumbnail(order) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getOrderThumbnail(order)!} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package size={18} className="text-stone-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-stone-400">{order.order_number}</span>
                      <StatusBadge status={order.status as OrderStatus} size="sm" />
                    </div>
                    <p className="font-medium text-stone-900 truncate">{getFactoryOrderType(order.product_type, order.title)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-stone-400">
                  {order.quantity && (
                    <span className="flex items-center gap-1">
                      <Hash size={11} />
                      {order.quantity}
                    </span>
                  )}
                  {order.due_date && (
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {formatDate(order.due_date)}
                    </span>
                  )}
                  <span className="flex items-center gap-1 mr-auto">
                    <Package size={11} />
                    {formatDate(order.created_at)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
