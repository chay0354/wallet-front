'use client'

import { useEffect, useState } from 'react'
import { authService, User } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import Dashboard from '@/components/Dashboard'

export default function WalletPage() {
  const [session, setSession] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    authService.getSession().then((user) => {
      if (!user) {
        router.push('/login')
      } else {
        // Redirect admin to admin page
        if (user.email === 'admin@admin') {
          router.push('/admin')
        } else {
          setSession(user)
        }
      }
      setLoading(false)
    })
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center space-y-4">
          <svg className="animate-spin h-12 w-12 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-400 text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return <Dashboard session={session} />
}

