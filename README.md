# Digital Wallet System

A full-stack digital wallet application with money transfer capabilities, built with Next.js (React) frontend and FastAPI (Python) backend, using Supabase for authentication and database.

## Features

- 🔐 Email and password authentication (Sign up / Sign in)
- 💰 View wallet balance
- 💸 Transfer money between users
- 📊 Transaction history
- 🎨 Modern, responsive UI

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database & Auth**: Supabase (PostgreSQL)

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- Supabase account (already configured)

### Frontend Setup

1. Install dependencies:
```bash
npm install
```

2. The environment variables are already configured in `.env.local`

3. Run the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
```

3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. The environment variables are already configured in `backend/.env`

6. Run the backend server:
```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --reload --port 8000
```

The backend API will be available at `http://localhost:8000`

### Database Setup

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run the SQL script from `backend/setup_database.sql` to create the necessary tables

## Usage

1. Start both the frontend and backend servers
2. Open `http://localhost:3000` in your browser
3. Sign up with a new account or sign in with existing credentials
4. You'll start with a balance of $1000.00
5. Transfer money to other users by entering their email address
6. View your transaction history

## API Endpoints

- `GET /api/balance` - Get current wallet balance
- `GET /api/transactions` - Get transaction history
- `POST /api/transfer` - Transfer money to another user

All endpoints require authentication via Bearer token in the Authorization header.

## Project Structure

```
transaction-blocker/
├── app/                 # Next.js app directory
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Main page
│   └── globals.css     # Global styles
├── components/          # React components
│   ├── Auth.tsx        # Authentication component
│   └── Dashboard.tsx   # Wallet dashboard
├── lib/                # Utility libraries
│   └── supabase.ts     # Supabase client
├── backend/            # Python backend
│   ├── main.py        # FastAPI application
│   ├── requirements.txt
│   └── setup_database.sql
└── package.json
```

## Notes

- New users automatically receive a starting balance of $1000.00
- All transactions are recorded and visible in the transaction history
- The system uses Supabase Auth for secure authentication
- The backend uses Supabase Service Role Key for database operations

