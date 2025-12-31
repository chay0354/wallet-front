'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { API_URL } from '@/lib/config'

interface User {
  id: string
  email: string
  full_name: string | null
  created_at: string
  balance?: number
  transaction_count?: number
}

interface Transaction {
  id: string
  from_user_id: string
  to_user_id: string
  amount: number
  created_at: string
  from_user_email?: string
  to_user_email?: string
  status?: string
  violations?: string[]
  reviewed_at?: string
  reviewed_by?: string
}

interface PendingTransaction {
  id: string
  from_user_id: string
  to_user_id: string
  amount: number
  status: string
  violations: string[]
  created_at: string
  from_user_email?: string
  to_user_email?: string
  reviewed_at?: string
  reviewed_by?: string
}

export default function AdminDashboard({ session }: { session: any }) {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([])
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'users' | 'transactions' | 'pending' | 'rules'>('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [reviewingTx, setReviewingTx] = useState<string | null>(null)
  const [editingRule, setEditingRule] = useState<string | null>(null)
  const [ruleConfigs, setRuleConfigs] = useState<Record<string, any>>({})
  const [actionBlockerStatus, setActionBlockerStatus] = useState<any>(null)
  const [actionBlockerLoading, setActionBlockerLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Use refs to prevent duplicate requests and track loading state
  const isFetchingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const sessionTokenRef = useRef<string | null>(null)
  const hasInitialLoadedRef = useRef(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    if (!session?.access_token) return
    
    const currentToken = session.access_token
    mountedRef.current = true
    
    // Only abort if session token actually changed (not just React Strict Mode remount)
    if (currentToken !== sessionTokenRef.current && abortControllerRef.current) {
      abortControllerRef.current.abort()
      hasInitialLoadedRef.current = false
    }
    
    sessionTokenRef.current = currentToken
    
    // Only fetch if we haven't loaded for this session token yet
    if (!hasInitialLoadedRef.current && !isFetchingRef.current) {
      // For initial load, don't use AbortController to prevent React Strict Mode from canceling
      hasInitialLoadedRef.current = true
      fetchData(undefined) // Pass undefined signal for initial load
    }
    
    // Set up automatic refresh for pending transactions (only after initial load)
    // Clear any existing interval first
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
    }
    
    // Create abort controller for refresh operations (not initial load)
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal
    
    // Start refresh interval after a delay to let initial load complete
    const startRefreshInterval = setTimeout(() => {
      refreshIntervalRef.current = setInterval(() => {
        refreshPendingTransactions(signal)
      }, 15000) // Refresh every 15 seconds
    }, 5000) // Wait 5 seconds before starting auto-refresh
    
    return () => {
      // Only cleanup intervals and abort refresh operations
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
      clearTimeout(startRefreshInterval)
      
      // Only abort if session actually changed (not just React Strict Mode remount)
      if (!session?.access_token || session?.access_token !== sessionTokenRef.current) {
        mountedRef.current = false
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
          abortControllerRef.current = null
        }
        hasInitialLoadedRef.current = false
      }
    }
  }, [session?.access_token])
  
  const refreshPendingTransactions = async (signal?: AbortSignal) => {
    // Prevent concurrent refreshes
    if (!session?.access_token || isRefreshing || isFetchingRef.current) return
    
    setIsRefreshing(true)
    try {
      const token = session?.access_token
      
      // ONLY refresh pending transactions - nothing else
      const pendingRes = await axios.get(`${API_URL}/api/admin/pending-transactions`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000, // 30 seconds timeout
        signal // Use abort signal to cancel if needed
      })
      
      // Check if request was aborted
      if (signal?.aborted) return
      
      const pendingData = pendingRes.data?.pending_transactions || []
      
      // Only update pending transactions state - don't touch anything else
      setPendingTransactions(pendingData)
    } catch (error: any) {
      // Ignore abort errors (but not timeout errors that should be logged)
      if (signal?.aborted || axios.isCancel(error) || (error.code === 'ERR_CANCELED' && !error.message?.includes('timeout')) || error.name === 'AbortError') {
        return
      }
      // Silently fail for background refresh
      if (process.env.NODE_ENV === 'development') {
        console.error('Error refreshing pending transactions:', error)
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  const fetchData = async (signal?: AbortSignal) => {
    if (!session?.access_token || isFetchingRef.current) return
    
    isFetchingRef.current = true
    setLoading(true)
    
    try {
      const token = session?.access_token

      // Fetch critical data first (pending, rules, status) - these are needed immediately
      // Only add signal if provided (not for initial load)
      const requestConfig: any = {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000 // 30 seconds timeout
      }
      
      if (signal) {
        requestConfig.signal = signal
      }
      
      const [pendingRes, rulesRes, blockerRes] = await Promise.allSettled([
        axios.get(`${API_URL}/api/admin/pending-transactions`, requestConfig),
        axios.get(`${API_URL}/api/admin/rules`, requestConfig),
        axios.get(`${API_URL}/api/admin/action-blocker/status`, requestConfig).catch(() => ({ data: { status: 'stopped', running: false } }))
      ])
      
      // Check if request was aborted (only if signal exists)
      if (signal?.aborted || !mountedRef.current) {
        isFetchingRef.current = false
        return
      }
      
      // Set critical data first (pending transactions, rules, blocker status)
      const pendingData = pendingRes.status === 'fulfilled' ? (pendingRes.value.data.pending_transactions || []) : []
      const rulesData = rulesRes.status === 'fulfilled' ? (rulesRes.value.data.rules || []) : []
      const blockerData = blockerRes.status === 'fulfilled' ? blockerRes.value.data : { status: 'stopped', running: false }
      
      setPendingTransactions(pendingData)
      setRules(rulesData)
      setActionBlockerStatus(blockerData)
      
      // Initialize rule configs
      const configs: Record<string, any> = {}
      if (rulesData) {
        rulesData.forEach((rule: any) => {
          configs[rule.rule_id] = rule.config || {}
        })
      }
      setRuleConfigs(configs)
      
      // Set loading to false immediately after critical data loads
      setLoading(false)
      isFetchingRef.current = false
      
      // Load users and transactions in background (non-blocking, no signal needed)
      // These can load slowly without blocking the UI
      Promise.allSettled([
        axios.get(`${API_URL}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 30000 // 30 seconds timeout
        }),
        axios.get(`${API_URL}/api/admin/transactions`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 30000 // 30 seconds timeout
        })
      ]).then(([usersRes, transactionsRes]) => {
        // Check if component is still mounted
        if (signal?.aborted || !mountedRef.current) return
        
        const usersData = usersRes.status === 'fulfilled' ? (usersRes.value.data.users || []) : []
        const transactionsData = transactionsRes.status === 'fulfilled' ? (transactionsRes.value.data.transactions || []) : []
        
        // Calculate transaction counts for each user
        const usersWithCounts = usersData.map((user: User) => {
          const count = transactionsData.filter(
            (tx: Transaction) => tx.from_user_id === user.id || tx.to_user_id === user.id
          ).length
          return { ...user, transaction_count: count }
        })

        setUsers(usersWithCounts)
        setTransactions(transactionsData)
      }).catch(() => {
        // Silently fail background requests
      })

    } catch (error: any) {
      // Ignore abort errors (but not timeout errors)
      if (signal && (
        signal.aborted ||
        axios.isCancel(error) || 
        (error.code === 'ERR_CANCELED' && !error.message?.includes('timeout')) ||
        error.name === 'AbortError'
      )) {
        isFetchingRef.current = false
        return
      }
      
      // Only show errors if component is still mounted
      if (!mountedRef.current) {
        isFetchingRef.current = false
        return
      }
      
      console.error('Error fetching admin data:', error)
      
      // Provide more specific error messages
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.error('Request timed out. Please check your connection and try again.')
      } else if (error.response) {
        console.error(`Failed to load admin data: ${error.response.status} ${error.response.statusText}`)
      } else if (error.request) {
        console.error('Unable to connect to server. Please check if the backend is running.')
      } else {
        console.error('Failed to load admin data. Please try again.')
      }
      
      setLoading(false)
      isFetchingRef.current = false
    }
  }

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
      }
      // Force redirect to login page
      window.location.href = '/login'
    } catch (error) {
      console.error('Error signing out:', error)
      // Force redirect even if there's an error
      window.location.href = '/login'
    }
  }

  // Filter transactions based on search
  const filteredTransactions = transactions.filter(tx => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      tx.from_user_email?.toLowerCase().includes(search) ||
      tx.to_user_email?.toLowerCase().includes(search) ||
      tx.amount.toString().includes(search)
    )
  })

  // Filter users based on search
  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      user.email.toLowerCase().includes(search) ||
      user.full_name?.toLowerCase().includes(search) ||
      user.balance?.toString().includes(search)
    )
  })

  const handleApproveTransaction = async (txId: string, approve: boolean) => {
    try {
      const token = session?.access_token
      await axios.post(
        `${API_URL}/api/admin/approve-transaction`,
        {
          transaction_id: txId,
          approve
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 30000 // 30 seconds timeout
        }
      )
      setReviewingTx(null)
      
      // Only refresh pending transactions - remove the approved/rejected one
      // Don't fetch all transactions or anything else
      const pendingRes = await axios.get(`${API_URL}/api/admin/pending-transactions`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000 // 30 seconds timeout
      }).catch(() => ({ data: { pending_transactions: [] } }))
      
      // Only update pending transactions state
      setPendingTransactions(pendingRes.data.pending_transactions || [])
      
      // Optionally refresh transactions list in background (non-blocking) to show approved transaction
      // But don't wait for it or show loading
      axios.get(`${API_URL}/api/admin/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000 // 30 seconds timeout
      }).then((res) => {
        setTransactions(res.data.transactions || [])
      }).catch(() => {
        // Silently fail - not critical
      })
    } catch (error: any) {
      console.error('Error approving transaction:', error)
      // Provide more specific error messages
      let errorMessage = 'Failed to process transaction'
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please check your connection and try again.'
      } else if (error.response) {
        errorMessage = error.response.data?.detail || `Error: ${error.response.status} ${error.response.statusText}`
      } else if (error.request) {
        errorMessage = 'Unable to connect to server. Please check if the backend is running.'
      }
      alert(errorMessage)
    }
  }

  const handleUpdateRule = async (ruleId: string, updates: any) => {
    try {
      const token = session?.access_token
      await axios.post(
        `${API_URL}/api/admin/rules/update`,
        {
          rule_id: ruleId,
          ...updates
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 30000 // 30 seconds timeout
        }
      )
      setEditingRule(null)
      // Only refresh rules, not everything
      const rulesRes = await axios.get(`${API_URL}/api/admin/rules`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000 // 30 seconds timeout
      }).catch(() => ({ data: { rules: [] } }))
      setRules(rulesRes.data.rules || [])
      const configs: Record<string, any> = {}
      if (rulesRes.data.rules) {
        rulesRes.data.rules.forEach((rule: any) => {
          configs[rule.rule_id] = rule.config || {}
        })
      }
      setRuleConfigs(configs)
    } catch (error: any) {
      console.error('Error updating rule:', error)
      // Provide more specific error messages
      let errorMessage = 'Failed to update rule'
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please check your connection and try again.'
      } else if (error.response) {
        errorMessage = error.response.data?.detail || `Error: ${error.response.status} ${error.response.statusText}`
      } else if (error.request) {
        errorMessage = 'Unable to connect to server. Please check if the backend is running.'
      }
      alert(errorMessage)
    }
  }

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    await handleUpdateRule(ruleId, { enabled })
  }

  const handleStartActionBlocker = async () => {
    setActionBlockerLoading(true)
    try {
      const token = session?.access_token
      await axios.post(`${API_URL}/api/admin/action-blocker/start`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000 // 30 seconds timeout
      })
      // Only refresh status, not everything
      const res = await axios.get(`${API_URL}/api/admin/action-blocker/status`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000 // 30 seconds timeout
      }).catch(() => ({ data: { status: 'stopped', running: false } }))
      setActionBlockerStatus(res.data)
    } catch (error: any) {
      console.error('Error starting action blocker:', error)
      // Provide more specific error messages
      let errorMessage = 'Failed to start Action Blocker Service'
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please check your connection and try again.'
      } else if (error.response) {
        errorMessage = error.response.data?.detail || `Error: ${error.response.status} ${error.response.statusText}`
      } else if (error.request) {
        errorMessage = 'Unable to connect to server. Please check if the backend is running.'
      }
      alert(errorMessage)
    } finally {
      setActionBlockerLoading(false)
    }
  }

  const handleStopActionBlocker = async () => {
    setActionBlockerLoading(true)
    try {
      const token = session?.access_token
      await axios.post(`${API_URL}/api/admin/action-blocker/stop`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000 // 30 seconds timeout
      })
      // Only refresh status, not everything
      const res = await axios.get(`${API_URL}/api/admin/action-blocker/status`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000 // 30 seconds timeout
      }).catch(() => ({ data: { status: 'stopped', running: false } }))
      setActionBlockerStatus(res.data)
    } catch (error: any) {
      console.error('Error stopping action blocker:', error)
      // Provide more specific error messages
      let errorMessage = 'Failed to stop Action Blocker Service'
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please check your connection and try again.'
      } else if (error.response) {
        errorMessage = error.response.data?.detail || `Error: ${error.response.status} ${error.response.statusText}`
      } else if (error.request) {
        errorMessage = 'Unable to connect to server. Please check if the backend is running.'
      }
      alert(errorMessage)
    } finally {
      setActionBlockerLoading(false)
    }
  }

  // Filter pending transactions
  const filteredPending = pendingTransactions.filter(tx => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      tx.from_user_email?.toLowerCase().includes(search) ||
      tx.to_user_email?.toLowerCase().includes(search) ||
      tx.amount.toString().includes(search) ||
      tx.violations.some(v => v.toLowerCase().includes(search))
    )
  })

  // Calculate statistics
  const totalUsers = users.length
  const totalTransactions = transactions.length
  const totalVolume = transactions.reduce((sum, tx) => sum + tx.amount, 0)
  const totalBalance = users.reduce((sum, user) => sum + (user.balance || 0), 0)
  const pendingCount = pendingTransactions.length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center space-y-4">
          <svg className="animate-spin h-12 w-12 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-400 text-lg">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-6 mb-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-slate-400 text-sm mt-1">System Administration & Monitoring</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Action Blocker Service Status */}
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 rounded-lg border border-slate-600">
                <div className={`w-2 h-2 rounded-full ${actionBlockerStatus?.running ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                <span className="text-sm text-slate-300">
                  Action Blocker: {actionBlockerStatus?.running ? 'Running' : 'Stopped'}
                </span>
                {actionBlockerStatus?.running ? (
                  <button
                    onClick={handleStopActionBlocker}
                    disabled={actionBlockerLoading}
                    className="ml-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors disabled:opacity-50"
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    onClick={handleStartActionBlocker}
                    disabled={actionBlockerLoading}
                    className="ml-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors disabled:opacity-50"
                  >
                    Start
                  </button>
                )}
              </div>
              <button
                onClick={handleSignOut}
                className="px-5 py-2.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-600 hover:border-slate-500 transition-all font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white">
              <p className="text-sm opacity-90 mb-1">Total Users</p>
              <p className="text-3xl font-bold">{totalUsers}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-5 text-white">
              <p className="text-sm opacity-90 mb-1">Total Transactions</p>
              <p className="text-3xl font-bold">{totalTransactions}</p>
            </div>
            <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-xl p-5 text-white">
              <p className="text-sm opacity-90 mb-1">Pending Review</p>
              <p className="text-3xl font-bold">{pendingCount}</p>
            </div>
            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-5 text-white">
              <p className="text-sm opacity-90 mb-1">Total Volume</p>
              <p className="text-3xl font-bold">${totalVolume.toFixed(2)}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl p-5 text-white">
              <p className="text-sm opacity-90 mb-1">Total Balance</p>
              <p className="text-3xl font-bold">${totalBalance.toFixed(2)}</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search by email, name, or amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Tabs */}
          <div className="flex space-x-4 mb-6 border-b border-slate-700">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-3 font-semibold transition-colors relative ${
                activeTab === 'pending'
                  ? 'text-red-400 border-b-2 border-red-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Pending Review
              {pendingCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'rules'
                  ? 'text-red-400 border-b-2 border-red-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Rules ({rules.length})
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'transactions'
                  ? 'text-red-400 border-b-2 border-red-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Transactions ({filteredTransactions.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'users'
                  ? 'text-red-400 border-b-2 border-red-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Users ({filteredUsers.length})
            </button>
          </div>

          {/* Pending Transactions Tab */}
          {activeTab === 'pending' && (
            <div className="bg-slate-700/30 rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-slate-200">Pending Transactions Review</h2>
                <button
                  onClick={() => {
                    if (!isRefreshing && !isFetchingRef.current) {
                      refreshPendingTransactions(abortControllerRef.current?.signal)
                    }
                  }}
                  disabled={isRefreshing || isFetchingRef.current}
                  className="px-4 py-2 bg-slate-600/50 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh pending transactions"
                >
                  {isRefreshing ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </>
                  )}
                </button>
              </div>
              {filteredPending.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-700/50 mb-4">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-slate-400">No pending transactions</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {filteredPending.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-5 rounded-xl bg-red-900/20 border-2 border-red-500/50 hover:border-red-500 transition-all"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="bg-slate-600/50 px-3 py-1.5 rounded-lg">
                                  <p className="text-xs text-slate-400 mb-1">From</p>
                                  <p className="font-semibold text-slate-200 text-sm">
                                    {tx.from_user_email || 'Unknown User'}
                                  </p>
                                </div>
                                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                                <div className="bg-slate-600/50 px-3 py-1.5 rounded-lg">
                                  <p className="text-xs text-slate-400 mb-1">To</p>
                                  <p className="font-semibold text-slate-200 text-sm">
                                    {tx.to_user_email || 'Unknown User'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Violations */}
                          <div className="ml-6 mb-3">
                            <p className="text-xs text-red-400 font-semibold mb-2">Flagged Violations:</p>
                            <div className="space-y-1">
                              {tx.violations.map((violation, idx) => (
                                <div key={idx} className="bg-red-900/30 px-3 py-1.5 rounded text-xs text-red-300 border border-red-700/50">
                                  ⚠️ {violation}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="ml-6 flex items-center gap-4 text-xs text-slate-400">
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {new Date(tx.created_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="ml-4 text-right">
                          <p className="text-xs text-slate-400 mb-1">Amount</p>
                          <p className="text-3xl font-bold text-red-400">
                            ${tx.amount.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Review Actions */}
                      {reviewingTx === tx.id ? (
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => handleApproveTransaction(tx.id, true)}
                            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => handleApproveTransaction(tx.id, false)}
                            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                          >
                            ✗ Reject
                          </button>
                          <button
                            onClick={() => setReviewingTx(null)}
                            className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => setReviewingTx(tx.id)}
                            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                          >
                            Review Transaction
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="bg-slate-700/30 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-slate-200 mb-6">All Transactions</h2>
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-700/50 mb-4">
                    <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-slate-400">No transactions found</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {filteredTransactions.map((tx) => {
                    const isRejected = tx.status === 'rejected' || tx.id.startsWith('rejected_')
                    return (
                      <div
                        key={tx.id}
                        className={`p-5 rounded-xl border transition-all hover:scale-[1.01] ${
                          isRejected
                            ? 'bg-red-500/10 border-red-500/50 hover:border-red-500'
                            : 'bg-slate-600/30 border-slate-600/50 hover:border-slate-500'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className={`w-3 h-3 rounded-full ${
                                isRejected ? 'bg-red-400' : 'bg-green-400'
                              } ${isRejected ? '' : 'animate-pulse'}`}></div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {isRejected && (
                                    <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full font-semibold">
                                      REJECTED
                                    </span>
                                  )}
                                  <div className="bg-slate-600/50 px-3 py-1.5 rounded-lg">
                                    <p className="text-xs text-slate-400 mb-1">From</p>
                                    <p className="font-semibold text-slate-200 text-sm">
                                      {tx.from_user_email || 'Unknown User'}
                                    </p>
                                  </div>
                                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                  </svg>
                                  <div className="bg-slate-600/50 px-3 py-1.5 rounded-lg">
                                    <p className="text-xs text-slate-400 mb-1">To</p>
                                    <p className="font-semibold text-slate-200 text-sm">
                                      {tx.to_user_email || 'Unknown User'}
                                    </p>
                                  </div>
                                </div>
                                {isRejected && tx.violations && tx.violations.length > 0 && (
                                  <div className="mt-2 ml-6">
                                    <p className="text-xs text-slate-400 mb-1">Violations:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {tx.violations.map((violation, idx) => (
                                        <span key={idx} className="px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded">
                                          {violation}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {isRejected && tx.reviewed_at && (
                                  <div className="mt-2 ml-6 text-xs text-slate-400">
                                    Rejected on: {new Date(tx.reviewed_at).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="ml-6 flex items-center gap-4 text-xs text-slate-400">
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {new Date(tx.created_at).toLocaleString()}
                              </div>
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                ID: {tx.id.replace('rejected_', '').substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                          <div className="ml-4 text-right">
                            <p className="text-xs text-slate-400 mb-1">Amount</p>
                            <p className={`text-3xl font-bold ${
                              isRejected ? 'text-red-400' : 'text-green-400'
                            }`}>
                              ${tx.amount.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Rules Tab */}
          {activeTab === 'rules' && (
            <div className="bg-slate-700/30 rounded-xl p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-slate-200">Transaction Rules</h2>
                <p className="text-sm text-slate-400 mt-1">Manage rules that automatically flag suspicious transactions</p>
              </div>
              {rules.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-700/50 mb-4">
                    <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <p className="text-slate-400">No rules found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rules.map((rule) => (
                    <div
                      key={rule.rule_id}
                      className="p-5 rounded-xl bg-slate-600/30 border border-slate-600/50 hover:border-slate-500 transition-all"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-3 h-3 rounded-full ${rule.enabled ? 'bg-green-400' : 'bg-slate-500'}`}></div>
                            <h3 className="text-lg font-semibold text-slate-200">{rule.name}</h3>
                            <span className={`px-2 py-1 text-xs rounded ${rule.enabled ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>
                              {rule.enabled ? 'Active' : 'Disabled'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400 ml-6 mb-3">{rule.description}</p>
                          
                          {/* Rule Configuration */}
                          {editingRule === rule.rule_id ? (
                            <div className="ml-6 p-4 bg-slate-800/50 rounded-lg border border-slate-600">
                              {rule.rule_type === 'amount_threshold' && (
                                <div className="space-y-3">
                                  <label className="block text-sm text-slate-300">
                                    Threshold Amount ($)
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={ruleConfigs[rule.rule_id]?.threshold || rule.config?.threshold || 500}
                                      onChange={(e) => {
                                        setRuleConfigs({
                                          ...ruleConfigs,
                                          [rule.rule_id]: {
                                            ...ruleConfigs[rule.rule_id],
                                            threshold: parseFloat(e.target.value)
                                          }
                                        })
                                      }}
                                      className="mt-1 w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                  </label>
                                </div>
                              )}
                              
                              {rule.rule_type === 'repeated_transaction' && (
                                <div className="space-y-3">
                                  <label className="block text-sm text-slate-300">
                                    Max Repeats
                                    <input
                                      type="number"
                                      value={ruleConfigs[rule.rule_id]?.max_repeats || rule.config?.max_repeats || 3}
                                      onChange={(e) => {
                                        setRuleConfigs({
                                          ...ruleConfigs,
                                          [rule.rule_id]: {
                                            ...ruleConfigs[rule.rule_id],
                                            max_repeats: parseInt(e.target.value)
                                          }
                                        })
                                      }}
                                      className="mt-1 w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                  </label>
                                  <label className="block text-sm text-slate-300">
                                    Time Window (minutes)
                                    <input
                                      type="number"
                                      value={ruleConfigs[rule.rule_id]?.time_window_minutes || rule.config?.time_window_minutes || 10}
                                      onChange={(e) => {
                                        setRuleConfigs({
                                          ...ruleConfigs,
                                          [rule.rule_id]: {
                                            ...ruleConfigs[rule.rule_id],
                                            time_window_minutes: parseInt(e.target.value)
                                          }
                                        })
                                      }}
                                      className="mt-1 w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                  </label>
                                </div>
                              )}
                              
                              {rule.rule_type === 'high_frequency' && (
                                <div className="space-y-3">
                                  <label className="block text-sm text-slate-300">
                                    Max Transactions
                                    <input
                                      type="number"
                                      value={ruleConfigs[rule.rule_id]?.max_transactions || rule.config?.max_transactions || 5}
                                      onChange={(e) => {
                                        setRuleConfigs({
                                          ...ruleConfigs,
                                          [rule.rule_id]: {
                                            ...ruleConfigs[rule.rule_id],
                                            max_transactions: parseInt(e.target.value)
                                          }
                                        })
                                      }}
                                      className="mt-1 w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                  </label>
                                  <label className="block text-sm text-slate-300">
                                    Time Window (minutes)
                                    <input
                                      type="number"
                                      value={ruleConfigs[rule.rule_id]?.time_window_minutes || rule.config?.time_window_minutes || 5}
                                      onChange={(e) => {
                                        setRuleConfigs({
                                          ...ruleConfigs,
                                          [rule.rule_id]: {
                                            ...ruleConfigs[rule.rule_id],
                                            time_window_minutes: parseInt(e.target.value)
                                          }
                                        })
                                      }}
                                      className="mt-1 w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                  </label>
                                </div>
                              )}
                              
                              {rule.rule_type === 'large_percentage' && (
                                <div className="space-y-3">
                                  <label className="block text-sm text-slate-300">
                                    Percentage Threshold (%)
                                    <input
                                      type="number"
                                      step="0.1"
                                      value={ruleConfigs[rule.rule_id]?.percentage_threshold || rule.config?.percentage_threshold || 50}
                                      onChange={(e) => {
                                        setRuleConfigs({
                                          ...ruleConfigs,
                                          [rule.rule_id]: {
                                            ...ruleConfigs[rule.rule_id],
                                            percentage_threshold: parseFloat(e.target.value)
                                          }
                                        })
                                      }}
                                      className="mt-1 w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                  </label>
                                </div>
                              )}
                              
                              <div className="flex gap-2 mt-4">
                                <button
                                  onClick={() => handleUpdateRule(rule.rule_id, { config: ruleConfigs[rule.rule_id] })}
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                                >
                                  Save Changes
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingRule(null)
                                    // Reset configs without full refresh
                                    const configs: Record<string, any> = {}
                                    rules.forEach((rule: any) => {
                                      configs[rule.rule_id] = rule.config || {}
                                    })
                                    setRuleConfigs(configs)
                                  }}
                                  className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="ml-6">
                              <div className="text-sm text-slate-300 space-y-1">
                                {rule.rule_type === 'amount_threshold' && (
                                  <p>Threshold: ${rule.config?.threshold || 'N/A'}</p>
                                )}
                                {rule.rule_type === 'repeated_transaction' && (
                                  <p>Max Repeats: {rule.config?.max_repeats || 'N/A'} | Time Window: {rule.config?.time_window_minutes || 'N/A'} minutes</p>
                                )}
                                {rule.rule_type === 'high_frequency' && (
                                  <p>Max Transactions: {rule.config?.max_transactions || 'N/A'} | Time Window: {rule.config?.time_window_minutes || 'N/A'} minutes</p>
                                )}
                                {rule.rule_type === 'large_percentage' && (
                                  <p>Percentage Threshold: {rule.config?.percentage_threshold || 'N/A'}%</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleToggleRule(rule.rule_id, !rule.enabled)}
                            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                              rule.enabled
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                          >
                            {rule.enabled ? 'Disable' : 'Enable'}
                          </button>
                          {editingRule !== rule.rule_id && (
                            <button
                              onClick={() => setEditingRule(rule.rule_id)}
                              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="bg-slate-700/30 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-slate-200 mb-6">All Users</h2>
              {filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-700/50 mb-4">
                    <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <p className="text-slate-400">No users found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="p-5 rounded-xl bg-slate-600/30 border border-slate-600/50 hover:border-slate-500 transition-all hover:scale-[1.02]"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                              {user.email.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-slate-200 text-sm truncate">{user.email}</p>
                              {user.full_name && (
                                <p className="text-xs text-slate-400">{user.full_name}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-400">Balance</span>
                          <span className="text-lg font-bold text-green-400">
                            ${user.balance?.toFixed(2) || '0.00'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-400">Transactions</span>
                          <span className="text-sm font-semibold text-slate-300">
                            {user.transaction_count || 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-600/50">
                          <span className="text-xs text-slate-400">Joined</span>
                          <span className="text-xs text-slate-500">
                            {new Date(user.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

