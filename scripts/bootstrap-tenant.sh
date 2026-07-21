#!/bin/bash
# One-time bootstrap: creates a real v2 organization plus its first
# tenant_admin login, via the same owner-console API endpoints the
# owner-console UI itself calls (POST /owner/organizations, then
# POST /owner/organizations/:id/bootstrap-admin). No direct DB access —
# this only talks to your deployed v2 API, so it works the same whether
# you run it from your laptop or CI.
#
# Requires: curl, jq.
#
# Usage:
#   API_BASE_URL=https://your-v2-api.example.com \
#   OWNER_EMAIL=owner@example.com \
#   ORG_NAME="My Real Company" \
#   ORG_SLUG=my-real-company \
#   ADMIN_USERNAME=admin \
#   ADMIN_FULL_NAME="Your Name" \
#   ./scripts/bootstrap-tenant.sh
#
# OWNER_PASSWORD / ADMIN_PASSWORD are prompted for interactively if not
# already set in the environment, so they never need to be typed into a
# command line or left in shell history.

set -euo pipefail

command -v curl >/dev/null || { echo "curl is required" >&2; exit 1; }
command -v jq >/dev/null || { echo "jq is required" >&2; exit 1; }

: "${API_BASE_URL:?Set API_BASE_URL to the base URL of your deployed v2 API (e.g. https://api.yourapp.com)}"
: "${OWNER_EMAIL:?Set OWNER_EMAIL to your platform-owner login email}"
: "${ORG_NAME:?Set ORG_NAME to the organization display name}"
: "${ORG_SLUG:?Set ORG_SLUG to a lowercase-hyphen slug, e.g. my-real-company}"
: "${ADMIN_USERNAME:?Set ADMIN_USERNAME for the first tenant admin (lowercase letters/numbers/./-/_ only)}"
: "${ADMIN_FULL_NAME:?Set ADMIN_FULL_NAME for the first tenant admin display name}"

if [ -z "${OWNER_PASSWORD:-}" ]; then
  read -r -s -p "Owner password for $OWNER_EMAIL: " OWNER_PASSWORD
  echo
fi
if [ -z "${ADMIN_PASSWORD:-}" ]; then
  read -r -s -p "Password to set for tenant admin '$ADMIN_USERNAME' (min 8 chars): " ADMIN_PASSWORD
  echo
fi

# Performs a JSON POST, fails loudly with the response body on any non-2xx.
api_post() {
  local path="$1" body="$2" auth_header="${3:-}"
  local response status http_body
  if [ -n "$auth_header" ]; then
    response=$(curl -sS -w '\n%{http_code}' -X POST "$API_BASE_URL$path" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $auth_header" \
      -d "$body")
  else
    response=$(curl -sS -w '\n%{http_code}' -X POST "$API_BASE_URL$path" \
      -H "Content-Type: application/json" \
      -d "$body")
  fi
  status=$(echo "$response" | tail -n1)
  http_body=$(echo "$response" | sed '$d')
  if [ "$status" -lt 200 ] || [ "$status" -ge 300 ]; then
    echo "Request to $path failed (HTTP $status):" >&2
    echo "$http_body" >&2
    exit 1
  fi
  echo "$http_body"
}

echo "==> Logging in as platform owner…"
login_body=$(jq -n --arg email "$OWNER_EMAIL" --arg password "$OWNER_PASSWORD" \
  '{email: $email, password: $password}')
login_response=$(api_post "/owner/auth/login" "$login_body")
ACCESS_TOKEN=$(echo "$login_response" | jq -r '.data.accessToken')
if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
  echo "Login succeeded but no accessToken was returned — check the API response shape." >&2
  exit 1
fi

echo "==> Creating organization '$ORG_NAME' ($ORG_SLUG)…"
org_body=$(jq -n --arg name "$ORG_NAME" --arg slug "$ORG_SLUG" '{name: $name, slug: $slug}')
org_response=$(api_post "/owner/organizations" "$org_body" "$ACCESS_TOKEN")
ORG_ID=$(echo "$org_response" | jq -r '.data.id')
echo "    Organization id: $ORG_ID"

echo "==> Creating tenant admin '$ADMIN_USERNAME'…"
admin_body=$(jq -n \
  --arg username "$ADMIN_USERNAME" \
  --arg password "$ADMIN_PASSWORD" \
  --arg fullName "$ADMIN_FULL_NAME" \
  '{username: $username, password: $password, fullName: $fullName}')
api_post "/owner/organizations/$ORG_ID/bootstrap-admin" "$admin_body" "$ACCESS_TOKEN" >/dev/null

echo
echo "Done. Log in at your v2 web app's tenant login page with:"
echo "    Org slug:  $ORG_SLUG"
echo "    Username:  $ADMIN_USERNAME"
echo "    Password:  (the one you just set)"
