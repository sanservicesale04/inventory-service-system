import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { logActivity } from '../lib/activityLog'

const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch profile:', error.message)
      return null
    }
    return data
  }

  useEffect(() => {
    let isMounted = true

    // Get current session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return
      setSession(session)
      if (session?.user) {
        const p = await fetchProfile(session.user.id)
        if (isMounted) setProfile(p)
      }
      if (isMounted) setLoading(false)
    })

    // Listen for auth state changes (login, logout, token refresh)
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      if (newSession?.user) {
        const p = await fetchProfile(newSession.user.id)
        setProfile(p)
      } else {
        setProfile(null)
      }
    })

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function login(usernameOrEmail, password) {
    // อนุญาตให้กรอกเป็น username หรือ email ก็ได้
    let email = usernameOrEmail
    if (!usernameOrEmail.includes('@')) {
      const { data: profileRow, error: lookupError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', usernameOrEmail)
        .single()

      if (lookupError || !profileRow) {
        return { error: { message: 'Invalid username or password' } }
      }

      // ต้องดึง email จาก auth.users ผ่าน RPC เพราะ client ไม่เข้าถึง auth.users ตรงได้
      // วิธีง่ายสุด: ให้ user ใส่ email ตรงๆ ถ้า username lookup ไม่พอ
      // ในระบบจริงแนะนำให้สร้าง RPC function get_email_by_username
      const { data: rpcResult, error: rpcError } = await supabase.rpc('get_email_by_username', {
        lookup_username: usernameOrEmail,
      })
      if (rpcError || !rpcResult) {
        return { error: { message: 'Invalid username or password' } }
      }
      email = rpcResult
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return { error }
    }

    // บันทึก activity log การล็อกอิน
    const p = await fetchProfile(data.user.id)
    await logActivity({
      userId: data.user.id,
      username: p?.username || email,
      actionType: 'login',
      module: 'auth',
      description: `${p?.username || email} เข้าสู่ระบบ`,
    })

    return { data }
  }

  async function logout() {
    if (profile) {
      await logActivity({
        userId: session?.user?.id,
        username: profile.username,
        actionType: 'logout',
        module: 'auth',
        description: `${profile.username} ออกจากระบบ`,
      })
    }
    await supabase.auth.signOut()
  }

  const value = {
    session,
    user: session?.user || null,
    profile,
    role: profile?.role || null,
    loading,
    login,
    logout,
    isAdmin: profile?.role === 'admin',
    isUser: profile?.role === 'user',
    isTechnician: profile?.role === 'technician',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
