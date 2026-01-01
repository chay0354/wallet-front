# How to Disable Email Confirmation in Supabase

## Quick Fix Steps:

1. **Go to Supabase Dashboard:**
   - Visit: https://cerdtvnhqmebiayclxcd.supabase.co
   - Or go to: https://supabase.com/dashboard

2. **Navigate to Authentication Settings:**
   - Click on **"Authentication"** in the left sidebar
   - Click on **"Settings"** (or look for "Email Auth" settings)

3. **Disable Email Confirmation:**
   - Find the option: **"Enable email confirmations"** or **"Confirm email"**
   - **Uncheck/Disable** this option
   - Click **"Save"**

4. **Alternative: Auto-confirm via SQL (if settings don't work):**
   
   Run this SQL in your Supabase SQL Editor:
   
   ```sql
   -- Update auth configuration to disable email confirmation
   UPDATE auth.config 
   SET enable_signup = true,
       enable_email_confirmations = false;
   ```

   Or use this approach to auto-confirm existing users:
   
   ```sql
   -- Auto-confirm all users (run this if you have existing unconfirmed users)
   UPDATE auth.users 
   SET email_confirmed_at = NOW() 
   WHERE email_confirmed_at IS NULL;
   ```

## After Disabling:

- Users can sign up and sign in immediately
- No email verification required
- Account is active right away

## Important Notes:

- This change affects ALL users in your project
- Make sure this is what you want for your application
- Email confirmation is a security feature - disabling it means anyone with an email can create an account





