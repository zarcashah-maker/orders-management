'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/shared/Navbar'
import { usePreferences } from '@/lib/i18n'

export default function FactoryLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const { dir, t } = usePreferences()

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'Factory')) {
      router.replace('/login')
    }
  }, [user, profile, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-8 h-8 border-[3px] border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || profile?.role !== 'Factory') return null

  return (
    <div className="min-h-screen bg-stone-50" dir={dir}>
      <Navbar title={t('factoryPortal')} />
      <main className="max-w-2xl mx-auto p-4 sm:p-6">
        {children}
      </main>
    </div>
  )
}
