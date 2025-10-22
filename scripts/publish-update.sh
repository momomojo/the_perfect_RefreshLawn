#!/bin/bash

# Script to publish EAS Updates (OTA) to different channels
# Usage: ./scripts/publish-update.sh <channel> <message>
# Example: ./scripts/publish-update.sh staging "Fix booking bug"

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if required arguments are provided
if [ $# -lt 2 ]; then
    echo -e "${RED}Error: Missing required arguments${NC}"
    echo "Usage: $0 <channel> <message>"
    echo ""
    echo "Available channels:"
    echo "  - development"
    echo "  - staging"
    echo "  - production"
    echo ""
    echo "Example:"
    echo "  $0 staging 'Fix critical payment bug'"
    exit 1
fi

CHANNEL=$1
MESSAGE=$2

# Validate channel
if [ "$CHANNEL" != "development" ] && [ "$CHANNEL" != "staging" ] && [ "$CHANNEL" != "production" ]; then
    echo -e "${RED}Error: Invalid channel '$CHANNEL'${NC}"
    echo "Valid channels: development, staging, production"
    exit 1
fi

echo -e "${YELLOW}📦 Publishing EAS Update to '$CHANNEL' channel...${NC}"
echo -e "${YELLOW}Message: $MESSAGE${NC}"
echo ""

# Confirm production deployments
if [ "$CHANNEL" == "production" ]; then
    echo -e "${YELLOW}⚠️  WARNING: You are publishing to PRODUCTION${NC}"
    read -p "Are you sure? (yes/no): " -r
    echo
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo -e "${RED}Deployment cancelled${NC}"
        exit 1
    fi
fi

# Publish the update
echo -e "${GREEN}Publishing update...${NC}"
npx eas-cli update --branch "$CHANNEL" --message "$MESSAGE"

# Success
echo ""
echo -e "${GREEN}✅ Update published successfully!${NC}"
echo ""
echo "📱 The update will be automatically downloaded by users on the '$CHANNEL' channel"
echo "   when they restart the app."
echo ""
echo "🔗 View updates: https://expo.dev/accounts/YOUR_ACCOUNT/projects/refreshlawn/updates"
