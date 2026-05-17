'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Order, OrderStatus } from '@/types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate, formatDateTime } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import {
  ArrowRight, Package, Calendar, Hash, MessageSquare
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function FactoryOrderDetail() {
  const { id } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const { profile } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .eq('factory_id', profile?.factory_id || '')
        .single()
      setOrder(data)
      setNotes(data?.notes || '')
      setLoading(false)
    }
    if (id && profile?.factory_id) load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, profile])

  async function updateNotes() {
    if (!order) return
    setSavingNotes(true)
    const { error } = await supabase
      .from('orders')
      .update({ notes, updated_at: new Date().toISOString() })
      .eq('id', order.id)
    if (error) toast.error('فشل الحفظ')
    else toast.success('تم حفظ الملاحظات')
    setSavingNotes(false)
  }

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 w-48 skeleton rounded-xl" />
      <div className="h-48 skeleton rounded-2xl" />
    </div>
  )

  if (!order) return (
    <div className="text-center py-20">
      <p className="text-stone-400">الطلب غير موجود</p>
      <Link href="/factory" className="text-brand-600 text-sm mt-2 inline-block">العودة</Link>
    </div>
  )

  return (
    <div className="space-y-5 animate-fade-in">
      <Link href="/factory" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors">
        <ArrowRight size={16} />
        العودة
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
            </div>
            <h1 className="font-bold text-stone-900">{order.title}</h1>
            {order.description && (
              <p className="text-sm text-stone-500 mt-1">{order.description}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-stone-100">
          <div className="flex items-center gap-2">
            <Hash size={14} className="text-stone-400" />
            <div>
              <p className="text-xs text-stone-400">الكمية</p>
              <p className="text-sm font-medium">{order.quantity || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-stone-400" />
            <div>
              <p className="text-xs text-stone-400">تاريخ التسليم</p>
              <p className="text-sm font-medium">{formatDate(order.due_date)}</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-stone-400 mt-4">
          أنشئ في {formatDateTime(order.created_at)}
        </p>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare size={16} className="text-stone-400" />
          <h2 className="font-bold text-stone-900 text-sm">ملاحظاتك</h2>
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={4}
          placeholder="أضف ملاحظاتك أو تحديثاتك هنا..."
          className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm resize-none
            focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
        />
        <button
          onClick={updateNotes}
          disabled={savingNotes}
          className="mt-3 px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300
            text-white text-sm font-medium rounded-xl transition-all"
        >
          {savingNotes ? 'جاري الحفظ...' : 'حفظ الملاحظات'}
        </button>
      </div>
    </div>
  )
}
