'use client'

import { useEffect } from 'react'
import { authService } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import Auth from '@/components/Auth'

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in
    authService.getSession().then((user) => {
      if (user) {
        // Redirect admin to admin page, others to wallet
        if (user.email === 'admin@admin') {
          router.push('/admin')
        } else {
          router.push('/wallet')
        }
      }
    })
  }, [router])

  return <Auth />
}

