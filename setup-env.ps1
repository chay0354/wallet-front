# PowerShell script to create/update .env.local file with correct environment variables
$envContent = @"
NEXT_PUBLIC_BACK_URL=http://127.0.0.1:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlcmR0dm5ocW1lYmlheWNseGNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjQ2ODIsImV4cCI6MjA4MjcwMDY4Mn0.-uXDP5Dy6w2Rn6ro7O6dfMHBTHKQGiboMC1MwC0H4vo
NEXT_PUBLIC_SUPABASE_URL=https://cerdtvnhqmebiayclxcd.supabase.co
"@

$envLocalPath = ".env.local"
$envPath = ".env"

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
Write-Host "IMPORTANT: Make sure your .env file has these variables with NEXT_PUBLIC_ prefix:" -ForegroundColor Cyan
Write-Host "  - NEXT_PUBLIC_BACK_URL" -ForegroundColor White
Write-Host "  - NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor White
Write-Host "  - NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor White
Write-Host ""
Write-Host "After updating, restart your Next.js dev server!" -ForegroundColor Yellow


