#!/bin/bash

# Tail stripe-webhook Edge Function Logs
#
# Usage:
#   ./tail-stripe-webhook.sh [PROJECT_REF]
#   OR set SUPABASE_PROJECT_REF environment variable
#   OR it will prompt you

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs/production"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Load .env.logs if it exists (auto-loads SUPABASE_PROJECT_REF)
ENV_FILE="$PROJECT_ROOT/.env.logs"
if [ -f "$ENV_FILE" ]; then
  set -a  # automatically export all variables
  source "$ENV_FILE"
  set +a
fi

# Get project ref (priority: arg > env var > .env.logs > prompt)
PROJECT_REF="${1:-$SUPABASE_PROJECT_REF}"

if [ -z "$PROJECT_REF" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " Supabase Project Ref Required"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Get your project ref from:"
  echo "  1. Supabase Dashboard → Settings → General"
  echo "  2. Run: supabase projects list"
  echo ""
  read -p "Enter Supabase project ref: " PROJECT_REF

  if [ -z "$PROJECT_REF" ]; then
    echo "Error: Project ref is required"
    exit 1
  fi
fi

FUNCTION_NAME="stripe-webhook"
LOG_FILE="$LOG_DIR/${FUNCTION_NAME}.ndjson"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Tailing $FUNCTION_NAME Edge Function"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Project:  $PROJECT_REF"
echo " Function: $FUNCTION_NAME"
echo " Log File: $LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "Error: Supabase CLI not found. Install it first:"
  echo "  npm install -g supabase"
  echo "  OR"
  echo "  brew install supabase/tap/supabase"
  exit 1
fi

# Tail logs for specific function
supabase functions logs \
  --project-ref "$PROJECT_REF" \
  --function "$FUNCTION_NAME" \
  --since 1h \
  --follow \
  | tee -a "$LOG_FILE"
