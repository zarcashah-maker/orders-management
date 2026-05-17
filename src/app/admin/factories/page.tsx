'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Factory } from '@/types'
import { Building2, CheckCircle, XCircle, Package } from 'lucide-react'

export default function AdminFactoriesPage() {
  const [factories, setFactories] = useState<Factory[]>([])
  const [orderCounts, setOrderCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: f } = await supabase.from('factories').select('*').order('name')
      const { data: o } = await supabase.from('orders').select('factory_id')
      
      const counts: Record<string, number> = {}
      ;(o || []).forEach(order => {
        counts[order.factory_id] = (counts[order.factory_id] || 0) + 1
      })
      
      setFactories(f || [])
      setOrderCounts(counts)
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-stone-900">المصانع</h1>
        <p className="text-stone-500 text-sm mt-0.5">{factories.length} مصنع مسجل</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 skeleton rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {factories.map(factory => (
            <div key={factory.id} className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center">
                    <Building2 size={20} className="text-stone-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900">{factory.name}</h3>
                    {factory.description && (
                      <p className="text-xs text-stone-400 mt-0.5">{factory.description}</p>
                    )}
                  </div>
                </div>
                {factory.is_active ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
                    <CheckCircle size={12} />
                    نشط
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-red-500 bg-red-50 border border-red-200 px-2 py-1 rounded-full">
                    <XCircle size={12} />
                    غير نشط
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-stone-500 mt-3 pt-3 border-t border-stone-100">
                <Package size={14} />
                <span>{orderCounts[factory.id] || 0} طلب</span>
                {factory.contact_email && (
                  <>
                    <span className="mx-1 text-stone-300">•</span>
                    <span className="text-xs truncate">{factory.contact_email}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
