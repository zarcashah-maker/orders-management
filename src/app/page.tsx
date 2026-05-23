'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function HomePage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (profile?.role === 'Admin') {
      router.replace('/admin')
    } else if (profile?.role === 'Factory') {
      router.replace('/factory')
    } else {
      router.replace('/login')
    }
  }, [user, profile, loading, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" style={{ borderWidth: '3px' }} />
        <p className="text-stone-500 font-cairo">جاري التحميل...</p>
      </div>
    </div>
  )
}
