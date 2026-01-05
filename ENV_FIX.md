# Fix: supabaseUrl is required Error

## Problem
The error occurs because Next.js environment variables must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser.

## Solution

Your `.env` or `.env.local` file in the `wallet-front` directory must have these exact variable names:

```env
NEXT_PUBLIC_BACK_URL=https://wallet-back-nu.vercel.app/
NEXT_PUBLIC_SUPABASE_URL=https://cerdtvnhqmebiayclxcd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlcmR0dm5ocW1lYmlheWNseGNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjQ2ODIsImV4cCI6MjA4MjcwMDY4Mn0.-uXDP5Dy6w2Rn6ro7O6dfMHBTHKQGiboMC1MwC0H4vo
```

## Quick Fix Steps

1. **Open your `.env` file** in `wallet-front` directory

2. **Make sure it has these three lines** (with `NEXT_PUBLIC_` prefix):
   - `NEXT_PUBLIC_BACK_URL=https://wallet-back-nu.vercel.app/`
   - `NEXT_PUBLIC_SUPABASE_URL=https://cerdtvnhqmebiayclxcd.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

3. **Remove any lines like:**
   - `back_url=...` (wrong - needs NEXT_PUBLIC_ prefix)
   - `SUPABASE_URL=...` (wrong - needs NEXT_PUBLIC_ prefix)

4. **Restart your Next.js dev server:**
   ```powershell
   # Stop the server (Ctrl+C)
   # Then restart:
   npm run dev
   ```

## Or Use the Setup Script

Run this in PowerShell from the `wallet-front` directory:

```powershell
.\setup-env.ps1
```

This will create/update `.env.local` with the correct format.

## Why NEXT_PUBLIC_?

Next.js only exposes environment variables prefixed with `NEXT_PUBLIC_` to the browser for security reasons. Variables without this prefix are only available on the server side.







