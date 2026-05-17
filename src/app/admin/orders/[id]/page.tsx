'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Order, Factory, OrderStatus, AIChatMessage } from '@/types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate, formatDateTime } from '@/lib/utils'
import {
  ArrowRight, Sparkles, Send, ChevronDown,
  Package, Calendar, Hash, Building2
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'pending', label: 'قيد الانتظار' },
  { value: 'in_progress', label: 'جاري التنفيذ' },
  { value: 'review', label: 'تحت المراجعة' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'cancelled', label: 'ملغي' },
]

export default function OrderDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [messages, setMessages] = useState<AIChatMessage[]>([])
  const [input, setInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('orders')
        .select('*, factory:factories(*)')
        .eq('id', id)
        .single()
      setOrder(data)
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
    setUpdatingStatus(true)
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', order.id)
    if (error) {
      toast.error('فشل تحديث الحالة')
    } else {
      setOrder({ ...order, status: newStatus })
      toast.success('تم تحديث الحالة')
    }
    setUpdatingStatus(false)
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
            title: order.title,
            description: order.description,
            status: order.status,
            factory: (order.factory as unknown as Factory)?.name,
            quantity: order.quantity,
            due_date: order.due_date,
            notes: order.notes,
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

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      {/* Back */}
      <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors">
        <ArrowRight size={16} />
        العودة للطلبات
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
            </div>
            <h1 className="text-xl font-display font-bold text-stone-900">{order.title}</h1>
            {order.description && (
              <p className="text-stone-500 text-sm mt-1">{order.description}</p>
            )}
          </div>

          {/* Status changer */}
          <div className="relative">
            <label className="block text-xs text-stone-400 mb-1">تغيير الحالة</label>
            <div className="relative">
              <select
                value={order.status}
                onChange={e => updateStatus(e.target.value as OrderStatus)}
                disabled={updatingStatus}
                className="px-3 py-2 pl-7 bg-stone-50 border border-stone-200 rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-brand-400 appearance-none cursor-pointer
                  disabled:opacity-50"
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-stone-100">
          <div className="flex items-center gap-2">
            <Building2 size={15} className="text-stone-400" />
            <div>
              <p className="text-xs text-stone-400">المصنع</p>
              <p className="text-sm font-medium text-stone-700">{factory?.name || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Hash size={15} className="text-stone-400" />
            <div>
              <p className="text-xs text-stone-400">الكمية</p>
              <p className="text-sm font-medium text-stone-700">{order.quantity || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-stone-400" />
            <div>
              <p className="text-xs text-stone-400">تاريخ التسليم</p>
              <p className="text-sm font-medium text-stone-700">{formatDate(order.due_date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Package size={15} className="text-stone-400" />
            <div>
              <p className="text-xs text-stone-400">تاريخ الإنشاء</p>
              <p className="text-sm font-medium text-stone-700">{formatDateTime(order.created_at)}</p>
            </div>
          </div>
        </div>

        {order.notes && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
            <p className="text-xs font-semibold text-amber-700 mb-1">ملاحظات</p>
            <p className="text-sm text-amber-900">{order.notes}</p>
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
