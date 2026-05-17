'use client'

import { useAuth } from '@/hooks/useAuth'
import { Package, LogOut, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface NavbarProps {
  title?: string
}

export function Navbar({ title = 'نظام الطلبات' }: NavbarProps) {
  const { profile, signOut } = useAuth()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.replace('/login')
    toast.success('تم تسجيل الخروج')
  }

  return (
    <nav className="bg-white border-b border-stone-200 px-4 sm:px-6 h-14 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      {/* Logo + Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 bg-brand-500 rounded-lg">
          <Package size={18} className="text-white" />
        </div>
        <span className="font-display font-bold text-stone-900 text-base hidden sm:block">{title}</span>
      </div>

      {/* User info + logout */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 rounded-full">
          <User size={14} className="text-stone-500" />
          <span className="text-sm text-stone-700 font-medium">
            {profile?.full_name || profile?.email?.split('@')[0] || 'مستخدم'}
          </span>
          {profile?.role === 'admin' && (
            <span className="text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-medium">
              مدير
            </span>
          )}
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-stone-500 hover:text-red-600
            hover:bg-red-50 rounded-full transition-all"
        >
          <LogOut size={15} />
          <span className="hidden sm:block">خروج</span>
        </button>
      </div>
    </nav>
  )
}
