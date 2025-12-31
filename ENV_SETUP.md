# Environment Variables Setup

## Required Environment Variables

For the frontend to access environment variables in the browser, they must be prefixed with `NEXT_PUBLIC_`.

Your `.env` or `.env.local` file should contain:

```
NEXT_PUBLIC_BACK_URL=http://127.0.0.1:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlcmR0dm5ocW1lYmlheWNseGNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjQ2ODIsImV4cCI6MjA4MjcwMDY4Mn0.-uXDP5Dy6w2Rn6ro7O6dfMHBTHKQGiboMC1MwC0H4vo
NEXT_PUBLIC_SUPABASE_URL=https://cerdtvnhqmebiayclxcd.supabase.co
```

## Important Notes

- Variables without `NEXT_PUBLIC_` prefix are only available on the server side
- After changing `.env` file, restart the Next.js dev server
- The `NEXT_PUBLIC_BACK_URL` is used by the frontend to connect to the backend API


