# Launch Development Log Monitoring (Windows PowerShell)
#
# This script launches three terminal windows:
#   1. Local webhook receiver (port 8787)
#   2. Stripe CLI webhook forwarding
#   3. Production log monitoring
#
# Usage:
#   .\launch-dev-windows.ps1
#   OR
#   npm run logs:launch

# Get the project root directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path "$scriptDir\..\.."

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host " Launching Development Log Monitoring" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will launch 3 terminal windows:" -ForegroundColor Yellow
Write-Host "  1. Webhook Receiver (localhost:8787)" -ForegroundColor White
Write-Host "  2. Stripe CLI Forwarding" -ForegroundColor White
Write-Host "  3. Production Log Monitoring" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C in each window to stop monitoring" -ForegroundColor Gray
Write-Host ""

# Wait a moment for user to see the message
Start-Sleep -Seconds 2

# Terminal 1: Start webhook receiver
Write-Host "[1/3] Launching webhook receiver..." -ForegroundColor Green
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$projectRoot'; Write-Host 'Webhook Receiver' -ForegroundColor Cyan; Write-Host 'Listening on http://localhost:8787' -ForegroundColor Gray; Write-Host ''; node webhook_sink.js"
)
Start-Sleep -Milliseconds 500

# Terminal 2: Start Stripe CLI forwarding
Write-Host "[2/3] Launching Stripe webhook forwarding..." -ForegroundColor Green
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$projectRoot'; Write-Host 'Stripe Webhook Forwarding' -ForegroundColor Cyan; Write-Host 'Forwarding to http://localhost:8787/ingest' -ForegroundColor Gray; Write-Host ''; stripe listen --forward-to localhost:8787/ingest"
)
Start-Sleep -Milliseconds 500

# Terminal 3: Start production log monitoring
Write-Host "[3/3] Launching production log monitoring..." -ForegroundColor Green
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$projectRoot'; Write-Host 'Production Logs' -ForegroundColor Cyan; Write-Host 'Monitoring stripe-webhook function' -ForegroundColor Gray; Write-Host ''; npm run logs:webhook"
)

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host " All terminals launched!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Check your terminal windows for:" -ForegroundColor White
Write-Host "  • Webhook receiver status" -ForegroundColor Gray
Write-Host "  • Stripe CLI connection" -ForegroundColor Gray
Write-Host "  • Production logs streaming" -ForegroundColor Gray
Write-Host ""
Write-Host "Logs are saved to:" -ForegroundColor White
Write-Host "  • logs/development/webhooks.ndjson" -ForegroundColor Gray
Write-Host "  • logs/production/stripe-webhook.ndjson" -ForegroundColor Gray
Write-Host ""
