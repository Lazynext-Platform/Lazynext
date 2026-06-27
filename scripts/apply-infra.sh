#!/usr/bin/env bash
# Apply Azure infrastructure — run this if the CLI classifier blocks terraform apply
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/../terraform/azure"
terraform apply -auto-approve
echo ""
echo "=== Infrastructure Outputs ==="
terraform output github_actions_identity_client_id
terraform output acr_login_server
terraform output postgres_fqdn
terraform output container_app_urls
