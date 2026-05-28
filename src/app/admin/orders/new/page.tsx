'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Factory } from '@/types'
import { AddOrderForm } from '@/components/admin/AddOrderForm'
import { usePreferences } from '@/lib/i18n'

export default function NewOrderPage() {
  const [factories, setFactories] = useState<Factory[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  const { t, locale } = usePreferences()
  const allowOrdersNavigationRef = useRef(false)

  function logNavigation(message: string, data?: Record<string, unknown>) {
    if (process.env.NODE_ENV === 'development') {
      console.info(`[add-order-nav] ${message}`, data || {})
    }
  }

  useEffect(() => {
    logNavigation('/admin/orders/new mounted', {
      path: window.location.pathname,
      href: window.location.href,
    })

    const guardState = {
      ...(window.history.state || {}),
      addOrderGuard: true,
    }

    window.history.replaceState(guardState, '', '/admin/orders/new')
    window.history.pushState({ ...guardState, addOrderGuardDuplicate: true }, '', '/admin/orders/new')

    function handlePopState(event: PopStateEvent) {
      if (allowOrdersNavigationRef.current) {
        logNavigation('allowed popstate navigation', { state: event.state })
        return
      }

      logNavigation('blocked unexpected popstate while adding order', {
        state: event.state,
        path: window.location.pathname,
      })
      event.stopImmediatePropagation()
      window.history.pushState({ ...guardState, addOrderGuardRecovered: true }, '', '/admin/orders/new')
      router.replace('/admin/orders/new')
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      logNavigation('/admin/orders/new unmounted', {
        allowed: allowOrdersNavigationRef.current,
        path: window.location.pathname,
      })
      window.removeEventListener('popstate', handlePopState)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  useEffect(() => {
    supabase
      .from('factories')
      .select('*')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        setFactories(data || [])
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function goBackToOrders(reason: 'cancel' | 'created') {
    allowOrdersNavigationRef.current = true
    logNavigation(`before router.push('/admin/orders')`, { reason })
    router.push('/admin/orders')
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 skeleton rounded-xl" />
        <div className="h-96 skeleton rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-stone-900">{t('newOrder')}</h1>
          <p className="text-sm text-stone-500">
            {locale === 'ar' ? 'إضافة طلب جديد من صفحة مستقلة' : 'Create a new order from a standalone page'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => goBackToOrders('cancel')}
          className="rounded-xl bg-stone-100 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-200"
        >
          {t('cancel')}
        </button>
      </div>

      <AddOrderForm
        factories={factories}
        onCancel={() => goBackToOrders('cancel')}
        onCreated={() => goBackToOrders('created')}
        variant="page"
      />
    </div>
  )
}
