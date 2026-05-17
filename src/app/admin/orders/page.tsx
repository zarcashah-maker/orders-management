'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Order, Factory, OrderStatus } from '@/types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate } from '@/lib/utils'
import { Plus, Search, Filter, Package } from 'lucide-react'
import Link from 'next/link'
import { NewOrderModal } from '@/components/admin/NewOrderModal'

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'جميع الحالات' },
  { value: 'pending', label: 'قيد الانتظار' },
  { value: 'in_progress', label: 'جاري التنفيذ' },
  { value: 'review', label: 'تحت المراجعة' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'cancelled', label: 'ملغي' },
]

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [factories, setFactories] = useState<Factory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [factoryFilter, setFactoryFilter] = useState('')
  const [showNewOrder, setShowNewOrder] = useState(false)
  const supabase = createClient()

  const loadOrders = useCallback(async () => {
    let query = supabase
      .from('orders')
      .select('*, factory:factories(id, name)')
      .order('created_at', { ascending: false })

    if (statusFilter) query = query.eq('status', statusFilter)
    if (factoryFilter) query = query.eq('factory_id', factoryFilter)

    const { data } = await query
    setOrders(data || [])
    setLoading(false)
  }, [statusFilter, factoryFilter, supabase])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  useEffect(() => {
    supabase.from('factories').select('*').eq('is_active', true).then(({ data }) => {
      setFactories(data || [])
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = orders.filter(o =>
    search === '' ||
    o.title.toLowerCase().includes(search.toLowerCase()) ||
    o.order_number.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-stone-900">الطلبات</h1>
          <p className="text-stone-500 text-sm mt-0.5">إجمالي {orders.length} طلب</p>
        </div>
        <button
          onClick={() => setShowNewOrder(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600
            text-white text-sm font-semibold rounded-xl transition-all
            shadow-md shadow-brand-500/25 hover:shadow-lg hover:shadow-brand-500/30 hover:-translate-y-0.5"
        >
          <Plus size={18} />
          <span className="hidden sm:block">طلب جديد</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="بحث برقم أو عنوان الطلب..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pr-9 pl-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm
              focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="pr-8 pl-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm
              focus:outline-none focus:ring-2 focus:ring-brand-400 appearance-none cursor-pointer"
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <select
          value={factoryFilter}
          onChange={e => setFactoryFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm
            focus:outline-none focus:ring-2 focus:ring-brand-400 appearance-none cursor-pointer"
        >
          <option value="">جميع المصانع</option>
          {factories.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-stone-400">
            <Package size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">لا توجد طلبات</p>
            <p className="text-sm mt-1">أضف طلباً جديداً أو غيّر الفلاتر</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  <th className="text-right px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">رقم الطلب</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">العنوان</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">المصنع</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">الحالة</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">تاريخ الإنشاء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filtered.map(order => (
                  <tr key={order.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs text-stone-500 bg-stone-100 px-2 py-1 rounded-lg">
                        {order.order_number}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-sm font-medium text-stone-800 hover:text-brand-600 transition-colors"
                      >
                        {order.title}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-600">
                      {(order.factory as unknown as Factory)?.name || '—'}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={order.status as OrderStatus} size="sm" />
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-400">
                      {formatDate(order.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Order Modal */}
      {showNewOrder && (
        <NewOrderModal
          factories={factories}
          onClose={() => setShowNewOrder(false)}
          onCreated={() => { setShowNewOrder(false); loadOrders() }}
        />
      )}
    </div>
  )
}
