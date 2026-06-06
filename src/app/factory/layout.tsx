'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/shared/Navbar'
import { Package, ReceiptText } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { usePreferences } from '@/lib/i18n'

export default function FactoryLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { dir, t } = usePreferences()
  const navItems = [
    { href: '/factory', label: t('orders'), icon: Package, exact: true },
    { href: '/factory/invoices', label: t('myInvoices'), icon: ReceiptText, exact: false },
  ]

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
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {navItems.map(item => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-all',
                  isActive ? 'bg-brand-500 text-white' : 'bg-white text-stone-600 border border-stone-200'
                )}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            )
          })}
        </div>
        {children}
      </main>
    </div>
  )
}
