# Setup Instructions

## Quick Start

### 1. Environment Variables

Create `.env.local` in the root directory with:
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlcmR0dm5ocW1lYmlheWNseGNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjQ2ODIsImV4cCI6MjA4MjcwMDY4Mn0.-uXDP5Dy6w2Rn6ro7O6dfMHBTHKQGiboMC1MwC0H4vo
NEXT_PUBLIC_SUPABASE_URL=https://cerdtvnhqmebiayclxcd.supabase.co
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Create `backend/.env` with:
```
SUPABASE_URL=https://cerdtvnhqmebiayclxcd.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlcmR0dm5ocW1lYmlheWNseGNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjQ2ODIsImV4cCI6MjA4MjcwMDY4Mn0.-uXDP5Dy6w2Rn6ro7O6dfMHBTHKQGiboMC1MwC0H4vo
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlcmR0dm5ocW1lYmlheWNseGNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEyNDY4MiwiZXhwIjoyMDgyNzAwNjgyfQ.Q4ENANl5JhDb5Lu4KQwSD0oE313ZNRTJ4Ev0oQ8DhtQ
DATABASE_URL=postgres://postgres.cerdtvnhqmebiayclxcd:N5aZEvq03w6UZGJ9@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
```

### 2. Database Setup

1. Go to your Supabase dashboard: https://cerdtvnhqmebiayclxcd.supabase.co
2. Navigate to SQL Editor
3. Copy and paste the contents of `backend/setup_database.sql`
4. Run the SQL script

### 3. Frontend Setup

```bash
npm install
npm run dev
```

Frontend will run on http://localhost:3000

### 4. Backend Setup

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
python main.py
```

Backend will run on http://localhost:8000

## Usage

1. Start both servers
2. Open http://localhost:3000
3. Sign up with a new account
4. You'll start with $1000.00 balance
5. Transfer money to other users by email
6. View transaction history

