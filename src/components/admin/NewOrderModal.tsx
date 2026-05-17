'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Factory } from '@/types'
import { generateOrderNumber } from '@/lib/utils'
import { X, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'

interface Props {
  factories: Factory[]
  onClose: () => void
  onCreated: () => void
}

export function NewOrderModal({ factories, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [factoryId, setFactoryId] = useState(factories[0]?.id || '')
  const [quantity, setQuantity] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const { user } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title || !factoryId) {
      toast.error('يرجى إدخال العنوان واختيار المصنع')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('orders').insert({
        order_number: generateOrderNumber(),
        title: title.trim(),
        description: description.trim() || null,
        factory_id: factoryId,
        quantity: quantity ? parseInt(quantity) : null,
        due_date: dueDate || null,
        status: 'pending',
        created_by: user!.id,
      })
      if (error) throw error
      toast.success('تم إنشاء الطلب بنجاح')
      onCreated()
    } catch {
      toast.error('حدث خطأ أثناء الإنشاء')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
              <Package size={18} className="text-white" />
            </div>
            <h2 className="font-bold text-stone-900">طلب جديد</h2>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">عنوان الطلب *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="مثال: طباعة تيشيرت موسم الصيف"
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm
                focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
            />
          </div>

          {/* Factory */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">المصنع *</label>
            <select
              value={factoryId}
              onChange={e => setFactoryId(e.target.value)}
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm
                focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent appearance-none"
            >
              {factories.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">الوصف</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="تفاصيل إضافية عن الطلب..."
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm resize-none
                focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
            />
          </div>

          {/* Quantity + Due date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">الكمية</label>
              <input
                type="number"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="0"
                min="1"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">تاريخ التسليم</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                dir="ltr"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium rounded-xl transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300
                text-white text-sm font-semibold rounded-xl transition-all"
            >
              {saving ? 'جاري الإنشاء...' : 'إنشاء الطلب'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
