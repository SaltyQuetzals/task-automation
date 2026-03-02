#!/bin/bash

# Send a Discord notification to the configured webhook
# Usage: ./notify-discord.sh <message> <run_url> <webhook_url>

set -e

if [ $# -lt 3 ]; then
  echo "Error: Missing required arguments"
  echo "Usage: $0 <message> <run_url> <webhook_url>"
  exit 1
fi

MESSAGE="$1"
RUN_URL="$2"
WEBHOOK_URL="$3"

# Append the GitHub run link to the message
MESSAGE="${MESSAGE}
[View GitHub Run →]($RUN_URL)"

# Escape the message as JSON
MESSAGE_JSON=$(printf '%s' "$MESSAGE" | jq -Rs .)

# Send the Discord notification
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d @- << EOF
{
  "content": "🚨 **auto-scripts Alert**",
  "embeds": [{
    "description": $MESSAGE_JSON,
    "color": 15158332
  }]
}
EOF
