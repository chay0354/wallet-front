'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { authService } from '@/lib/auth'
import axios from 'axios'
import { API_URL } from '@/lib/config'

interface Transaction {
  id: string
  from_user_id: string
  to_user_id: string
  amount: number
  created_at: string
  from_user_email?: string
  to_user_email?: string
  status?: string
}

export default function Dashboard({ session }: { session: any }) {
  const [balance, setBalance] = useState<number>(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [recipientEmail, setRecipientEmail] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loadingData, setLoadingData] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Refs for managing requests and preventing duplicates
  const abortControllerRef = useRef<AbortController | null>(null)
  const isFetchingRef = useRef(false)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  // Process transactions helper
  const processTransactions = useCallback((txs: Transaction[]): Transaction[] => {
    return txs
      .map((tx: Transaction) => ({
        ...tx,
        status: tx.id.startsWith('pending_') ? 'pending' : 'completed'
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [])

  // Unified fetch function with proper cancellation
  const fetchWalletData = useCallback(async (isInitialLoad = false, showLoading = true, forceCancel = false) => {
    const token = authService.getToken()
    if (!token) return
    
    // Prevent duplicate requests (unless forced)
    if (isFetchingRef.current && !forceCancel) {
      return
    }

    // Only cancel previous requests if explicitly requested AND not during initial load
    // This prevents React Strict Mode from canceling the initial request
    if (forceCancel && abortControllerRef.current && !isInitialLoad) {
      abortControllerRef.current.abort()
    }

    // For initial load, don't use AbortController to prevent any cancellation issues
    // For other requests, use AbortController for proper cancellation
    const abortController = isInitialLoad ? null : new AbortController()
    if (!isInitialLoad) {
      abortControllerRef.current = abortController
    }
    isFetchingRef.current = true

    if (isInitialLoad && showLoading) {
      setLoadingData(true)
    } else if (!isInitialLoad) {
      setIsRefreshing(true)
    }

    const signal = abortController?.signal
    
    try {
      const token = authService.getToken()
      if (!token) return

      // Fetch balance and transactions in parallel
      const requestConfig: any = {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000 // 30 seconds timeout
      }
      
      // Only add signal if we have an abort controller (not for initial load)
      if (signal) {
        requestConfig.signal = signal
      }
      
      const [balanceRes, transactionsRes] = await Promise.all([
        axios.get(`${API_URL}/api/balance`, requestConfig),
        axios.get(`${API_URL}/api/transactions`, requestConfig)
      ])

      // Only update if component is still mounted and request wasn't aborted (if signal exists)
      if ((!signal || !signal.aborted) && mountedRef.current) {
        const processedTxs = processTransactions(transactionsRes.data?.transactions || [])
        
        setBalance(balanceRes.data?.balance || 0)
        setTransactions(processedTxs)
        setError('')
      }
    } catch (error: any) {
      // Ignore abort errors - check multiple possible abort indicators (only if signal exists)
      // Don't ignore timeout errors - they should be handled
      if (signal && (
        signal.aborted ||
        error.name === 'AbortError' || 
        error.code === 'ERR_CANCELED' || 
        error.message === 'canceled' ||
        error.message?.includes('canceled') ||
        (error.response === undefined && error.request && signal.aborted)
      ) && error.code !== 'ECONNABORTED') {
        // Request was aborted, silently return
        return
      }

      if (mountedRef.current) {
        if (isInitialLoad) {
          console.error('Error fetching data:', error)
          // Provide more specific error messages
          if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            setError('Request timed out. Please check your connection and try again.')
          } else if (error.response) {
            setError(`Failed to load wallet data: ${error.response.status} ${error.response.statusText}`)
          } else if (error.request) {
            setError('Unable to connect to server. Please check if the backend is running.')
          } else {
            setError('Failed to load wallet data. Please try again.')
          }
        } else {
          // Silently fail for background refresh
          if (process.env.NODE_ENV === 'development') {
            console.error('Error refreshing data:', error)
          }
        }
      }
    } finally {
      if (mountedRef.current) {
        isFetchingRef.current = false
        if (isInitialLoad && showLoading) {
          setLoadingData(false)
        } else if (!isInitialLoad) {
          setIsRefreshing(false)
        }
      }
      // Only clear abort controller if we created one (not for initial load)
      if (!isInitialLoad) {
        abortControllerRef.current = null
      }
    }
  }, [session, processTransactions])

  // Track if initial load has been done for this session
  const sessionTokenRef = useRef<string | null>(null)
  const hasInitialLoadedRef = useRef(false)

  // Initial load effect - only runs once per session token
  useEffect(() => {
    const token = authService.getToken()
    if (!token || !session) {
      return
    }
    
    const currentToken = token
    
    // Reset loading state if session token changed
    if (currentToken !== sessionTokenRef.current) {
      hasInitialLoadedRef.current = false
      mountedRef.current = true
    }
    
    // Only run if we haven't loaded for this token yet
    if (!hasInitialLoadedRef.current) {
      sessionTokenRef.current = currentToken
      hasInitialLoadedRef.current = true
      
      // Load data immediately
      fetchWalletData(true, true, false)
    }
    
    return () => {
      // Only cleanup intervals
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
      // Only reset if session actually changed (not just React Strict Mode remount)
      const currentTokenCheck = authService.getToken()
      if (!currentTokenCheck || currentTokenCheck !== sessionTokenRef.current) {
        mountedRef.current = false
        hasInitialLoadedRef.current = false
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  // Manual refresh function - force cancel previous request
  const handleManualRefresh = useCallback(() => {
    if (session?.access_token) {
      fetchWalletData(false, false, true)
    }
  }, [session, fetchWalletData])

  const handleTransfer = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const token = authService.getToken()
      if (!token) return
      const response = await axios.post(
        `${API_URL}/api/transfer`,
        {
          recipient_email: recipientEmail,
          amount: parseFloat(amount),
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      if (response.data.requires_approval) {
        setMessage(`Transaction submitted for review. Amount: $${amount} to ${recipientEmail}`)
      } else {
        setMessage(`Successfully transferred $${amount} to ${recipientEmail}`)
      }
      setRecipientEmail('')
      setAmount('')
      
      // Refresh data after transfer using the unified fetch function
      await fetchWalletData(false, false, true)
    } catch (error: any) {
      setError(error.response?.data?.detail || error.message || 'Transfer failed')
    } finally {
      setLoading(false)
    }
  }, [session, recipientEmail, amount, fetchWalletData])

  const handleSignOut = async () => {
    try {
      authService.logout()
      // Force redirect to login page
      window.location.href = '/login'
    } catch (error) {
      console.error('Error signing out:', error)
      // Force redirect even if there's an error
      window.location.href = '/login'
    }
  }

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center space-y-4">
          <svg className="animate-spin h-12 w-12 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-400 text-lg">Loading wallet...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-6 mb-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Digital Wallet
              </h1>
              <p className="text-slate-400 text-sm mt-1">{session?.user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="px-5 py-2.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-600 hover:border-slate-500 transition-all font-medium"
            >
              Sign Out
            </button>
          </div>

          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white mb-8 shadow-lg shadow-indigo-500/25">
            <p className="text-sm opacity-90 mb-2 font-medium">Current Balance</p>
            <p className="text-5xl font-bold">${balance.toFixed(2)}</p>
          </div>

          <form onSubmit={handleTransfer} className="space-y-5 mb-6">
            <h2 className="text-2xl font-semibold text-slate-200 mb-6">Transfer Money</h2>
            
            <div>
              <label htmlFor="recipient" className="block text-sm font-medium text-slate-300 mb-2">
                Recipient Email
              </label>
              <input
                id="recipient"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="recipient@email.com"
              />
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-slate-300 mb-2">
                Amount ($)
              </label>
              <input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="0.00"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl backdrop-blur-sm">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 px-4 py-3 rounded-xl backdrop-blur-sm">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-500/25"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Transfer Money'
              )}
            </button>
          </form>
        </div>

        <div className="bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-slate-200">Transaction History</h2>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing || isFetchingRef.current}
              className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh transactions"
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
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-700/50 mb-4">
                <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-slate-400">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => {
                const isSent = tx.from_user_id === session.user.id
                const otherEmail = isSent ? tx.to_user_email : tx.from_user_email
                const isPending = tx.status === 'pending' || tx.id.startsWith('pending_')
                
                return (
                  <div
                    key={tx.id}
                    className={`p-5 rounded-xl border backdrop-blur-sm transition-all hover:scale-[1.02] ${
                      isPending
                        ? 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/50'
                        : isSent
                        ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/50'
                        : 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2 h-2 rounded-full ${
                            isPending ? 'bg-yellow-400 animate-pulse' : isSent ? 'bg-red-400' : 'bg-emerald-400'
                          }`}></div>
                          <p className="font-semibold text-slate-200">
                            {isPending ? 'Pending' : isSent ? 'Sent to' : 'Received from'}
                          </p>
                          {isPending && (
                            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                              Awaiting Review
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 ml-4">{otherEmail}</p>
                        <p className="text-xs text-slate-500 mt-2 ml-4">
                          {new Date(tx.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className={`text-2xl font-bold ${
                        isPending ? 'text-yellow-400' : isSent ? 'text-red-400' : 'text-emerald-400'
                      }`}>
                        {isSent ? '-' : '+'}${tx.amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

