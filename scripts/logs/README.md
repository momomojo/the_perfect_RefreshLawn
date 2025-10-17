# Log Monitoring Setup

This directory contains scripts for monitoring Supabase Edge Function logs and capturing webhook payloads during development.

## Overview

The logging system provides:
- **Production Monitoring**: Tail Supabase Edge Function logs in real-time
- **Local Webhook Capture**: Capture webhook payloads during local testing
- **Claude Code Integration**: All logs saved to NDJSON files for AI analysis

## Directory Structure

```
logs/
  production/              # Production Edge Function logs
    all-functions.ndjson   # All functions combined
    stripe-webhook.ndjson  # stripe-webhook function only
    stripe-payment-api.ndjson  # stripe-payment-api function only
  development/             # Local development logs
    webhooks.ndjson        # Captured webhook payloads
```

## Prerequisites

### 1. Supabase CLI (for production monitoring)

```bash
# Install via npm
npm install -g supabase

# Or via Homebrew (Mac/Linux)
brew install supabase/tap/supabase

# Verify installation
supabase --version
```

### 2. Stripe CLI (for local webhook testing)

```bash
# Install via npm
npm install -g stripe

# Or via Homebrew (Mac/Linux)
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Verify installation
stripe --version
```

### 3. Get Your Supabase Project Ref

Option A - Via Dashboard:
1. Go to Supabase Dashboard
2. Select your project
3. Settings → General
4. Copy "Reference ID"

Option B - Via CLI:
```bash
supabase projects list
```

## Automatic Configuration

The scripts automatically load your Supabase project ref from `.env.logs`. This file was created during setup and contains your project configuration:

```bash
# .env.logs
SUPABASE_PROJECT_REF=iqxdatlqgvdcvyfdxywf
```

**No manual configuration needed!** All scripts will automatically use this project ref.

## Quick Start

### ⚡ One-Command Development Setup (Recommended!)

Launch all three terminals automatically:

```bash
npm run logs:launch
```

This single command will open three terminal windows:
1. **Webhook Receiver** - Captures local webhooks on port 8787
2. **Stripe Forwarding** - Forwards Stripe webhooks to your receiver
3. **Production Logs** - Monitors stripe-webhook function in real-time

**Platform Support:**
- ✅ Windows (PowerShell)
- ✅ macOS (Terminal.app)
- ✅ Linux (gnome-terminal, xterm, konsole)
- ✅ WSL (bash with tmux fallback)

### Manual Setup (Individual Terminals)

If you prefer to control each terminal manually:

#### Monitor Production Logs

```bash
# Option 1: Use npm scripts (recommended)
npm run logs:prod              # All functions
npm run logs:webhook           # stripe-webhook only
npm run logs:payment           # stripe-payment-api only

# Option 2: Run scripts directly
./scripts/logs/tail-production.sh
./scripts/logs/tail-stripe-webhook.sh
./scripts/logs/tail-stripe-payment.sh

# Option 3: Pass project ref as argument (overrides .env.logs)
./scripts/logs/tail-production.sh YOUR_PROJECT_REF
```

#### Capture Local Webhooks

```bash
# Terminal 1: Start webhook receiver
npm run logs:receiver

# Terminal 2: Forward Stripe webhooks
stripe listen --forward-to localhost:8787/ingest
```

## Usage Examples

### Example 1: Debug Production Webhook Processing

```bash
# Terminal 1: Tail webhook function
npm run logs:webhook

# Trigger a test webhook in Stripe Dashboard
# Watch logs appear in real-time

# Logs saved to: logs/production/stripe-webhook.ndjson
```

### Example 2: Test Payment Flow Locally

```bash
# Terminal 1: Start webhook receiver
npm run logs:receiver

# Terminal 2: Forward webhooks
stripe listen --forward-to localhost:8787/ingest

# Terminal 3: Run your app
npm start

# Create a test payment
# Watch webhook payloads captured to: logs/development/webhooks.ndjson
```

### Example 3: Monitor All Functions During Deployment

```bash
# Start monitoring before deployment
npm run logs:prod

# In another terminal, deploy functions
supabase functions deploy

# Watch logs for errors, cold starts, etc.
```

## Working with Log Files

All logs are saved in NDJSON format (newline-delimited JSON). Each line is a complete JSON object.

### View Recent Logs

```bash
# View last 10 lines
tail -n 10 logs/production/stripe-webhook.ndjson

# Follow logs in real-time
tail -f logs/production/stripe-webhook.ndjson

# Pretty-print JSON
tail -n 1 logs/production/stripe-webhook.ndjson | jq '.'
```

### Search Logs

```bash
# Find specific payment intent
grep "pi_1234567890" logs/production/stripe-webhook.ndjson

# Find errors
grep -i "error" logs/production/all-functions.ndjson

# Search with jq for structured queries
cat logs/production/stripe-webhook.ndjson | \
  jq 'select(.body.type == "payment_intent.succeeded")'
```

### Claude Code Analysis

Claude Code can directly read and analyze these logs:

**Ask Claude to:**
- "Show me recent webhook errors from logs/production/stripe-webhook.ndjson"
- "Find all payment_intent.succeeded events in the last hour"
- "Analyze why booking creation failed for payment intent pi_xxx"
- "Compare webhook timing between successful and failed bookings"

## Scripts Reference

### launch-dev.js (Cross-Platform Launcher)

Automatically launches all three terminals needed for development.

```bash
Usage: npm run logs:launch
       OR
       node scripts/logs/launch-dev.js
```

**What it does:**
- Detects your operating system (Windows/Mac/Linux/WSL)
- Launches platform-appropriate terminal windows:
  - Windows: PowerShell windows
  - macOS: Terminal.app windows
  - Linux: gnome-terminal/xterm/konsole
  - WSL: tmux panes (fallback)
- Opens three terminals:
  1. Webhook receiver (localhost:8787)
  2. Stripe webhook forwarding
  3. Production log monitoring

**Platform-Specific Launchers:**
- `launch-dev-windows.ps1` - Windows PowerShell launcher
- `launch-dev-unix.sh` - Unix/Linux/macOS/WSL launcher

### tail-production.sh

Tails all Edge Functions in production.

```bash
Usage: ./tail-production.sh [PROJECT_REF]
Output: logs/production/all-functions.ndjson
```

**Automatic Configuration:**
- Auto-loads `SUPABASE_PROJECT_REF` from `.env.logs`
- No manual setup required!

**Manual Override Options:**
- Pass project ref as first argument
- Set `SUPABASE_PROJECT_REF` environment variable
- Script will prompt if not found anywhere

### tail-stripe-webhook.sh

Tails only the `stripe-webhook` function.

```bash
Usage: ./tail-stripe-webhook.sh [PROJECT_REF]
Output: logs/production/stripe-webhook.ndjson
```

**Automatic Configuration:**
- Auto-loads `SUPABASE_PROJECT_REF` from `.env.logs`

**Most useful for:**
- Debugging webhook signature verification
- Monitoring webhook event processing
- Tracking booking creation from webhooks

### tail-stripe-payment.sh

Tails only the `stripe-payment-api` function.

```bash
Usage: ./tail-stripe-payment.sh [PROJECT_REF]
Output: logs/production/stripe-payment-api.ndjson
```

**Automatic Configuration:**
- Auto-loads `SUPABASE_PROJECT_REF` from `.env.logs`

**Most useful for:**
- Debugging PaymentIntent creation
- Monitoring payment setup flow
- Tracking ephemeral key generation

### start-webhook-receiver.sh

Starts local webhook receiver on port 8787.

```bash
Usage: ./start-webhook-receiver.sh
Output: logs/development/webhooks.ndjson
Server: http://localhost:8787
```

**Endpoints:**
- `/ingest` - Main webhook ingestion
- `/health` - Health check (returns uptime, log file info)

**Features:**
- Captures all HTTP methods (POST, GET, PUT, etc.)
- Logs full request (headers, body, query params)
- Pretty console output with Stripe event detection
- Graceful shutdown on Ctrl+C

## npm Scripts

The following scripts are available in `package.json`:

```json
{
  "logs:launch": "node scripts/logs/launch-dev.js",      // 🚀 Launch all terminals
  "logs:prod": "bash scripts/logs/tail-production.sh",   // All functions
  "logs:webhook": "bash scripts/logs/tail-stripe-webhook.sh",  // stripe-webhook only
  "logs:payment": "bash scripts/logs/tail-stripe-payment.sh",  // stripe-payment-api only
  "logs:receiver": "bash scripts/logs/start-webhook-receiver.sh"  // Local webhook receiver
}
```

### Recommended: Use logs:launch

The `logs:launch` command is the easiest way to get started - it automatically opens all three terminals you need for development.

## Troubleshooting

### "Supabase CLI not found"

```bash
# Install Supabase CLI
npm install -g supabase

# Or use Homebrew
brew install supabase/tap/supabase
```

### "Project ref not found"

```bash
# List your projects
supabase projects list

# Or check dashboard
# Dashboard → Settings → General → Reference ID
```

### "Permission denied" on scripts

```bash
# Make scripts executable
chmod +x scripts/logs/*.sh
```

### Webhook receiver not starting

```bash
# Check if port 8787 is in use
lsof -i :8787  # Mac/Linux
netstat -ano | findstr :8787  # Windows

# Kill existing process or change port in webhook_sink.js
```

### Stripe webhooks not forwarding

```bash
# Login to Stripe first
stripe login

# Verify webhook forwarding
stripe listen --forward-to localhost:8787/ingest --print-events
```

### Logs not appearing in files

The scripts use `tee` to write logs to files while displaying them. If logs aren't being written:

1. Check write permissions on `logs/` directory
2. Ensure `logs/production/` and `logs/development/` directories exist
3. Try running with `sudo` if permission issues persist

## Best Practices

### Production Monitoring

1. **Start monitoring before deployments**: Catch errors immediately
2. **Use function-specific scripts**: Less noise, easier to debug
3. **Keep logs running during testing**: Full context for debugging
4. **Check logs daily**: Proactive issue detection

### Local Development

1. **Always run webhook receiver during payment testing**
2. **Use Stripe CLI webhook forwarding for realistic testing**
3. **Compare webhook payloads between success/failure cases**
4. **Check both Edge Function logs and webhook receiver logs**

### Log Management

1. **Rotate logs periodically**: NDJSON files can grow large
2. **Archive old logs**: Move to `logs/archive/` before deletion
3. **Use jq for complex queries**: More powerful than grep
4. **Let Claude analyze logs**: AI excels at pattern recognition

## Example Workflows

### Workflow 1: Debug Production Webhook Issue

```bash
# 1. Start monitoring webhook function
npm run logs:webhook

# 2. Trigger webhook from Stripe Dashboard
# (Test → Send test webhook → payment_intent.succeeded)

# 3. Check logs in real-time
# Look for errors, status codes, timing

# 4. Ask Claude to analyze
# "Analyze the last webhook failure in logs/production/stripe-webhook.ndjson"
```

### Workflow 2: Test Complete Payment Flow

```bash
# Terminal 1: Tail payment creation function
npm run logs:payment

# Terminal 2: Tail webhook function
npm run logs:webhook

# Terminal 3: Run app
npm start

# Create booking in app
# Watch full flow: payment creation → webhook received → booking updated
```

### Workflow 3: Compare Dev vs Production

```bash
# Local test
npm run logs:receiver
stripe listen --forward-to localhost:8787/ingest
# (trigger payment)

# Production test
npm run logs:webhook
# (trigger payment)

# Compare logs
diff <(jq -S . < logs/development/webhooks.ndjson) \
     <(jq -S . < logs/production/stripe-webhook.ndjson)
```

## Advanced Usage

### Custom Log Filtering

```bash
# Only show errors
supabase functions logs --project-ref YOUR_REF \
  | grep -i "error" \
  | tee -a logs/production/errors-only.ndjson

# Only show specific event type
supabase functions logs --project-ref YOUR_REF --function stripe-webhook \
  | jq 'select(.body.type == "payment_intent.succeeded")' \
  | tee -a logs/production/payment-succeeded.ndjson
```

### Multiple Projects

```bash
# Set different project refs
export SUPABASE_PROJECT_REF_DEV="your-dev-ref"
export SUPABASE_PROJECT_REF_PROD="your-prod-ref"

# Tail dev
SUPABASE_PROJECT_REF=$SUPABASE_PROJECT_REF_DEV npm run logs:webhook

# Tail prod
SUPABASE_PROJECT_REF=$SUPABASE_PROJECT_REF_PROD npm run logs:webhook
```

### Scheduled Log Rotation

```bash
# Add to cron (Linux/Mac)
# Rotate logs daily at midnight
0 0 * * * cd /path/to/project && mv logs/production/all-functions.ndjson logs/archive/all-functions-$(date +\%Y\%m\%d).ndjson
```

## Support

For issues or questions:
1. Check [Supabase Docs](https://supabase.com/docs) for CLI help
2. Check [Stripe Docs](https://stripe.com/docs/cli) for webhook testing
3. Ask Claude Code to analyze logs and suggest fixes

## Related Documentation

- `CLAUDE.md` - Main project documentation
- `STRIPE_NATIVE_IMPLEMENTATION.md` - Payment flow architecture
- `WEBHOOK_REGISTRATION_INSTRUCTIONS.md` - Webhook setup guide
- `webhook_sink.js` - Local webhook receiver implementation
