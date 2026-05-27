'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Factory } from '@/types'
import { Building2, CheckCircle, XCircle, Package, Plus, Pencil, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePreferences } from '@/lib/i18n'

type FactoryForm = {
  name: string
  contact_person: string
  email: string
  phone: string
  is_active: boolean
}

const emptyForm: FactoryForm = {
  name: '',
  contact_person: '',
  email: '',
  phone: '',
  is_active: true,
}

export default function AdminFactoriesPage() {
  const [factories, setFactories] = useState<Factory[]>([])
  const [orderCounts, setOrderCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [editingFactory, setEditingFactory] = useState<Factory | null>(null)
  const [form, setForm] = useState<FactoryForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const { locale, t } = usePreferences()

  async function load() {
    const { data: f } = await supabase.from('factories').select('*').order('name')
    const { data: o } = await supabase.from('orders').select('assigned_factory_id')

    const counts: Record<string, number> = {}
    ;(o || []).forEach(order => {
      counts[order.assigned_factory_id] = (counts[order.assigned_factory_id] || 0) + 1
    })

    setFactories(f || [])
    setOrderCounts(counts)
    setLoading(false)
  }

  useEffect(() => {
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function startCreate() {
    setEditingFactory(null)
    setForm(emptyForm)
  }

  function startEdit(factory: Factory) {
    setEditingFactory(factory)
    setForm({
      name: factory.name,
      contact_person: factory.contact_person || '',
      email: factory.email || '',
      phone: factory.phone || '',
      is_active: factory.is_active,
    })
  }

  async function saveFactory(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error(locale === 'ar' ? 'اسم المصنع مطلوب' : 'Factory name is required')
      return
    }

    setSaving(true)
    const payload = {
      name: form.name.trim(),
      contact_person: form.contact_person.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      is_active: form.is_active,
    }

    const { error } = editingFactory
      ? await supabase.from('factories').update(payload).eq('id', editingFactory.id)
      : await supabase.from('factories').insert({ id: crypto.randomUUID(), ...payload })

    setSaving(false)
    if (error) {
      toast.error(locale === 'ar' ? 'تعذر حفظ المصنع' : 'Could not save factory')
      return
    }

    toast.success(editingFactory ? (locale === 'ar' ? 'تم تحديث المصنع' : 'Factory updated') : (locale === 'ar' ? 'تمت إضافة المصنع' : 'Factory added'))
    setEditingFactory(null)
    setForm(emptyForm)
    load()
  }

  async function deleteFactory(factory: Factory) {
    if (!window.confirm(locale === 'ar' ? 'هل أنت متأكد من حذف هذا المصنع؟' : 'Are you sure you want to delete this factory?')) return
    const count = orderCounts[factory.id] || 0
    const { error } = count > 0
      ? await supabase.from('factories').update({ is_active: false }).eq('id', factory.id)
      : await supabase.from('factories').delete().eq('id', factory.id)

    if (error) {
      toast.error(locale === 'ar' ? 'تعذر حذف المصنع' : 'Could not delete factory')
      return
    }

    toast.success(count > 0 ? (locale === 'ar' ? 'تم تعطيل المصنع لوجود طلبات مرتبطة' : 'Factory was deactivated because it has linked orders') : (locale === 'ar' ? 'تم حذف المصنع' : 'Factory deleted'))
    load()
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-stone-900">{t('factories')}</h1>
          <p className="text-stone-500 text-sm mt-0.5">{factories.length} {locale === 'ar' ? 'مصنع مسجل' : 'registered factories'}</p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition-all"
        >
          <Plus size={16} />
          {t('newFactory')}
        </button>
      </div>

      <form onSubmit={saveFactory} className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-5 grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2 flex items-center justify-between">
          <h2 className="font-bold text-stone-900">{editingFactory ? t('editFactory') : t('addFactory')}</h2>
          {editingFactory && (
            <button type="button" onClick={startCreate} className="text-stone-400 hover:text-stone-700">
              <X size={18} />
            </button>
          )}
        </div>
        <input
          value={form.name}
          onChange={e => setForm(current => ({ ...current, name: e.target.value }))}
          placeholder={t('factoryName')}
          className="px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
        <input
          value={form.phone}
          onChange={e => setForm(current => ({ ...current, phone: e.target.value }))}
          placeholder={t('contactPhone')}
          dir="ltr"
          className="px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
        <input
          value={form.email}
          onChange={e => setForm(current => ({ ...current, email: e.target.value }))}
          placeholder={t('email')}
          dir="ltr"
          className="px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
        <label className="flex items-center gap-2 px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-700">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={e => setForm(current => ({ ...current, is_active: e.target.checked }))}
            className="rounded border-stone-300 text-brand-500"
          />
          {t('active')}
        </label>
        <textarea
          value={form.contact_person}
          onChange={e => setForm(current => ({ ...current, contact_person: e.target.value }))}
          placeholder={t('contactPerson')}
          rows={2}
          className="md:col-span-2 px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
        <button
          type="submit"
          disabled={saving}
          className="md:col-span-2 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white text-sm font-semibold rounded-xl transition-all"
        >
          {saving ? t('saving') : editingFactory ? t('saveChanges') : t('addFactory')}
        </button>
      </form>

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
                    {factory.contact_person && (
                      <p className="text-xs text-stone-400 mt-0.5">{factory.contact_person}</p>
                    )}
                  </div>
                </div>
                {factory.is_active ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
                    <CheckCircle size={12} />
                    {t('active')}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-red-500 bg-red-50 border border-red-200 px-2 py-1 rounded-full">
                    <XCircle size={12} />
                    {t('inactive')}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-stone-500 mt-3 pt-3 border-t border-stone-100">
                <Package size={14} />
                <span>{orderCounts[factory.id] || 0} {locale === 'ar' ? 'طلب' : 'orders'}</span>
                {factory.email && (
                  <>
                    <span className="mx-1 text-stone-300">•</span>
                    <span className="text-xs truncate">{factory.email}</span>
                  </>
                )}
                <div className="mr-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(factory)}
                    className="w-8 h-8 rounded-lg hover:bg-stone-100 text-stone-500 inline-flex items-center justify-center"
                    title={t('edit')}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteFactory(factory)}
                    className="w-8 h-8 rounded-lg hover:bg-red-50 text-red-500 inline-flex items-center justify-center"
                    title={t('delete')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
