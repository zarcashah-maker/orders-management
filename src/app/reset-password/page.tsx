'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { ArrowRight, Eye, EyeOff, Package } from 'lucide-react'

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!newPassword || !confirmPassword) {
      toast.error('يرجى إدخال كلمة المرور الجديدة وتأكيدها')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('كلمتا المرور غير متطابقتين')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    setLoading(false)

    if (error) {
      console.error('Update password error:', error)
      toast.error('حدث خطأ، يرجى المحاولة مرة أخرى')
      return
    }

    toast.success('تم تحديث كلمة المرور بنجاح')
    router.replace('/login')
  }

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4" dir="rtl">
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-500 rounded-2xl mb-4 shadow-lg shadow-brand-500/30">
            <Package size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-display font-bold text-stone-900">تحديث كلمة المرور</h1>
          <p className="text-stone-500 text-sm mt-1">أدخل كلمة مرور جديدة لحسابك</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-stone-200/80 p-8 border border-stone-200/60">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                كلمة المرور الجديدة
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pl-10 bg-stone-50 border border-stone-200 rounded-xl text-sm
                    placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent
                    transition-all"
                  dir="ltr"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                تأكيد كلمة المرور
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm
                  placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent
                  transition-all"
                dir="ltr"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300
                text-white font-semibold rounded-xl transition-all duration-200
                shadow-md shadow-brand-500/25 hover:shadow-lg hover:shadow-brand-500/30
                disabled:cursor-not-allowed"
            >
              {loading ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
            </button>
          </form>
        </div>

        <Link
          href="/login"
          className="mt-5 inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors"
        >
          <ArrowRight size={16} />
          العودة لتسجيل الدخول
        </Link>
      </div>
    </div>
  )
}
