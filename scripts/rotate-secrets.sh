#!/usr/bin/env bash
# rotate-secrets.sh — Rotate database passwords and API keys
# Usage:
#   ./scripts/rotate-secrets.sh --db          # Rotate DB password
#   ./scripts/rotate-secrets.sh --api-keys    # Rotate all API keys
#   ./scripts/rotate-secrets.sh --all         # Rotate everything
set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────────────

ENVIRONMENT="${ENVIRONMENT:-production}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5434}"
DB_USER="${DB_USER:-lazynext}"
DB_NAME="${DB_NAME:-lazynext}"

# ── Generate random passwords/keys ──────────────────────────────────────────

generate_password() {
  local length="${1:-32}"
  openssl rand -base64 "$length" | tr -d '\n/+=' | cut -c1-"$length"
}

generate_api_key() {
  local prefix="${1:-sk}"
  echo "${prefix}_$(openssl rand -hex 24)"
}

# ── Rotate Database Password ────────────────────────────────────────────────

rotate_db_password() {
  local new_password
  new_password=$(generate_password 32)

  echo "🔐 Rotating database password for: $DB_HOST:$DB_PORT"

  # Update PostgreSQL user password
  export PGPASSWORD="${DB_PASSWORD:-}"
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
    "ALTER USER ${DB_USER} WITH PASSWORD '${new_password}';" 2>/dev/null || {
    echo "❌ Failed to update database password. Ensure DB credentials are set."
    exit 1
  }

  # Update the connection string in .env or secrets file
  local env_file="${REPO_ROOT:-.}/.env"
  local connection_string="postgresql://${DB_USER}:${new_password}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require"

  if [ -f "$env_file" ]; then
    sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=${connection_string}|" "$env_file"
    echo "✅ .env updated: DATABASE_URL"
    rm -f "${env_file}.bak"
  fi

  echo "✅ Database password rotated."
  echo "   Restart services via Docker Compose to pick up the new password:"
  echo "   docker compose restart"
}

# ── Rotate API Keys ─────────────────────────────────────────────────────────

rotate_api_key() {
  local key_name="$1"
  local prefix="$2"
  local new_value
  new_value=$(generate_api_key "$prefix")

  echo "🔑 Rotating: $key_name"

  local env_file="${REPO_ROOT:-.}/.env"
  if [ -f "$env_file" ]; then
    sed -i.bak "s|^${key_name}=.*|${key_name}=${new_value}|" "$env_file" 2>/dev/null || \
      echo "${key_name}=${new_value}" >> "$env_file"
    rm -f "${env_file}.bak"
  else
    echo "${key_name}=${new_value}" >> "$env_file"
  fi

  echo "   Updated: $key_name"
}

rotate_all_api_keys() {
  echo "🔑 Rotating all API keys..."
  rotate_api_key "gemini--api--key" "AIza"
  rotate_api_key "dodo--api--key" "sk_test"
  rotate_api_key "dodo--webhook--secret" "whsec"
  rotate_api_key "resend--api--key" "re"
  echo "✅ All API keys rotated."
}

# ── Main ────────────────────────────────────────────────────────────────────

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

case "${1:-}" in
  --db)
    rotate_db_password
    ;;
  --api-keys)
    rotate_all_api_keys
    ;;
  --all)
    rotate_db_password
    echo ""
    rotate_all_api_keys
    ;;
  *)
    echo "Usage: $0 --db | --api-keys | --all"
    exit 1
    ;;
esac
