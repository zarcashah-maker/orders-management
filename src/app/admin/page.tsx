'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Order, Factory as FactoryType } from '@/types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate } from '@/lib/utils'
import { Package, Clock, CheckCircle, Factory, TrendingUp, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Stats {
  total: number
  pending: number
  in_progress: number
  completed: number
  factories: number
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, in_progress: 0, completed: 0, factories: 0 })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [{ data: ordersData }, { data: factoriesData }] = await Promise.all([
        supabase
          .from('orders')
          .select('*, factory:factories(name)')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('factories').select('id').eq('is_active', true),
      ])

      const all = ordersData || []
      setOrders(all)
      setStats({
        total: all.length,
        pending: all.filter(o => o.status === 'pending').length,
        in_progress: all.filter(o => o.status === 'in_progress').length,
        completed: all.filter(o => o.status === 'completed').length,
        factories: (factoriesData || []).length,
      })
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const statCards = [
    { label: 'إجمالي الطلبات', value: stats.total, icon: Package, color: 'bg-brand-500', light: 'bg-brand-50 text-brand-700' },
    { label: 'قيد الانتظار', value: stats.pending, icon: Clock, color: 'bg-amber-500', light: 'bg-amber-50 text-amber-700' },
    { label: 'جاري التنفيذ', value: stats.in_progress, icon: TrendingUp, color: 'bg-blue-500', light: 'bg-blue-50 text-blue-700' },
    { label: 'مكتملة', value: stats.completed, icon: CheckCircle, color: 'bg-green-500', light: 'bg-green-50 text-green-700' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-stone-900">لوحة التحكم</h1>
        <p className="text-stone-500 text-sm mt-1">نظرة عامة على جميع الطلبات والمصانع</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="bg-white rounded-2xl p-4 border border-stone-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-stone-500">{card.label}</span>
              <div className={`w-9 h-9 ${card.color} rounded-xl flex items-center justify-center`}>
                <card.icon size={18} className="text-white" />
              </div>
            </div>
            {loading ? (
              <div className="h-8 w-12 skeleton rounded" />
            ) : (
              <p className="text-3xl font-display font-bold text-stone-900">{card.value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Factory count */}
      <div className="bg-gradient-to-r from-stone-800 to-stone-900 rounded-2xl p-5 text-white flex items-center justify-between">
        <div>
          <p className="text-stone-400 text-sm">المصانع المرتبطة</p>
          <p className="text-4xl font-display font-bold mt-1">{loading ? '...' : stats.factories}</p>
        </div>
        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
          <Factory size={32} className="text-brand-400" />
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-stone-100">
          <h2 className="font-bold text-stone-900">آخر الطلبات</h2>
          <Link
            href="/admin/orders"
            className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            عرض الكل <ArrowLeft size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 skeleton rounded-xl" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-stone-400">
            <Package size={32} className="mx-auto mb-2 opacity-30" />
            <p>لا توجد طلبات بعد</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {orders.map(order => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-stone-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono text-stone-400">{order.order_number}</span>
                    <StatusBadge status={order.status} size="sm" />
                  </div>
                  <p className="text-sm font-medium text-stone-800 truncate">{order.title}</p>
                  <p className="text-xs text-stone-400">{(order.factory as unknown as FactoryType)?.name}</p>
                </div>
                <span className="text-xs text-stone-400 whitespace-nowrap">{formatDate(order.created_at)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
