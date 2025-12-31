# Environment Variables Setup

## Required Environment Variables

For the frontend to access environment variables in the browser, they must be prefixed with `NEXT_PUBLIC_`.

### Local Development

Create a `.env.local` file in the `wallet-front` directory:

```
NEXT_PUBLIC_BACK_URL=https://wallet-back-nu.vercel.app/
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlcmR0dm5ocW1lYmlheWNseGNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjQ2ODIsImV4cCI6MjA4MjcwMDY4Mn0.-uXDP5Dy6w2Rn6ro7O6dfMHBTHKQGiboMC1MwC0H4vo
NEXT_PUBLIC_SUPABASE_URL=https://cerdtvnhqmebiayclxcd.supabase.co
```

### Vercel Deployment (Production)

**IMPORTANT:** You must set these environment variables in Vercel:

1. Go to your Vercel project settings
2. Navigate to **Settings** → **Environment Variables**
3. Add these variables:
   - `NEXT_PUBLIC_BACK_URL` = `https://wallet-back-nu.vercel.app/`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://cerdtvnhqmebiayclxcd.supabase.co`
4. Make sure to select **Production**, **Preview**, and **Development** environments
5. Redeploy your application

## Important Notes

- Variables without `NEXT_PUBLIC_` prefix are only available on the server side
- After changing `.env.local` file, **restart the Next.js dev server**
- The `NEXT_PUBLIC_BACK_URL` is used by the frontend to connect to the backend API
- **If `NEXT_PUBLIC_BACK_URL` is not set, the frontend will fall back to `http://localhost:8000`** (which won't work in production!)


