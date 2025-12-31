import { API_URL } from './config'

export interface User {
  id: string
  email: string
  full_name?: string | null
  created_at?: string
  balance?: number
  transaction_count?: number
}

export interface AuthResponse {
  access_token: string
  user: User
  expires_in: number
}

// Store token in localStorage
const TOKEN_KEY = 'wallet_access_token'
const USER_KEY = 'wallet_user'

export const authService = {
  // Sign up
  async signUp(email: string, password: string, fullName?: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName })
    })
    
    if (!response.ok) {
      const error = await response.json()
      // Handle validation errors (422)
      if (response.status === 422 && Array.isArray(error.detail)) {
        const errorMessages = error.detail.map((e: any) => `${e.loc?.join('.')}: ${e.msg}`).join(', ')
        throw new Error(`Validation error: ${errorMessages}`)
      }
      // Handle other errors
      const errorMsg = typeof error.detail === 'string' ? error.detail : (error.detail?.[0]?.msg || 'Signup failed')
      throw new Error(errorMsg)
    }
    
    const data: AuthResponse = await response.json()
    this.setToken(data.access_token)
    this.setUser(data.user)
    return data
  },

  // Login
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    
    if (!response.ok) {
      const error = await response.json()
      // Handle validation errors (422)
      if (response.status === 422 && Array.isArray(error.detail)) {
        const errorMessages = error.detail.map((e: any) => `${e.loc?.join('.')}: ${e.msg}`).join(', ')
        throw new Error(`Validation error: ${errorMessages}`)
      }
      // Handle other errors
      const errorMsg = typeof error.detail === 'string' ? error.detail : (error.detail?.[0]?.msg || 'Login failed')
      throw new Error(errorMsg)
    }
    
    const data: AuthResponse = await response.json()
    this.setToken(data.access_token)
    this.setUser(data.user)
    return data
  },

  // Get current session
  async getSession(): Promise<User | null> {
    const token = this.getToken()
    if (!token) return null

    try {
      const response = await fetch(`${API_URL}/api/auth/session`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) {
        this.logout()
        return null
      }
      
      const data = await response.json()
      this.setUser(data.user)
      return data.user
    } catch {
      this.logout()
      return null
    }
  },

  // Logout
  logout(): void {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },

  // Token management
  getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(TOKEN_KEY)
  },

  setToken(token: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(TOKEN_KEY, token)
  },

  // User management
  getUser(): User | null {
    if (typeof window === 'undefined') return null
    const userStr = localStorage.getItem(USER_KEY)
    return userStr ? JSON.parse(userStr) : null
  },

  setUser(user: User): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }
}

