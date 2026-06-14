#!/bin/bash
set -e

CODE="$1"
if [ -z "$CODE" ] && [ -f outbox/.trigger-whoop-auth ]; then
  CODE=$(cat outbox/.trigger-whoop-auth | tr -d '\n')
fi

echo "Code length: ${#CODE}"
mkdir -p outbox

# Try 4 redirect_uri variants
for URI in "$WHOOP_REDIRECT_URI" "${WHOOP_REDIRECT_URI%/}" "https://www.whoop.com/" "https://www.whoop.com"; do
  echo "=== Trying: $URI ==="
  
  RESPONSE=$(curl -s -X POST "https://api.prod.whoop.com/oauth/oauth2/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=authorization_code&code=$CODE&client_id=$WHOOP_CLIENT_ID&client_secret=$WHOOP_CLIENT_SECRET&redirect_uri=$URI")
  
  echo "${RESPONSE:0:200}"
  
  if echo "$RESPONSE" | grep -q "access_token"; then
    echo "SUCCESS with: $URI"
    echo "$RESPONSE" > /tmp/whoop_tokens.json
    echo '{"status":"success"}' > outbox/whoop-auth-result.json
    
    # Store tokens as secrets
    pip install pynacl requests -q 2>/dev/null
    python3 scripts/whoop_store_tokens.py
    exit 0
  fi
done

echo "ALL VARIANTS FAILED"
echo "$RESPONSE" > outbox/whoop-auth-result.json
