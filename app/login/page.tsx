'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Auth from '@/components/Auth'

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Redirect admin to admin page, others to wallet
        if (session.user.email === 'admin@admin') {
          router.push('/admin')
        } else {
          router.push('/wallet')
        }
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        // Redirect admin to admin page, others to wallet
        if (session.user.email === 'admin@admin') {
          router.push('/admin')
        } else {
          router.push('/wallet')
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return <Auth />
}

