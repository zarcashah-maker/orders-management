'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { ArrowRight, Mail, Package } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!email.trim()) {
      toast.error('يرجى إدخال البريد الإلكتروني')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)

    if (error) {
      console.error('Reset password email error:', error)
      toast.error('حدث خطأ، يرجى المحاولة مرة أخرى')
      return
    }

    toast.success('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني')
  }

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4" dir="rtl">
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-500 rounded-2xl mb-4 shadow-lg shadow-brand-500/30">
            <Package size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-display font-bold text-stone-900">استعادة كلمة المرور</h1>
          <p className="text-stone-500 text-sm mt-1">أدخل بريدك لإرسال رابط التحديث</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-stone-200/80 p-8 border border-stone-200/60">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full px-4 py-3 pl-10 bg-stone-50 border border-stone-200 rounded-xl text-sm text-right
                    placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent
                    transition-all"
                  dir="ltr"
                  autoComplete="email"
                />
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300
                text-white font-semibold rounded-xl transition-all duration-200
                shadow-md shadow-brand-500/25 hover:shadow-lg hover:shadow-brand-500/30
                disabled:cursor-not-allowed"
            >
              {loading ? 'جاري الإرسال...' : 'إرسال رابط الاستعادة'}
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
