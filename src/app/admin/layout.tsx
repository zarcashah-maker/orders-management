'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/shared/Navbar'
import {
  LayoutDashboard,
  Package,
  Factory,
  ChevronLeft,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/admin', label: 'الرئيسية', icon: LayoutDashboard, exact: true },
  { href: '/admin/orders', label: 'الطلبات', icon: Package, exact: false },
  { href: '/admin/factories', label: 'المصانع', icon: Factory, exact: false },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'admin')) {
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

  if (!user || profile?.role !== 'admin') return null

  return (
    <div className="min-h-screen bg-stone-50" dir="rtl">
      <Navbar title="لوحة الإدارة" />

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 min-h-[calc(100vh-56px)] bg-white border-l border-stone-200 fixed top-14 right-0 hidden md:block">
          <nav className="p-3 space-y-1">
            {navItems.map(item => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href) && !(item.exact && pathname !== item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                    isActive
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                      : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                  )}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                  {!isActive && <ChevronLeft size={14} className="mr-auto opacity-40" />}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 md:mr-56 p-4 sm:p-6">
          {/* Mobile nav */}
          <div className="md:hidden flex gap-2 mb-4 overflow-x-auto pb-1">
            {navItems.map(item => {
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
                    isActive
                      ? 'bg-brand-500 text-white'
                      : 'bg-white text-stone-600 border border-stone-200'
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
    </div>
  )
}
