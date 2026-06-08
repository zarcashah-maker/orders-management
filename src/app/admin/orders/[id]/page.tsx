'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Order, Factory, OrderStatus, AIChatMessage } from '@/types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { UrgentBadge } from '@/components/shared/UrgentBadge'
import { ExecutionTypeBadge } from '@/components/shared/ExecutionTypeBadge'
import { DesignLink } from '@/components/shared/DesignLink'
import { formatCurrencySar, formatDate, formatDateTime } from '@/lib/utils'
import { getDetailEntries, getOrderStatusOptions, getProductTypeLabel, isImageAttachment } from '@/lib/orders'
import {
  ArrowRight, Sparkles, Send, ChevronDown,
  Package, Calendar, Hash, Building2, FileDown, Image as ImageIcon, Phone, Edit
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { usePreferences } from '@/lib/i18n'

export default function OrderDetailPage() {
  const { id } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [updatingUrgency, setUpdatingUrgency] = useState(false)
  const [savingCost, setSavingCost] = useState(false)
  const [factoryCost, setFactoryCost] = useState('')
  const [factoryCostNote, setFactoryCostNote] = useState('')
  const [messages, setMessages] = useState<AIChatMessage[]>([])
  const [input, setInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const { profile } = useAuth()
  const { locale, t } = usePreferences()
  const supabase = createClient()
  const statusOptions = getOrderStatusOptions(locale)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('orders')
        .select('*, factory:factories(*), images:order_images(*), attachments(*)')
        .eq('id', id)
        .single()
      setOrder(data)
      setFactoryCost(data?.factory_cost ? String(data.factory_cost) : '')
      setFactoryCostNote(data?.factory_cost_note || '')
      setLoading(false)
    }
    if (id) load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages])

  async function updateStatus(newStatus: OrderStatus) {
    if (!order) return
    const oldStatus = order.status
    setUpdatingStatus(true)
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', order.id)
    if (error) {
      toast.error('فشل تحديث الحالة')
    } else {
      await supabase.from('order_status_history').insert({
        id: crypto.randomUUID(),
        order_id: order.id,
        old_status: oldStatus,
        new_status: newStatus,
        changed_by: profile?.id || null,
      })
      setOrder({ ...order, status: newStatus })
      toast.success('تم تحديث الحالة')
    }
    setUpdatingStatus(false)
  }

  async function updateUrgency(isUrgent: boolean) {
    if (!order) return
    setUpdatingUrgency(true)
    const { error } = await supabase
      .from('orders')
      .update({ is_urgent: isUrgent, updated_at: new Date().toISOString() })
      .eq('id', order.id)

    if (error) {
      toast.error(t('urgentOrderUpdateFailed'))
    } else {
      setOrder({ ...order, is_urgent: isUrgent })
      toast.success(t('urgentOrderUpdated'))
    }
    setUpdatingUrgency(false)
  }

  async function saveFactoryCost() {
    if (!order) return
    const parsedCost = factoryCost.trim() === '' ? null : Number(factoryCost)
    if (parsedCost !== null && (!Number.isFinite(parsedCost) || parsedCost < 0)) {
      toast.error(locale === 'ar' ? 'يرجى إدخال تكلفة صحيحة' : 'Please enter a valid cost')
      return
    }

    setSavingCost(true)
    const { error } = await supabase
      .from('orders')
      .update({
        factory_cost: parsedCost,
        factory_cost_note: factoryCostNote.trim() || null,
        factory_cost_status: parsedCost === null ? 'pending' : order.factory_cost_status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    if (error) {
      toast.error(t('costSaveFailed'))
    } else {
      setOrder({ ...order, factory_cost: parsedCost, factory_cost_note: factoryCostNote.trim() || null })
      toast.success(t('costSaved'))
    }
    setSavingCost(false)
  }

  async function sendMessage() {
    if (!input.trim() || !order) return
    const userMsg: AIChatMessage = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setAiLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          orderContext: {
            order_number: order.order_number,
            product_type: order.product_type,
            status: order.status,
            factory: (order.factory as unknown as Factory)?.name,
            details: order.details,
            design_url: order.design_url,
            quantity: order.quantity,
            due_date: order.due_date,
            notes: order.general_notes,
            created_at: order.created_at,
          },
        }),
      })
      const data = await res.json()
      setMessages([...newMessages, { role: 'assistant', content: data.reply }])
    } catch {
      toast.error('تعذر الاتصال بالذكاء الاصطناعي')
    } finally {
      setAiLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 skeleton rounded-xl" />
        <div className="h-64 skeleton rounded-2xl" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="text-stone-500">الطلب غير موجود</p>
        <Link href="/admin/orders" className="text-brand-600 text-sm mt-2 inline-block">العودة للطلبات</Link>
      </div>
    )
  }

  const factory = order.factory as unknown as Factory
  const detailEntries = getDetailEntries(order.product_type, order.details, locale)
  const imageAttachments = (order.attachments || []).filter(isImageAttachment)
  const otherAttachments = (order.attachments || []).filter(attachment => !isImageAttachment(attachment))

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      {/* Back */}
      <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors">
        <ArrowRight size={16} />
        {t('orders')}
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-lg">
                {order.order_number}
              </span>
              <StatusBadge status={order.status} />
              <ExecutionTypeBadge executionType={order.execution_type} />
              {order.is_urgent && <UrgentBadge />}
            </div>
            <h1 className="text-xl font-display font-bold text-stone-900">{getProductTypeLabel(order.product_type, null, locale)}</h1>
          </div>

          {/* Status changer */}
          <div className="flex flex-wrap items-end gap-3">
            {profile?.role === 'Admin' && (
              <Link
                href={`/admin/orders/${order.id}/edit`}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600"
              >
                <Edit size={15} />
                {t('edit')}
              </Link>
            )}
            <div className="relative">
              <label className="block text-xs text-stone-400 mb-1">{t('status')}</label>
              <div className="relative">
                <select
                  value={order.status}
                  onChange={e => updateStatus(e.target.value as OrderStatus)}
                  disabled={updatingStatus}
                  className="px-3 py-2 pl-7 bg-stone-50 border border-stone-200 rounded-xl text-sm
                    focus:outline-none focus:ring-2 focus:ring-brand-400 appearance-none cursor-pointer
                    disabled:opacity-50"
                >
                  {statusOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              </div>
            </div>
            <label className="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              <input
                type="checkbox"
                checked={Boolean(order.is_urgent)}
                onChange={e => updateUrgency(e.target.checked)}
                disabled={updatingUrgency}
                className="h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-400 disabled:opacity-40"
              />
              {t('urgentOrder')}
            </label>
          </div>
        </div>

        {/* Meta */}
        {order.status === 'rework' && (
          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-xl text-sm font-medium text-orange-800">
            {t('returnedNotice')}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-stone-100">
          <div className="flex items-center gap-2">
            <Building2 size={15} className="text-stone-400" />
            <div>
              <p className="text-xs text-stone-400">{t('factory')}</p>
              <p className="text-sm font-medium text-stone-700">{factory?.name || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Package size={15} className="text-stone-400" />
            <div>
              <p className="text-xs text-stone-400">{t('executionType')}</p>
              <div className="mt-1">
                <ExecutionTypeBadge executionType={order.execution_type} size="sm" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Hash size={15} className="text-stone-400" />
            <div>
              <p className="text-xs text-stone-400">{t('quantity')}</p>
              <p className="text-sm font-medium text-stone-700">{order.quantity || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-stone-400" />
            <div>
              <p className="text-xs text-stone-400">{t('dueDate')}</p>
              <p className="text-sm font-medium text-stone-700">{formatDate(order.due_date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Package size={15} className="text-stone-400" />
            <div>
              <p className="text-xs text-stone-400">{t('createdAt')}</p>
              <p className="text-sm font-medium text-stone-700">{formatDateTime(order.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Phone size={15} className="text-stone-400" />
            <div>
              <p className="text-xs text-stone-400">{t('customerPhone')}</p>
              <p className="text-sm font-medium text-stone-700" dir="ltr">{order.customer_phone || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Hash size={15} className="text-stone-400" />
            <div>
              <p className="text-xs text-stone-400">{t('sallaOrderNumber')}</p>
              <p className="text-sm font-medium text-stone-700" dir="ltr">{order.salla_order_number || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FileDown size={15} className="text-stone-400" />
            <div>
              <p className="text-xs text-stone-400">{t('designLink')}</p>
              <div className="mt-1">
                <DesignLink url={order.design_url} />
              </div>
            </div>
          </div>
        </div>

        {detailEntries.length > 0 && (
          <div className="mt-5 pt-5 border-t border-stone-100">
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

        <div className="mt-5 pt-5 border-t border-stone-100">
          <p className="text-sm font-bold text-stone-900 mb-3">{t('executionCost')}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-stone-400 mb-1">{t('executionCost')}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={factoryCost}
                onChange={e => setFactoryCost(e.target.value)}
                disabled={savingCost}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-60"
                dir="ltr"
              />
              <p className="mt-1 text-xs text-stone-400">{formatCurrencySar(order.factory_cost)}</p>
            </div>
            <div>
              <label className="block text-xs text-stone-400 mb-1">{t('costNote')}</label>
              <input
                type="text"
                value={factoryCostNote}
                onChange={e => setFactoryCostNote(e.target.value)}
                disabled={savingCost}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-60"
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={saveFactoryCost}
              disabled={savingCost}
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:bg-brand-300"
            >
              {savingCost ? t('saving') : t('saveCost')}
            </button>
            <span className="text-xs font-medium text-stone-400">
              {order.factory_cost_status === 'paid' ? t('paid') : order.factory_cost_status === 'approved' ? t('approved') : t('pendingCosts')}
            </span>
          </div>
        </div>

        {order.general_notes && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
            <p className="text-xs font-semibold text-amber-700 mb-1">{t('notes')}</p>
            <p className="text-sm text-amber-900">{order.general_notes}</p>
          </div>
        )}
      </div>

      {/* Attachments */}
      <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileDown size={17} className="text-stone-400" />
          <h2 className="font-bold text-stone-900">{t('attachments')}</h2>
        </div>

        {imageAttachments.length === 0 && otherAttachments.length === 0 ? (
          <p className="text-sm text-stone-400">{t('noAttachments')}</p>
        ) : (
          <div className="space-y-4">
            {imageAttachments.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {imageAttachments.map(attachment => (
                  <a
                    key={attachment.id}
                    href={attachment.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="group block rounded-2xl overflow-hidden border border-stone-200 bg-stone-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={attachment.file_url} alt={attachment.file_name} className="h-36 w-full object-cover group-hover:scale-[1.02] transition-transform" />
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

      {/* AI Assistant */}
      <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden">
        {/* Chat header */}
        <div className="flex items-center gap-3 p-4 border-b border-stone-100 bg-gradient-to-r from-stone-50 to-white">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center shadow-md shadow-brand-500/25">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-stone-900">مساعد الذكاء الاصطناعي</p>
            <p className="text-xs text-stone-400">اسألني عن هذا الطلب أو اطلب مساعدة</p>
          </div>
        </div>

        {/* Messages */}
        <div ref={chatRef} className="h-64 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center">
              <div>
                <Sparkles size={24} className="mx-auto text-stone-200 mb-2" />
                <p className="text-sm text-stone-400">ابدأ المحادثة...</p>
                <p className="text-xs text-stone-300 mt-1">يمكنك سؤالي عن الطلب أو طلب تلخيصه</p>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-stone-100 text-stone-800'
                      : 'bg-brand-500 text-white'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {aiLoading && (
            <div className="flex justify-end">
              <div className="bg-brand-500 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-stone-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="اكتب سؤالك هنا..."
              className="flex-1 px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm
                focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || aiLoading}
              className="w-10 h-10 bg-brand-500 hover:bg-brand-600 disabled:bg-stone-200
                text-white rounded-xl flex items-center justify-center transition-all"
            >
              <Send size={16} />
            </button>
          </div>

          {/* Quick prompts */}
          <div className="flex gap-2 mt-2 flex-wrap">
            {['لخص هذا الطلب', 'ما هي الخطوات التالية؟', 'هل يوجد مشاكل محتملة؟'].map(prompt => (
              <button
                key={prompt}
                onClick={() => { setInput(prompt); }}
                className="text-xs px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-full transition-all"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
