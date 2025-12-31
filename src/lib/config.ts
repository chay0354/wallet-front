// Backend API URL configuration
// IMPORTANT: Vite only exposes environment variables with VITE_ prefix to the browser
// This must be set in .env file or Vercel environment variables

const VITE_BACK_URL = import.meta.env.VITE_BACK_URL

// During build time, provide a fallback to prevent build failures
// At runtime, this will be checked and errors will be thrown in the browser
const getApiUrl = () => {
  if (VITE_BACK_URL) {
    return VITE_BACK_URL.replace(/\/$/, '')
  }
  
  // During build/server-side, return a placeholder
  // This allows the build to complete even if env var is not set
  if (import.meta.env.SSR) {
    return 'https://wallet-back-nu.vercel.app'
  }
  
  // In browser at runtime, throw error if not set
  const errorMsg = '❌ VITE_BACK_URL is required! Set it in your .env file or Vercel environment variables.'
  console.error(errorMsg)
  throw new Error(errorMsg)
}

export const API_URL = getApiUrl()


