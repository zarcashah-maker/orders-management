'use client'

import { useAuth } from '@/hooks/useAuth'
import { Package, LogOut, User, Moon, Sun } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { usePreferences } from '@/lib/i18n'

interface NavbarProps {
  title?: string
}

export function Navbar({ title }: NavbarProps) {
  const { profile, signOut } = useAuth()
  const { locale, setLocale, theme, toggleTheme, t } = usePreferences()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.replace('/login')
    toast.success(locale === 'ar' ? 'تم تسجيل الخروج' : 'Signed out')
  }

  return (
    <nav className="bg-white border-b border-stone-200 px-4 sm:px-6 h-14 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      {/* Logo + Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 bg-brand-500 rounded-lg">
          <Package size={18} className="text-white" />
        </div>
        <span className="font-display font-bold text-stone-900 text-base hidden sm:block">{title || (locale === 'ar' ? 'نظام الطلبات' : 'Orders System')}</span>
      </div>

      {/* User info + logout */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
          className="px-2.5 py-1.5 text-xs font-semibold rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
        >
          {t('language')}
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 inline-flex items-center justify-center transition-colors"
          title={theme === 'dark' ? t('light') : t('dark')}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 rounded-full">
          <User size={14} className="text-stone-500" />
          <span className="text-sm text-stone-700 font-medium">
            {profile?.name || profile?.email?.split('@')[0] || t('user')}
          </span>
          {profile?.role === 'Admin' && (
            <span className="text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-medium">
              {t('admin')}
            </span>
          )}
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-stone-500 hover:text-red-600
            hover:bg-red-50 rounded-full transition-all"
        >
          <LogOut size={15} />
          <span className="hidden sm:block">{t('signOut')}</span>
        </button>
      </div>
    </nav>
  )
}
