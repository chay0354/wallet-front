// Backend API URL configuration
// IMPORTANT: Next.js only exposes environment variables with NEXT_PUBLIC_ prefix to the browser
// This must be set in .env file or Vercel environment variables

const NEXT_PUBLIC_BACK_URL = process.env.NEXT_PUBLIC_BACK_URL

if (!NEXT_PUBLIC_BACK_URL) {
  const errorMsg = '❌ NEXT_PUBLIC_BACK_URL is required! Set it in your .env file or Vercel environment variables.'
  if (typeof window !== 'undefined') {
    console.error(errorMsg)
    throw new Error(errorMsg)
  } else {
    throw new Error(errorMsg)
  }
}

// Remove trailing slash if present
export const API_URL = NEXT_PUBLIC_BACK_URL.replace(/\/$/, '')


