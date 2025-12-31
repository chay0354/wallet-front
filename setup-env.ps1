# PowerShell script to create/update .env.local file with correct environment variables
$envContent = @"
NEXT_PUBLIC_BACK_URL=https://wallet-back-nu.vercel.app/
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlcmR0dm5ocW1lYmlheWNseGNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjQ2ODIsImV4cCI6MjA4MjcwMDY4Mn0.-uXDP5Dy6w2Rn6ro7O6dfMHBTHKQGiboMC1MwC0H4vo
NEXT_PUBLIC_SUPABASE_URL=https://cerdtvnhqmebiayclxcd.supabase.co
"@

$envLocalPath = ".env.local"
$envPath = ".env"

# Fix .env file if it exists and has wrong variable names
if (Test-Path $envPath) {
    $envContentOld = Get-Content $envPath -Raw
    if ($envContentOld -match "back_url=" -and $envContentOld -notmatch "NEXT_PUBLIC_BACK_URL=") {
        Write-Host "Found .env file with 'back_url' - updating to NEXT_PUBLIC_BACK_URL..." -ForegroundColor Yellow
        $envContentOld = $envContentOld -replace "back_url=", "NEXT_PUBLIC_BACK_URL="
        $envContentOld | Out-File -FilePath $envPath -Encoding utf8 -NoNewline
        Write-Host ".env file updated!" -ForegroundColor Green
    }
}

# Check if .env.local exists
if (Test-Path $envLocalPath) {
    Write-Host ".env.local already exists." -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (y/n)"
    if ($overwrite -ne "y") {
        Write-Host "Skipping .env.local creation." -ForegroundColor Yellow
        exit
    }
}

# Create .env.local
$envContent | Out-File -FilePath $envLocalPath -Encoding utf8 -NoNewline
Write-Host ".env.local file created/updated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: Environment variables must have NEXT_PUBLIC_ prefix to work in browser:" -ForegroundColor Cyan
Write-Host "  - NEXT_PUBLIC_BACK_URL (not back_url)" -ForegroundColor White
Write-Host "  - NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor White
Write-Host "  - NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor White
Write-Host ""
Write-Host "After updating, restart your Next.js dev server!" -ForegroundColor Yellow


