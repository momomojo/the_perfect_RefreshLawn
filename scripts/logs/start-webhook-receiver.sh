#!/bin/bash

# Start Local Webhook Receiver
#
# Starts the webhook_sink.js server to capture webhook payloads
# during local development and testing.
#
# Usage:
#   ./start-webhook-receiver.sh
#   OR
#   npm run logs:receiver
#
# To forward Stripe webhooks to this receiver:
#   stripe listen --forward-to localhost:8787/ingest

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
WEBHOOK_SCRIPT="$PROJECT_ROOT/webhook_sink.js"

# Check if webhook_sink.js exists
if [ ! -f "$WEBHOOK_SCRIPT" ]; then
  echo "Error: webhook_sink.js not found at $WEBHOOK_SCRIPT"
  exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is not installed"
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Starting Local Webhook Receiver"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Navigate to project root and start the receiver
cd "$PROJECT_ROOT"
node "$WEBHOOK_SCRIPT"
