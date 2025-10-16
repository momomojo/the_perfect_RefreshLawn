# =============================================================================
# Stripe Secret Key Setup Script for Supabase Edge Functions
# =============================================================================
# This script helps you configure the STRIPE_SECRET_KEY for Edge Functions

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host " Stripe Edge Function Configuration Helper" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Get the Stripe Secret Key
Write-Host "STEP 1: Get Your Stripe Secret Key" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Yellow
Write-Host "1. Open your browser and go to: https://dashboard.stripe.com/test/apikeys" -ForegroundColor White
Write-Host "2. Click 'Reveal test key' in the 'Secret key' section" -ForegroundColor White
Write-Host "3. Copy the key (it starts with 'sk_test_')" -ForegroundColor White
Write-Host ""

# Prompt for the key
$stripeKey = Read-Host "Paste your Stripe secret key here"

# Validate the key format
if (-not ($stripeKey -match '^sk_test_[a-zA-Z0-9]+$')) {
    Write-Host "" -ForegroundColor Red
    Write-Host "ERROR: Invalid Stripe secret key format!" -ForegroundColor Red
    Write-Host "The key should start with 'sk_test_' followed by alphanumeric characters." -ForegroundColor Red
    Write-Host "Please run this script again with the correct key." -ForegroundColor Red
    exit 1
}

Write-Host "" -ForegroundColor Green
Write-Host "Valid Stripe secret key detected!" -ForegroundColor Green
Write-Host ""

# Step 2: Set the secret in Supabase
Write-Host "STEP 2: Configure Supabase Edge Function Secret" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Yellow
Write-Host "Running: supabase secrets set --project-ref iqxdatlqgvdcvyfdxywf STRIPE_SECRET_KEY=..." -ForegroundColor White
Write-Host ""

try {
    $output = & supabase secrets set --project-ref iqxdatlqgvdcvyfdxywf STRIPE_SECRET_KEY="$stripeKey" 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "" -ForegroundColor Green
        Write-Host "SUCCESS! Stripe secret key configured successfully!" -ForegroundColor Green
        Write-Host ""

        # Step 3: Verify
        Write-Host "STEP 3: Verify Configuration" -ForegroundColor Yellow
        Write-Host "--------------------------------------" -ForegroundColor Yellow
        Write-Host "Checking if secret was set..." -ForegroundColor White
        Write-Host ""

        & supabase secrets list --project-ref iqxdatlqgvdcvyfdxywf

        Write-Host "" -ForegroundColor Green
        Write-Host "==============================================================================" -ForegroundColor Cyan
        Write-Host " Configuration Complete!" -ForegroundColor Cyan
        Write-Host "==============================================================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Next Steps:" -ForegroundColor Yellow
        Write-Host "1. Test the payment method page in your app" -ForegroundColor White
        Write-Host "2. Navigate to: http://localhost:8082/" -ForegroundColor White
        Write-Host "3. Go through the booking flow to the payment method page" -ForegroundColor White
        Write-Host "4. The page should now load payment methods successfully" -ForegroundColor White
        Write-Host ""
        Write-Host "If still not working, check logs with:" -ForegroundColor Yellow
        Write-Host "  supabase functions logs stripe-customer-api --project-ref iqxdatlqgvdcvyfdxywf" -ForegroundColor White
        Write-Host ""

    } else {
        Write-Host "" -ForegroundColor Red
        Write-Host "ERROR: Failed to set Stripe secret key" -ForegroundColor Red
        Write-Host "Output: $output" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please try manually with:" -ForegroundColor Yellow
        Write-Host "  supabase secrets set --project-ref iqxdatlqgvdcvyfdxywf STRIPE_SECRET_KEY=`"YOUR_KEY_HERE`"" -ForegroundColor White
        exit 1
    }
} catch {
    Write-Host "" -ForegroundColor Red
    Write-Host "ERROR: Exception occurred: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please ensure:" -ForegroundColor Yellow
    Write-Host "1. Supabase CLI is installed and authenticated" -ForegroundColor White
    Write-Host "2. You have access to project iqxdatlqgvdcvyfdxywf" -ForegroundColor White
    Write-Host "3. Your CLI is up to date: supabase --version" -ForegroundColor White
    exit 1
}
