'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { ExecutionType, Order, Factory, OrderStatus } from '@/types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { UrgentBadge } from '@/components/shared/UrgentBadge'
import { ExecutionTypeBadge } from '@/components/shared/ExecutionTypeBadge'
import { formatDate } from '@/lib/utils'
import {
  getOrderThumbnail,
  getExecutionTypeOptions,
  getProductTypeLabel,
  getOrderStatusOptions,
  getProductTypeOptions,
} from '@/lib/orders'
import { Plus, Search, Filter, Package, LayoutGrid, List, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { usePreferences } from '@/lib/i18n'
import toast from 'react-hot-toast'

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [factories, setFactories] = useState<Factory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [factoryFilter, setFactoryFilter] = useState('')
  const [productFilter, setProductFilter] = useState('')
  const [executionTypeFilter, setExecutionTypeFilter] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const supabase = useMemo(() => createClient(), [])
  const { locale, t } = usePreferences()
  const statusOptions = getOrderStatusOptions(locale)
  const productOptions = getProductTypeOptions(locale)
  const executionTypeOptions = getExecutionTypeOptions(locale)
  const STATUS_FILTER_OPTIONS = [{ value: '', label: t('allStatuses') }, ...statusOptions]
  const PRODUCT_FILTER_OPTIONS = [{ value: '', label: t('allProducts') }, ...productOptions]

  const loadOrders = useCallback(async () => {
    let query = supabase
      .from('orders')
      .select('*, factory:factories(id, name), images:order_images(*), attachments(*)')
      .order('created_at', { ascending: false })

    if (statusFilter) query = query.eq('status', statusFilter)
    if (factoryFilter) query = query.eq('assigned_factory_id', factoryFilter)
    if (productFilter) query = query.eq('product_type', productFilter)
    if (executionTypeFilter) query = query.eq('execution_type', executionTypeFilter)

    const { data } = await query
    setOrders(data || [])
    setLoading(false)
  }, [statusFilter, factoryFilter, productFilter, executionTypeFilter, supabase])

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
    o.order_number.toLowerCase().includes(search.toLowerCase()) ||
    (o.salla_order_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.customer_phone || '').toLowerCase().includes(search.toLowerCase())
  )

  const kanbanStatuses = statusOptions.map(option => option.value)

  async function deleteOrder(order: Order) {
    if (!window.confirm(t('confirmDeleteOrder'))) return
    const { error } = await supabase.from('orders').delete().eq('id', order.id)
    if (error) {
      console.error('Delete order error:', error)
      toast.error(t('deleteFailed'))
      return
    }
    setOrders(current => current.filter(item => item.id !== order.id))
    toast.success(t('deletedOrder'))
  }

  function OrderSummary({ order }: { order: Order }) {
    return (
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 flex items-center justify-center flex-shrink-0">
          {getOrderThumbnail(order) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={getOrderThumbnail(order)!} alt="" className="w-full h-full object-cover" />
          ) : (
            <Package size={18} className="text-stone-300" />
          )}
        </div>
        <div className="min-w-0">
          <Link
            href={`/admin/orders/${order.id}`}
            className="text-sm font-medium text-stone-800 hover:text-brand-600 transition-colors"
          >
            {getProductTypeLabel(order.product_type, null, locale)}
          </Link>
          <p className="text-xs text-stone-400 mt-0.5 font-mono">{order.order_number}</p>
          <span className="mt-1 inline-flex">
            <ExecutionTypeBadge executionType={order.execution_type} size="sm" />
          </span>
          {order.is_urgent && (
            <span className="mt-1 inline-flex">
              <UrgentBadge size="sm" />
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-stone-900">{t('orders')}</h1>
          <p className="text-stone-500 text-sm mt-0.5">{t('totalOrders')}: {orders.length}</p>
        </div>
        <Link
          href="/admin/orders/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600
            text-white text-sm font-semibold rounded-xl transition-all
            shadow-md shadow-brand-500/25 hover:shadow-lg hover:shadow-brand-500/30 hover:-translate-y-0.5"
        >
          <Plus size={18} />
          <span className="hidden sm:block">{t('newOrder')}</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder={locale === 'ar' ? 'بحث برقم داخلي أو سلة أو الجوال...' : 'Search internal, Salla, or phone...'}
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
            {STATUS_FILTER_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <select
          value={productFilter}
          onChange={e => setProductFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm
            focus:outline-none focus:ring-2 focus:ring-brand-400 appearance-none cursor-pointer"
        >
          {PRODUCT_FILTER_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={factoryFilter}
          onChange={e => setFactoryFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm
            focus:outline-none focus:ring-2 focus:ring-brand-400 appearance-none cursor-pointer"
        >
          <option value="">{t('allFactories')}</option>
          {factories.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <select
          value={executionTypeFilter}
          onChange={e => setExecutionTypeFilter(e.target.value as ExecutionType | '')}
          className="px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm
            focus:outline-none focus:ring-2 focus:ring-brand-400 appearance-none cursor-pointer"
        >
          <option value="">{locale === 'ar' ? 'كل أنواع التنفيذ' : 'All execution types'}</option>
          {executionTypeOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <div className="flex bg-white border border-stone-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`w-10 h-10 flex items-center justify-center ${viewMode === 'list' ? 'bg-brand-500 text-white' : 'text-stone-500 hover:bg-stone-50'}`}
            title={t('listView')}
          >
            <List size={17} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`w-10 h-10 flex items-center justify-center ${viewMode === 'kanban' ? 'bg-brand-500 text-white' : 'text-stone-500 hover:bg-stone-50'}`}
            title={t('kanbanView')}
          >
            <LayoutGrid size={17} />
          </button>
        </div>
      </div>

      {/* Orders */}
      <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-stone-400">
            <Package size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">{t('noOrders')}</p>
          </div>
        ) : viewMode === 'kanban' ? (
          <div className="p-4 overflow-x-auto">
            <div className="grid min-w-[1120px] grid-cols-7 gap-3">
              {kanbanStatuses.map(status => {
                const statusOrders = filtered.filter(order => order.status === status)
                return (
                  <div key={status} className="bg-stone-50 rounded-2xl border border-stone-100 p-3 min-h-48">
                    <div className="flex items-center justify-between mb-3">
                      <StatusBadge status={status} size="sm" />
                      <span className="text-xs text-stone-400">{statusOrders.length}</span>
                    </div>
                    <div className="space-y-2">
                      {statusOrders.map(order => (
                        <Link
                          key={order.id}
                          href={`/admin/orders/${order.id}`}
                          className="block bg-white rounded-xl border border-stone-200 p-3 hover:border-brand-200 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-100 flex items-center justify-center flex-shrink-0">
                              {getOrderThumbnail(order) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={getOrderThumbnail(order)!} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Package size={16} className="text-stone-300" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-stone-800 truncate">{getProductTypeLabel(order.product_type, null, locale)}</p>
                              <p className="text-xs font-mono text-stone-400">{order.order_number}</p>
                              <div className="mt-1">
                                <ExecutionTypeBadge executionType={order.execution_type} size="sm" />
                              </div>
                            </div>
                          </div>
                          {order.is_urgent && <div className="mt-2"><UrgentBadge size="sm" /></div>}
                          <p className="text-xs text-stone-400 mt-2">{(order.factory as unknown as Factory)?.name || (locale === 'ar' ? 'غير مسند' : 'Unassigned')}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  <th className="text-right px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t('internalOrderNumber')}</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t('sallaOrderNumber')}</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t('productType')}</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t('executionType')}</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t('customerPhone')}</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t('factory')}</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t('status')}</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t('createdAt')}</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t('delete')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filtered.map(order => (
                  <tr key={order.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-stone-500 bg-stone-100 px-2 py-1 rounded-lg">
                          {order.order_number}
                        </span>
                        {order.is_urgent && <UrgentBadge size="sm" />}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-600 font-mono">
                      {order.salla_order_number || '—'}
                    </td>
                    <td className="px-5 py-4">
                      <OrderSummary order={order} />
                    </td>
                    <td className="px-5 py-4">
                      <ExecutionTypeBadge executionType={order.execution_type} size="sm" />
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-600">
                      {order.customer_phone || '—'}
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
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => deleteOrder(order)}
                        className="w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 inline-flex items-center justify-center"
                        title={t('delete')}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
