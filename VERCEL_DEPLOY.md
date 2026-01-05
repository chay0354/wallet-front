# Vercel Deployment Guide

This guide will walk you through deploying the wallet-front application to Vercel.

## Prerequisites

1. A GitHub account with the repository at: https://github.com/chay0354/wallet-front.git
2. A Vercel account (sign up at https://vercel.com if you don't have one)
3. Your backend API URL (e.g., `https://wallet-back-nu.vercel.app`)

## Step-by-Step Deployment Instructions

### Step 1: Push Code to GitHub

If you haven't already, make sure your code is pushed to GitHub:

```bash
cd wallet-front
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Step 2: Sign in to Vercel

1. Go to [https://vercel.com](https://vercel.com)
2. Click **"Sign Up"** or **"Log In"**
3. Sign in with your GitHub account (recommended for easy integration)

### Step 3: Import Your Project

1. Once logged in, click **"Add New..."** → **"Project"**
2. You'll see a list of your GitHub repositories
3. Find and select **"wallet-front"** repository
4. Click **"Import"**

### Step 4: Configure Project Settings

Vercel will auto-detect Next.js, but verify these settings:

- **Framework Preset**: Next.js (should be auto-detected)
- **Root Directory**: `./` (or leave blank if root is the frontend)
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm install` (auto-detected)

### Step 5: Add Environment Variables

**IMPORTANT**: You must add your environment variables before deploying!

1. In the project configuration page, scroll down to **"Environment Variables"**
2. Click **"Add"** and add the following variable:

   - **Name**: `NEXT_PUBLIC_BACK_URL`
   - **Value**: Your backend API URL (e.g., `https://wallet-back-nu.vercel.app`)
   - **Environment**: Select all (Production, Preview, Development)

3. Click **"Save"**

### Step 6: Deploy

1. Click **"Deploy"** button
2. Vercel will:
   - Install dependencies
   - Build your Next.js application
   - Deploy to a production URL

### Step 7: Verify Deployment

1. Wait for the build to complete (usually 1-3 minutes)
2. Once deployed, you'll see a success message with your deployment URL
3. Click the URL to visit your live application
4. Test the application to ensure it's working correctly

## Updating Your Deployment

After making changes to your code:

1. Push changes to GitHub:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```

2. Vercel will automatically:
   - Detect the push
   - Trigger a new deployment
   - Build and deploy your updated application

## Managing Environment Variables

To update environment variables after deployment:

1. Go to your project dashboard on Vercel
2. Navigate to **Settings** → **Environment Variables**
3. Add, edit, or remove variables as needed
4. Redeploy your application for changes to take effect

## Custom Domain (Optional)

To add a custom domain:

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow Vercel's instructions to configure DNS

## Troubleshooting

### Build Fails

- Check the build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility (Next.js 14 requires Node 18+)

### Environment Variables Not Working

- Make sure variable names start with `NEXT_PUBLIC_` for client-side access
- Redeploy after adding/updating environment variables
- Check that variables are added to all environments (Production, Preview, Development)

### API Connection Issues

- Verify `NEXT_PUBLIC_BACK_URL` is set correctly
- Ensure your backend API is deployed and accessible
- Check CORS settings on your backend if you see CORS errors

## Support

For more help:
- Vercel Documentation: https://vercel.com/docs
- Next.js Documentation: https://nextjs.org/docs



