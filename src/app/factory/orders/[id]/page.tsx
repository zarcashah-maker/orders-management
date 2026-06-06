'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Order, OrderStatus } from '@/types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { UrgentBadge } from '@/components/shared/UrgentBadge'
import { formatCurrencySar, formatDate, formatDateTime } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { getDetailEntries, getFactoryOrderType, getOrderStatusOptions, isImageAttachment } from '@/lib/orders'
import {
  ArrowRight, Package, Calendar, Hash, MessageSquare, FileDown, ChevronDown, Image as ImageIcon
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { usePreferences } from '@/lib/i18n'

export default function FactoryOrderDetail() {
  const { id } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [savingCost, setSavingCost] = useState(false)
  const [factoryCost, setFactoryCost] = useState('')
  const [factoryCostNote, setFactoryCostNote] = useState('')
  const { profile } = useAuth()
  const { locale, t } = usePreferences()
  const supabase = createClient()
  const statusOptions = getOrderStatusOptions(locale)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('orders')
        .select('*, images:order_images(*), attachments(*)')
        .eq('id', id)
        .eq('assigned_factory_id', profile?.factory_id || '')
      .single()
      setOrder(data)
      setFactoryCost(data?.factory_cost ? String(data.factory_cost) : '')
      setFactoryCostNote(data?.factory_cost_note || '')
      setLoading(false)
    }
    if (id && profile?.factory_id) load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, profile])

  async function updateStatus(newStatus: OrderStatus) {
    if (!order) return
    const oldStatus = order.status
    setUpdatingStatus(true)
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', order.id)
      .eq('assigned_factory_id', profile?.factory_id || '')

    if (error) {
      toast.error(locale === 'ar' ? 'فشل تحديث الحالة' : 'Could not update status')
    } else {
      await supabase.from('order_status_history').insert({
        id: crypto.randomUUID(),
        order_id: order.id,
        old_status: oldStatus,
        new_status: newStatus,
        changed_by: profile?.id || null,
      })
      setOrder({ ...order, status: newStatus })
      toast.success(locale === 'ar' ? 'تم تحديث الحالة' : 'Status updated')
    }
    setUpdatingStatus(false)
  }

  async function saveFactoryCost() {
    if (!order) return
    const hasSavedCost = order.factory_cost !== null && order.factory_cost !== undefined
    const isCostInvoiced = Boolean(order.factory_invoice_id) || order.factory_cost_status === 'approved' || order.factory_cost_status === 'paid'
    if (isCostInvoiced) return

    const parsedCost = hasSavedCost ? order.factory_cost : Number(factoryCost)
    if (!hasSavedCost && (!Number.isFinite(parsedCost) || parsedCost < 0)) {
      toast.error(locale === 'ar' ? 'يرجى إدخال تكلفة صحيحة' : 'Please enter a valid cost')
      return
    }

    const payload = hasSavedCost
      ? {
          factory_cost_note: factoryCostNote.trim() || null,
          updated_at: new Date().toISOString(),
        }
      : {
          factory_cost: parsedCost,
          factory_cost_note: factoryCostNote.trim() || null,
          factory_cost_status: 'pending',
          updated_at: new Date().toISOString(),
        }

    setSavingCost(true)
    const { error } = await supabase
      .from('orders')
      .update(payload)
      .eq('id', order.id)
      .eq('assigned_factory_id', profile?.factory_id || '')
      .eq('factory_cost_status', 'pending')
      .is('factory_invoice_id', null)

    if (error) {
      toast.error(t('costSaveFailed'))
    } else {
      setOrder({ ...order, factory_cost: parsedCost, factory_cost_note: factoryCostNote.trim() || null, factory_cost_status: 'pending' })
      toast.success(hasSavedCost ? t('noteSaved') : t('costSaved'))
    }
    setSavingCost(false)
  }

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 w-48 skeleton rounded-xl" />
      <div className="h-48 skeleton rounded-2xl" />
    </div>
  )

  if (!order) return (
    <div className="text-center py-20">
      <p className="text-stone-400">{locale === 'ar' ? 'الطلب غير موجود' : 'Order not found'}</p>
      <Link href="/factory" className="text-brand-600 text-sm mt-2 inline-block">{locale === 'ar' ? 'العودة' : 'Back'}</Link>
    </div>
  )

  const detailEntries = getDetailEntries(order.product_type, order.details, locale)
  const imageAttachments = (order.attachments || []).filter(isImageAttachment)
  const otherAttachments = (order.attachments || []).filter(attachment => !isImageAttachment(attachment))
  const hasFactoryCost = order.factory_cost !== null && order.factory_cost !== undefined
  const isCostInvoiced = Boolean(order.factory_invoice_id) || order.factory_cost_status === 'approved' || order.factory_cost_status === 'paid'
  const canEditCostAmount = !hasFactoryCost && !isCostInvoiced
  const canEditCostNote = !isCostInvoiced

  return (
    <div className="space-y-5 animate-fade-in">
      <Link href="/factory" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors">
        <ArrowRight size={16} />
        {locale === 'ar' ? 'العودة' : 'Back'}
      </Link>

      {/* Order card */}
      <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Package size={20} className="text-brand-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-mono text-xs text-stone-400">{order.order_number}</span>
              <StatusBadge status={order.status as OrderStatus} />
              {order.is_urgent && <UrgentBadge />}
            </div>
            <h1 className="font-bold text-stone-900">{getFactoryOrderType(order.product_type, undefined, locale)}</h1>
          </div>
        </div>

        {order.status === 'rework' && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl text-sm font-medium text-orange-800">
            {t('returnedNotice')}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-stone-100">
          <div className="flex items-center gap-2">
            <Hash size={14} className="text-stone-400" />
            <div>
              <p className="text-xs text-stone-400">{t('quantity')}</p>
              <p className="text-sm font-medium">{order.quantity || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-stone-400" />
            <div>
              <p className="text-xs text-stone-400">{t('dueDate')}</p>
              <p className="text-sm font-medium">{formatDate(order.due_date)}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-stone-100">
          <label className="block text-xs text-stone-400 mb-1">{t('status')}</label>
          <div className="relative inline-block">
            <select
              value={order.status}
              onChange={e => updateStatus(e.target.value as OrderStatus)}
              disabled={updatingStatus}
              className="px-3 py-2 pl-7 bg-stone-50 border border-stone-200 rounded-xl text-sm
                focus:outline-none focus:ring-2 focus:ring-brand-400 appearance-none cursor-pointer disabled:opacity-50"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          </div>
        </div>

        {detailEntries.length > 0 && (
          <div className="mt-4 pt-4 border-t border-stone-100">
            <p className="text-sm font-bold text-stone-900 mb-3">{t('details')}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {detailEntries.map(detail => (
                <div key={detail.key} className="rounded-xl bg-stone-50 border border-stone-100 p-3">
                  <p className="text-xs text-stone-400">{detail.label}</p>
                  <p className="text-sm font-medium text-stone-800 mt-1">{detail.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-stone-400 mt-4">
          {t('createdAt')}: {formatDateTime(order.created_at)}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-5">
        <h2 className="font-bold text-stone-900 text-sm mb-3">{t('executionCost')}</h2>
        {isCostInvoiced && (
          <div className="mb-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700">
            {t('factoryCostApprovedInInvoice')}: {formatCurrencySar(order.factory_cost)}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-stone-400 mb-1">{t('executionCost')}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={factoryCost}
              onChange={e => setFactoryCost(e.target.value)}
              disabled={!canEditCostAmount || savingCost}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-60"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-400 mb-1">{t('costNote')}</label>
            <input
              type="text"
              value={factoryCostNote}
              onChange={e => setFactoryCostNote(e.target.value)}
              disabled={!canEditCostNote || savingCost}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-60"
            />
          </div>
        </div>
        {hasFactoryCost && !isCostInvoiced && (
          <p className="mt-2 text-xs text-stone-400">
            {locale === 'ar' ? 'تم حفظ مبلغ التكلفة. يمكن تعديل الملاحظة فقط حتى اعتماد الفاتورة.' : 'The cost amount has been saved. Only the note can be edited until invoicing.'}
          </p>
        )}
        {!isCostInvoiced && (
          <button
            type="button"
            onClick={saveFactoryCost}
            disabled={savingCost}
            className="mt-3 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:bg-brand-300"
          >
            {savingCost ? t('saving') : hasFactoryCost ? t('saveNote') : t('saveCost')}
          </button>
        )}
      </div>

      {/* Notes */}
      <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare size={16} className="text-stone-400" />
          <h2 className="font-bold text-stone-900 text-sm">{t('notes')}</h2>
        </div>
        <p className="text-sm text-stone-600 whitespace-pre-wrap">{order.general_notes || (locale === 'ar' ? 'لا توجد ملاحظات' : 'No notes')}</p>
      </div>

      {/* Attachments */}
      <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileDown size={16} className="text-stone-400" />
          <h2 className="font-bold text-stone-900 text-sm">{t('attachments')}</h2>
        </div>

        {imageAttachments.length === 0 && otherAttachments.length === 0 ? (
          <p className="text-sm text-stone-400">{t('noAttachments')}</p>
        ) : (
          <div className="space-y-4">
            {imageAttachments.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {imageAttachments.map(attachment => (
                  <a
                    key={attachment.id}
                    href={attachment.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="group block rounded-2xl overflow-hidden border border-stone-200 bg-stone-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={attachment.file_url} alt={attachment.file_name} className="h-32 w-full object-cover group-hover:scale-[1.02] transition-transform" />
                    <div className="p-2 flex items-center gap-2 text-xs text-stone-500">
                      <ImageIcon size={13} />
                      <span className="truncate">{attachment.file_name}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {otherAttachments.length > 0 && (
              <div className="space-y-2">
                {otherAttachments.map(attachment => (
                  <a
                    key={attachment.id}
                    href={attachment.file_url}
                    target="_blank"
                    rel="noreferrer"
                    download={attachment.file_name}
                    className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700 hover:border-brand-200 hover:bg-brand-50/40"
                  >
                    <span className="truncate">{attachment.file_name}</span>
                    <FileDown size={16} className="text-stone-400 flex-shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
