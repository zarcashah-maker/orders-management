'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { Profile } from '@/types'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function initAuth() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Session error:', error)
          setUser(null)
          setProfile(null)
          return
        }

        setUser(session?.user ?? null)

        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
      } catch (err) {
        console.error('Init auth error:', err)
        setUser(null)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)

        if (!session?.user) {
          setProfile(null)
          setLoading(false)
          return
        }

        setLoading(true)

        setTimeout(() => {
          fetchProfile(session.user.id)
            .catch((err) => {
              console.error('Auth profile error:', err)
              setProfile(null)
            })
            .finally(() => {
              setLoading(false)
            })
        }, 0)
      }
    )

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('auth_user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Profile error:', error)
      setProfile(null)
      return
    }

    setProfile(data)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
