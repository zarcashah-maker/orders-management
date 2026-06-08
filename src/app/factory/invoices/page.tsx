'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { FileDown, Package, ReceiptText } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { FactoryInvoice, Order } from '@/types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { UrgentBadge } from '@/components/shared/UrgentBadge'
import { formatCurrencySar, formatDate } from '@/lib/utils'
import { getProductTypeLabel } from '@/lib/orders'
import { useAuth } from '@/hooks/useAuth'
import { usePreferences } from '@/lib/i18n'

export default function FactoryInvoicesPage() {
  const supabase = useMemo(() => createClient(), [])
  const { profile } = useAuth()
  const { locale, t } = usePreferences()
  const [pendingOrders, setPendingOrders] = useState<Order[]>([])
  const [invoices, setInvoices] = useState<FactoryInvoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!profile?.factory_id) return
      setLoading(true)
      const [{ data: pending }, { data: invoiceData }] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .eq('assigned_factory_id', profile.factory_id)
          .not('factory_cost', 'is', null)
          .is('factory_invoice_id', null)
          .or('factory_cost_status.is.null,factory_cost_status.eq.pending')
          .order('updated_at', { ascending: false }),
        supabase
          .from('factory_invoices')
          .select('*')
          .eq('factory_id', profile.factory_id)
          .neq('status', 'cancelled')
          .order('created_at', { ascending: false }),
      ])
      setPendingOrders((pending || []) as Order[])
      setInvoices((invoiceData || []) as FactoryInvoice[])
      setLoading(false)
    }

    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.factory_id])

  const pendingTotal = pendingOrders.reduce((sum, order) => sum + Number(order.factory_cost || 0), 0)

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-stone-900">{t('myInvoices')}</h1>
        <p className="text-sm text-stone-500 mt-1">{locale === 'ar' ? 'متابعة التكاليف المعتمدة والمدفوعة' : 'Track approved and paid costs'}</p>
      </div>

      <section className="rounded-2xl border border-stone-200/60 bg-white shadow-sm">
        <div className="border-b border-stone-100 p-5">
          <h2 className="font-bold text-stone-900">{t('pendingCosts')}</h2>
          <p className="text-sm text-stone-500 mt-1">{t('pendingAmount')}: {formatCurrencySar(pendingTotal)}</p>
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(3)].map((_, index) => <div key={index} className="h-16 skeleton rounded-xl" />)}
          </div>
        ) : pendingOrders.length === 0 ? (
          <div className="p-8 text-center text-stone-400">
            <Package size={32} className="mx-auto mb-2 opacity-30" />
            {t('noPendingCosts')}
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {pendingOrders.map(order => (
              <Link
                key={order.id}
                href={`/factory/orders/${order.id}`}
                className={`block p-4 ${order.status === 'completed' ? 'hover:bg-stone-50' : 'bg-amber-50/40 hover:bg-amber-50/70'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-stone-400">{order.order_number}</span>
                      <StatusBadge status={order.status} size="sm" />
                      {order.is_urgent && <UrgentBadge size="sm" />}
                    </div>
                    <p className="mt-1 text-sm font-medium text-stone-900">{getProductTypeLabel(order.product_type, null, locale)}</p>
                    <p className={`mt-1 text-xs font-semibold ${order.status === 'completed' ? 'text-green-700' : 'text-amber-700'}`}>
                      {order.status === 'completed' ? t('readyForApproval') : t('costEnteredNotCompleted')}
                    </p>
                    {order.factory_cost_note && <p className="mt-1 text-xs text-stone-400">{order.factory_cost_note}</p>}
                  </div>
                  <p className="text-sm font-bold text-stone-900">{formatCurrencySar(order.factory_cost)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-stone-200/60 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-stone-100 p-5">
          <ReceiptText size={17} className="text-stone-400" />
          <h2 className="font-bold text-stone-900">{t('approvedInvoices')}</h2>
        </div>
        {invoices.length === 0 ? (
          <div className="p-8 text-center text-stone-400">{t('noInvoices')}</div>
        ) : (
          <div className="divide-y divide-stone-50">
            {invoices.map(invoice => (
              <div key={invoice.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-semibold text-stone-900">{invoice.invoice_number}</p>
                    <p className="text-xs text-stone-400">{invoice.order_count} {t('orders')} · {formatDate(invoice.created_at)}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-stone-900">{formatCurrencySar(invoice.total_amount)}</p>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${invoice.status === 'paid' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                      {invoice.status === 'paid' ? t('paid') : t('approved')}
                    </span>
                  </div>
                </div>
                {invoice.receipt_url && (
                  <a href={invoice.receipt_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-600 hover:border-brand-200">
                    <FileDown size={13} />
                    {invoice.receipt_file_name || t('receipt')}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
