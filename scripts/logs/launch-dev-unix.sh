#!/bin/bash

# Launch Development Log Monitoring (Unix/Linux/macOS/WSL)
#
# This script launches three terminal windows or tmux panes:
#   1. Local webhook receiver (port 8787)
#   2. Stripe CLI webhook forwarding
#   3. Production log monitoring
#
# Usage:
#   ./launch-dev-unix.sh
#   OR
#   npm run logs:launch

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Launching Development Log Monitoring"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "This will launch 3 terminal windows/panes:"
echo "  1. Webhook Receiver (localhost:8787)"
echo "  2. Stripe CLI Forwarding"
echo "  3. Production Log Monitoring"
echo ""
echo "Press Ctrl+C in each window to stop monitoring"
echo ""

# Function to launch in new terminal based on available terminal emulator
launch_terminal() {
  local title="$1"
  local command="$2"

  if command -v gnome-terminal &> /dev/null; then
    # GNOME Terminal (Linux)
    gnome-terminal --title="$title" -- bash -c "cd '$PROJECT_ROOT' && $command; exec bash"
  elif command -v xterm &> /dev/null; then
    # XTerm (Linux)
    xterm -title "$title" -e "cd '$PROJECT_ROOT' && $command; exec bash" &
  elif command -v konsole &> /dev/null; then
    # KDE Konsole (Linux)
    konsole --new-tab -e bash -c "cd '$PROJECT_ROOT' && $command; exec bash" &
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS Terminal
    osascript <<EOF
tell application "Terminal"
    do script "cd '$PROJECT_ROOT' && $command"
    set custom title of window 1 to "$title"
end tell
EOF
  else
    echo "Warning: No supported terminal emulator found"
    echo "Falling back to tmux..."
    return 1
  fi
  return 0
}

# Try to launch in separate terminals
if launch_terminal "Webhook Receiver" "node webhook_sink.js" && \
   launch_terminal "Stripe Forwarding" "stripe listen --forward-to localhost:8787/ingest" && \
   launch_terminal "Production Logs" "npm run logs:webhook"; then

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " All terminals launched!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

else
  # Fallback to tmux if terminal launching failed
  echo "Attempting to use tmux..."

  if ! command -v tmux &> /dev/null; then
    echo ""
    echo "Error: tmux not found and no supported terminal emulator available"
    echo ""
    echo "Please install one of the following:"
    echo "  • tmux:           sudo apt install tmux  (Linux)"
    echo "  • gnome-terminal: sudo apt install gnome-terminal  (Linux)"
    echo "  • xterm:          sudo apt install xterm  (Linux)"
    echo "  • Terminal.app is built-in on macOS"
    echo ""
    exit 1
  fi

  # Create tmux session with 3 panes
  SESSION_NAME="refreshlawn-logs"

  # Kill existing session if it exists
  tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true

  # Create new session with first pane (webhook receiver)
  tmux new-session -d -s "$SESSION_NAME" -n "logs" -c "$PROJECT_ROOT"
  tmux send-keys -t "$SESSION_NAME:0" "echo '=== Webhook Receiver ===' && node webhook_sink.js" C-m

  # Split window vertically (stripe forwarding)
  tmux split-window -v -t "$SESSION_NAME:0" -c "$PROJECT_ROOT"
  tmux send-keys -t "$SESSION_NAME:0.1" "echo '=== Stripe Forwarding ===' && stripe listen --forward-to localhost:8787/ingest" C-m

  # Split the bottom pane horizontally (production logs)
  tmux split-window -h -t "$SESSION_NAME:0.1" -c "$PROJECT_ROOT"
  tmux send-keys -t "$SESSION_NAME:0.2" "echo '=== Production Logs ===' && npm run logs:webhook" C-m

  # Select the top pane
  tmux select-pane -t "$SESSION_NAME:0.0"

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " tmux session created: $SESSION_NAME"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Layout:"
  echo "  ┌─────────────────────────┐"
  echo "  │  Webhook Receiver       │"
  echo "  ├──────────────┬──────────┤"
  echo "  │ Stripe Fwd   │ Prod Logs│"
  echo "  └──────────────┴──────────┘"
  echo ""
  echo "Commands:"
  echo "  Attach:  tmux attach -t $SESSION_NAME"
  echo "  Detach:  Ctrl+B then D"
  echo "  Kill:    tmux kill-session -t $SESSION_NAME"
  echo ""

  # Attach to the session
  tmux attach -t "$SESSION_NAME"
fi

echo ""
echo "Check your terminal windows for:"
echo "  • Webhook receiver status"
echo "  • Stripe CLI connection"
echo "  • Production logs streaming"
echo ""
echo "Logs are saved to:"
echo "  • logs/development/webhooks.ndjson"
echo "  • logs/production/stripe-webhook.ndjson"
echo ""
