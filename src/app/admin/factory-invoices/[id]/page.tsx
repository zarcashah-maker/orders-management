'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ArrowRight, FileDown, ReceiptText } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Factory, FactoryInvoice, Order, OrderStatus } from '@/types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { UrgentBadge } from '@/components/shared/UrgentBadge'
import { ExecutionTypeBadge } from '@/components/shared/ExecutionTypeBadge'
import { formatCurrencySar, formatDateTime } from '@/lib/utils'
import { getProductTypeLabel } from '@/lib/orders'
import { usePreferences } from '@/lib/i18n'

type InvoiceWithFactory = FactoryInvoice & { factory?: Factory }

export default function AdminFactoryInvoiceDetailsPage() {
  const { id } = useParams()
  const invoiceId = Array.isArray(id) ? id[0] : id
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { locale, t } = usePreferences()
  const [invoice, setInvoice] = useState<InvoiceWithFactory | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [unapproving, setUnapproving] = useState(false)

  useEffect(() => {
    async function load() {
      if (!invoiceId) return
      setLoading(true)
      const [{ data: invoiceData }, { data: orderData }] = await Promise.all([
        supabase
          .from('factory_invoices')
          .select('*, factory:factories(*)')
          .eq('id', invoiceId)
          .single(),
        supabase
          .from('orders')
          .select('*')
          .eq('factory_invoice_id', invoiceId)
          .order('updated_at', { ascending: false }),
      ])
      setInvoice(invoiceData as InvoiceWithFactory | null)
      setOrders((orderData || []) as Order[])
      setLoading(false)
    }

    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId])

  function getInvoiceStatusLabel(status: FactoryInvoice['status']) {
    if (status === 'paid') return t('paid')
    if (status === 'approved') return t('approved')
    if (status === 'cancelled') return t('cancelledInvoice')
    return t('pendingCosts')
  }

  async function unapproveInvoice() {
    if (!invoice || unapproving) return
    if (!window.confirm(t('confirmUnapproveInvoice'))) return

    setUnapproving(true)
    try {
      const { error: ordersError } = await supabase
        .from('orders')
        .update({
          factory_invoice_id: null,
          factory_cost_status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('factory_invoice_id', invoice.id)
      if (ordersError) throw ordersError

      const { error: invoiceError } = await supabase
        .from('factory_invoices')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice.id)
      if (invoiceError) throw invoiceError

      toast.success(t('invoiceUnapproved'))
      router.push('/admin/factory-invoices')
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('Unapprove invoice error:', err)
      toast.error(t('invoiceUnapproveFailed'))
    } finally {
      setUnapproving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 skeleton rounded-xl" />
        <div className="h-80 skeleton rounded-2xl" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-stone-500">
        {locale === 'ar' ? 'الفاتورة غير موجودة' : 'Invoice not found'}
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <Link href="/admin/factory-invoices" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors">
        <ArrowRight size={16} />
        {t('factoryInvoices')}
      </Link>

      <div className="rounded-2xl border border-stone-200/60 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <ReceiptText size={18} className="text-stone-400" />
              <h1 className="text-xl font-display font-bold text-stone-900">{t('invoiceDetails')}</h1>
            </div>
            <p className="font-mono text-sm text-stone-500">{invoice.invoice_number}</p>
          </div>
          {invoice.status !== 'cancelled' && (
            <button
              type="button"
              onClick={unapproveInvoice}
              disabled={unapproving}
              className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              {unapproving ? t('saving') : t('unapproveInvoice')}
            </button>
          )}
        </div>

        <div className="mt-5 grid gap-4 border-t border-stone-100 pt-5 sm:grid-cols-4">
          <div>
            <p className="text-xs text-stone-400">{t('factory')}</p>
            <p className="mt-1 text-sm font-medium text-stone-800">{invoice.factory?.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-stone-400">{t('status')}</p>
            <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
              invoice.status === 'paid'
                ? 'bg-green-50 text-green-700'
                : invoice.status === 'cancelled'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-blue-50 text-blue-700'
            }`}>
              {getInvoiceStatusLabel(invoice.status)}
            </span>
          </div>
          <div>
            <p className="text-xs text-stone-400">{t('totalAmount')}</p>
            <p className="mt-1 text-sm font-bold text-stone-900">{formatCurrencySar(invoice.total_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-stone-400">{invoice.paid_at ? t('paid') : t('createdAt')}</p>
            <p className="mt-1 text-sm font-medium text-stone-800">{formatDateTime(invoice.paid_at || invoice.created_at)}</p>
          </div>
        </div>

        {invoice.receipt_url && (
          <a href={invoice.receipt_url} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-700 hover:border-brand-200">
            <FileDown size={15} />
            {invoice.receipt_file_name || t('receipt')}
          </a>
        )}
      </div>

      <div className="rounded-2xl border border-stone-200/60 bg-white shadow-sm">
        <div className="border-b border-stone-100 p-5">
          <h2 className="font-bold text-stone-900">{t('ordersInInvoice')}</h2>
        </div>

        {orders.length === 0 ? (
          <div className="p-8 text-center text-stone-400">{t('noOrders')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-stone-50 text-xs font-semibold text-stone-500">
                  <th className="px-4 py-3 text-right">{t('internalOrderNumber')}</th>
                  <th className="px-4 py-3 text-right">{t('sallaOrderNumber')}</th>
                  <th className="px-4 py-3 text-right">{t('productType')}</th>
                  <th className="px-4 py-3 text-right">{t('executionType')}</th>
                  <th className="px-4 py-3 text-right">{t('status')}</th>
                  <th className="px-4 py-3 text-right">{t('executionCost')}</th>
                  <th className="px-4 py-3 text-right">{t('costNote')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-stone-50/70">
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${order.id}`} className="font-mono text-xs text-brand-600 hover:text-brand-700">
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-stone-500">{order.salla_order_number || '—'}</td>
                    <td className="px-4 py-3 text-sm text-stone-700">
                      <div className="flex items-center gap-2">
                        <span>{getProductTypeLabel(order.product_type, null, locale)}</span>
                        {order.is_urgent && <UrgentBadge size="sm" />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ExecutionTypeBadge executionType={order.execution_type} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status as OrderStatus} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-stone-900">{formatCurrencySar(order.factory_cost)}</td>
                    <td className="px-4 py-3 text-sm text-stone-500">{order.factory_cost_note || '—'}</td>
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
