'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { FileDown, Package, ReceiptText, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Factory, FactoryInvoice, Order } from '@/types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { UrgentBadge } from '@/components/shared/UrgentBadge'
import { ExecutionTypeBadge } from '@/components/shared/ExecutionTypeBadge'
import { formatCurrencySar, formatDate } from '@/lib/utils'
import { getProductTypeLabel } from '@/lib/orders'
import { useAuth } from '@/hooks/useAuth'
import { usePreferences } from '@/lib/i18n'

type PendingOrder = Order & { factory?: Factory }

export default function AdminFactoryInvoicesPage() {
  const supabase = useMemo(() => createClient(), [])
  const { profile } = useAuth()
  const { locale, t } = usePreferences()
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([])
  const [invoices, setInvoices] = useState<FactoryInvoice[]>([])
  const [factoryFilter, setFactoryFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [costEdits, setCostEdits] = useState<Record<string, string>>({})
  const [noteEdits, setNoteEdits] = useState<Record<string, string>>({})
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [invoiceReceiptFiles, setInvoiceReceiptFiles] = useState<Record<string, File | null>>({})
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [uploadingReceiptId, setUploadingReceiptId] = useState('')

  useEffect(() => {
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    setLoading(true)
    const [{ data: pending }, { data: invoiceData }] = await Promise.all([
      supabase
        .from('orders')
        .select('*, factory:factories(*)')
        .not('factory_cost', 'is', null)
        .is('factory_invoice_id', null)
        .or('factory_cost_status.is.null,factory_cost_status.eq.pending')
        .order('updated_at', { ascending: false }),
      supabase
        .from('factory_invoices')
        .select('*, factory:factories(*)')
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false }),
    ])

    const orders = (pending || []) as PendingOrder[]
    setPendingOrders(orders)
    setInvoices((invoiceData || []) as FactoryInvoice[])
    setCostEdits(Object.fromEntries(orders.map(order => [order.id, String(order.factory_cost || '')])))
    setNoteEdits(Object.fromEntries(orders.map(order => [order.id, order.factory_cost_note || ''])))
    setLoading(false)
  }

  const factories = Array.from(
    new Map(
      pendingOrders
        .filter(order => order.assigned_factory_id && order.factory)
        .map(order => [order.assigned_factory_id as string, order.factory as Factory] as const)
    ).values()
  )

  const visiblePendingOrders = pendingOrders.filter(order => !factoryFilter || order.assigned_factory_id === factoryFilter)
  const selectedOrders = pendingOrders.filter(order => selectedIds.includes(order.id))
  const selectedTotal = selectedOrders.reduce((sum, order) => sum + Number(costEdits[order.id] || 0), 0)

  function toggleOrder(orderId: string) {
    setSelectedIds(current =>
      current.includes(orderId) ? current.filter(id => id !== orderId) : [...current, orderId]
    )
  }

  async function uploadReceipt(invoiceId: string, file: File) {
    const safeName = file.name.replace(/[^\w.\-]+/g, '-')
    const storagePath = `factory-invoices/${invoiceId}/${crypto.randomUUID()}-${safeName}`
    const { error: uploadError } = await supabase.storage.from('order-attachments').upload(storagePath, file)
    if (uploadError) throw uploadError
    const { data } = supabase.storage.from('order-attachments').getPublicUrl(storagePath)
    return {
      receipt_url: data.publicUrl,
      receipt_file_name: file.name,
      receipt_storage_path: storagePath,
    }
  }

  async function approveSelected() {
    if (selectedOrders.length === 0 || approving) return
    const factoryIds = Array.from(new Set(selectedOrders.map(order => order.assigned_factory_id).filter(Boolean)))
    if (factoryIds.length !== 1) {
      toast.error(locale === 'ar' ? 'اختر طلبات مصنع واحد فقط لكل فاتورة' : 'Select orders from one factory per invoice')
      return
    }

    setApproving(true)
    let uploadedReceipt: Awaited<ReturnType<typeof uploadReceipt>> | null = null

    try {
      const invoiceId = crypto.randomUUID()
      const { data: invoiceNumber, error: invoiceNumberError } = await supabase.rpc('generate_factory_invoice_number')
      if (invoiceNumberError || !invoiceNumber) throw invoiceNumberError || new Error('Could not generate invoice number')

      if (receiptFile) uploadedReceipt = await uploadReceipt(invoiceId, receiptFile)

      const invoiceStatus = uploadedReceipt ? 'paid' : 'approved'
      const { error: invoiceError } = await supabase.from('factory_invoices').insert({
        id: invoiceId,
        invoice_number: String(invoiceNumber),
        factory_id: factoryIds[0],
        total_amount: selectedTotal,
        order_count: selectedOrders.length,
        status: invoiceStatus,
        receipt_url: uploadedReceipt?.receipt_url || null,
        receipt_file_name: uploadedReceipt?.receipt_file_name || null,
        receipt_storage_path: uploadedReceipt?.receipt_storage_path || null,
        paid_at: uploadedReceipt ? new Date().toISOString() : null,
        created_by: profile?.id || null,
      })
      if (invoiceError) throw invoiceError

      for (const order of selectedOrders) {
        const { error: orderError } = await supabase
          .from('orders')
          .update({
            factory_cost: Number(costEdits[order.id] || 0),
            factory_cost_note: noteEdits[order.id]?.trim() || null,
            factory_cost_status: invoiceStatus,
            factory_invoice_id: invoiceId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id)
        if (orderError) throw orderError
      }

      toast.success(t('invoiceApproved'))
      setSelectedIds([])
      setReceiptFile(null)
      await load()
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('Approve invoice error:', err)
      toast.error(t('invoiceApproveFailed'))
    } finally {
      setApproving(false)
    }
  }

  async function uploadReceiptForInvoice(invoice: FactoryInvoice) {
    const file = invoiceReceiptFiles[invoice.id]
    if (!file || uploadingReceiptId) return

    setUploadingReceiptId(invoice.id)
    try {
      const receipt = await uploadReceipt(invoice.id, file)
      const { error } = await supabase
        .from('factory_invoices')
        .update({
          ...receipt,
          status: 'paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice.id)
      if (error) throw error

      await supabase
        .from('orders')
        .update({ factory_cost_status: 'paid', updated_at: new Date().toISOString() })
        .eq('factory_invoice_id', invoice.id)

      toast.success(t('orderUpdated'))
      setInvoiceReceiptFiles(current => ({ ...current, [invoice.id]: null }))
      await load()
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('Upload invoice receipt error:', err)
      toast.error(t('orderUpdateFailed'))
    } finally {
      setUploadingReceiptId('')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-stone-900">{t('factoryInvoices')}</h1>
        <p className="text-sm text-stone-500 mt-1">{locale === 'ar' ? 'مراجعة تكاليف المصانع واعتماد المدفوعات' : 'Review factory costs and approve payments'}</p>
      </div>

      <section className="rounded-2xl border border-stone-200/60 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 p-5">
          <div>
            <h2 className="font-bold text-stone-900">{t('pendingCosts')}</h2>
            <p className="text-sm text-stone-400">{t('selectedTotal')}: {formatCurrencySar(selectedTotal)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={factoryFilter}
              onChange={event => setFactoryFilter(event.target.value)}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">{t('allFactories')}</option>
              {factories.map(factory => (
                <option key={factory.id} value={factory.id}>{factory.name}</option>
              ))}
            </select>
            <input
              type="file"
              accept="application/pdf,.pdf,image/*"
              onChange={event => setReceiptFile(event.currentTarget.files?.[0] || null)}
              className="block max-w-56 text-xs text-stone-500 file:ml-2 file:rounded-lg file:border-0 file:bg-stone-700 file:px-3 file:py-2 file:text-xs file:text-white"
            />
            <button
              type="button"
              onClick={approveSelected}
              disabled={approving || selectedOrders.length === 0}
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:bg-brand-300"
            >
              {approving ? t('saving') : t('approveSelected')}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(3)].map((_, index) => <div key={index} className="h-16 skeleton rounded-xl" />)}
          </div>
        ) : visiblePendingOrders.length === 0 ? (
          <div className="p-8 text-center text-stone-400">
            <Package size={32} className="mx-auto mb-2 opacity-30" />
            {t('noPendingCosts')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-stone-50 text-xs font-semibold text-stone-500">
                  <th className="px-4 py-3 text-right"></th>
                  <th className="px-4 py-3 text-right">{t('internalOrderNumber')}</th>
                  <th className="px-4 py-3 text-right">{t('productType')}</th>
                  <th className="px-4 py-3 text-right">{t('executionType')}</th>
                  <th className="px-4 py-3 text-right">{t('factory')}</th>
                  <th className="px-4 py-3 text-right">{t('status')}</th>
                  <th className="px-4 py-3 text-right">{t('executionCost')}</th>
                  <th className="px-4 py-3 text-right">{t('costNote')}</th>
                  <th className="px-4 py-3 text-right">{t('createdAt')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {visiblePendingOrders.map(order => (
                  <tr key={order.id} className={order.status === 'completed' ? 'hover:bg-stone-50/70' : 'bg-amber-50/40 hover:bg-amber-50/70'}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(order.id)}
                        onChange={() => toggleOrder(order.id)}
                        className="h-4 w-4 rounded border-stone-300 text-brand-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${order.id}`} className="font-mono text-xs text-brand-600">
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-700">
                      <div className="flex items-center gap-2">
                        <span>{getProductTypeLabel(order.product_type, null, locale)}</span>
                        {order.is_urgent && <UrgentBadge size="sm" />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ExecutionTypeBadge executionType={order.execution_type} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-600">{order.factory?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={order.status} size="sm" />
                        <span className={`text-xs font-semibold ${order.status === 'completed' ? 'text-green-700' : 'text-amber-700'}`}>
                          {order.status === 'completed' ? t('readyForApproval') : t('costEnteredNotCompleted')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={costEdits[order.id] || ''}
                        onChange={event => setCostEdits(current => ({ ...current, [order.id]: event.target.value }))}
                        className="w-28 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm"
                        dir="ltr"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={noteEdits[order.id] || ''}
                        onChange={event => setNoteEdits(current => ({ ...current, [order.id]: event.target.value }))}
                        className="w-48 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-400">{formatDate(order.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-stone-200/60 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-stone-100 p-5">
          <ReceiptText size={18} className="text-stone-400" />
          <h2 className="font-bold text-stone-900">{t('approvedInvoices')}</h2>
        </div>
        {invoices.length === 0 ? (
          <div className="p-8 text-center text-stone-400">{t('noInvoices')}</div>
        ) : (
          <div className="divide-y divide-stone-50">
            {invoices.map(invoice => (
              <div key={invoice.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/admin/factory-invoices/${invoice.id}`} className="font-mono text-sm font-semibold text-brand-600 hover:text-brand-700">
                      {invoice.invoice_number}
                    </Link>
                    <p className="text-sm text-stone-500">{invoice.factory?.name || '—'} · {invoice.order_count} {t('orders')}</p>
                    <p className="text-xs text-stone-400">{formatDate(invoice.created_at)}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-stone-900">{formatCurrencySar(invoice.total_amount)}</p>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${invoice.status === 'paid' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                      {invoice.status === 'paid' ? t('paid') : t('approved')}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {invoice.receipt_url ? (
                    <a href={invoice.receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-600 hover:border-brand-200">
                      <FileDown size={13} />
                      {invoice.receipt_file_name || t('receipt')}
                    </a>
                  ) : (
                    <>
                      <input
                        type="file"
                        accept="application/pdf,.pdf,image/*"
                        onChange={event => setInvoiceReceiptFiles(current => ({ ...current, [invoice.id]: event.currentTarget.files?.[0] || null }))}
                        className="block max-w-56 text-xs text-stone-500 file:ml-2 file:rounded-lg file:border-0 file:bg-stone-700 file:px-3 file:py-1.5 file:text-xs file:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => uploadReceiptForInvoice(invoice)}
                        disabled={!invoiceReceiptFiles[invoice.id] || uploadingReceiptId === invoice.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white disabled:bg-brand-300"
                      >
                        <Upload size={13} />
                        {t('uploadReceipt')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
