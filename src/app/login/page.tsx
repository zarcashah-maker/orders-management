'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Package } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { user, profile } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const urlProjectRef = supabaseUrl?.match(/^https:\/\/([^.]+)\.supabase\.co/)?.[1]
    const keyProjectRef = getJwtPayload(anonKey)?.ref

    console.info('[auth-debug] Supabase env check', {
      hasUrl: Boolean(supabaseUrl),
      hasAnonKey: Boolean(anonKey),
      urlProjectRef,
      keyProjectRef,
      refsMatch: Boolean(urlProjectRef && keyProjectRef && urlProjectRef === keyProjectRef),
    })

    if (urlProjectRef && keyProjectRef && urlProjectRef !== keyProjectRef) {
      console.warn('[auth-debug] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY appear to belong to different Supabase projects.')
    }
  }, [])

  useEffect(() => {
    if (user && profile) {
      if (profile.role === 'Admin') router.replace('/admin')
      else if (profile.role === 'Factory') router.replace('/factory')
    }
  }, [user, profile, router])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
  
    if (!email || !password) {
      toast.error('يرجى إدخال البريد الإلكتروني وكلمة المرور')
      return
    }
  
    setLoading(true)
  
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
  
      if (error) {
        console.error('[auth-debug] signInWithPassword failed', {
          name: error.name,
          message: error.message,
          status: error.status,
          code: error.code,
        })
        toast.error('بيانات الدخول غير صحيحة')
        setLoading(false)
        return
      }

      console.info('[auth-debug] signInWithPassword succeeded', {
        userId: data.user?.id,
        email: data.user?.email,
      })
  
      const userId = data.user?.id
  
      if (!userId) {
        toast.error('تعذر قراءة بيانات المستخدم')
        setLoading(false)
        return
      }
  
      const { data: profileData, error: profileError } = await supabase
        .from('app_users')
        .select('role')
        .eq('auth_user_id', userId)
        .single()
  
      if (profileError || !profileData) {
        console.error('[auth-debug] Profile lookup failed after successful sign-in', {
          userId,
          message: profileError?.message,
          code: profileError?.code,
          details: profileError?.details,
          hint: profileError?.hint,
          hasProfile: Boolean(profileData),
        })
        toast.error('لم يتم العثور على صلاحية المستخدم')
        setLoading(false)
        return
      }
  
      if (profileData.role === 'Admin') {
        router.replace('/admin')
        return
      }
  
      if (profileData.role === 'Factory') {
        router.replace('/factory')
        return
      }
  
      toast.error('نوع المستخدم غير معروف')
      setLoading(false)
    } catch (err) {
      console.error('Login error:', err)
      toast.error('حدث خطأ أثناء تسجيل الدخول')
      setLoading(false)
    }
  }

  function getJwtPayload(token: string | undefined) {
    if (!token) return null
    try {
      const [, payload] = token.split('.')
      if (!payload) return null
      return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    } catch (err) {
      console.warn('[auth-debug] Could not decode Supabase anon key payload', err)
      return null
    }
  }

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4" dir="rtl">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-400/8 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 40px,
              #000 40px,
              #000 41px
            ), repeating-linear-gradient(
              90deg,
              transparent,
              transparent 40px,
              #000 40px,
              #000 41px
            )`,
          }}
        />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-500 rounded-2xl mb-4 shadow-lg shadow-brand-500/30">
            <Package size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-display font-bold text-stone-900">نظام الطلبات</h1>
          <p className="text-stone-500 text-sm mt-1">إدارة طلبات الإنتاج مع المصانع</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-stone-200/80 p-8 border border-stone-200/60">
          <h2 className="text-lg font-bold text-stone-800 mb-6">تسجيل الدخول</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-right
                  placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent
                  transition-all"
                dir="ltr"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pl-10 bg-stone-50 border border-stone-200 rounded-xl text-sm
                    placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent
                    transition-all"
                  dir="ltr"
                  autoComplete="current-password"
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300
                text-white font-semibold rounded-xl transition-all duration-200
                shadow-md shadow-brand-500/25 hover:shadow-lg hover:shadow-brand-500/30
                hover:-translate-y-0.5 active:translate-y-0
                disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  جاري الدخول...
                </span>
              ) : (
                'دخول'
              )}
            </button>

            <div className="text-center">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
              >
                نسيت كلمة المرور؟
              </Link>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-stone-400 mt-6">
          للمساعدة تواصل مع مدير النظام
        </p>
      </div>
    </div>
  )
}
