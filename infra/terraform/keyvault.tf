# ── Azure Key Vault ────────────────────────────────────────────────────────

# Dedicated random suffix for the Key Vault name. Key Vault names are globally
# unique AND soft-deleted names stay reserved (and can't be purged on some
# subscription tiers). Using a separate suffix lets us mint a fresh, unused
# name if a prior name is stuck in a soft-deleted state.
resource "random_string" "kv_suffix" {
  length  = 6
  special = false
  upper   = false
}

resource "azurerm_key_vault" "secrets" {
  # Key Vault names must be 3-24 chars. "lznx-kv-" + env_short(<=4) + "-" +
  # 6-char suffix = <= 19 chars.
  name                       = "lznx-kv-${local.env_short}-${random_string.kv_suffix.result}"
  location                   = azurerm_resource_group.rg.location
  resource_group_name        = azurerm_resource_group.rg.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 90
  purge_protection_enabled   = true

  # Allow Container Apps managed identity to read secrets
  # (access policy will be added below)

  tags = {
    Environment = var.environment
    Project     = "lazynext"
  }
}

# Grant the Container Apps managed identity access to Key Vault
resource "azurerm_key_vault_access_policy" "container_apps" {
  key_vault_id = azurerm_key_vault.secrets.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_user_assigned_identity.container_apps.principal_id

  secret_permissions = [
    "Get",
    "List",
  ]
}

# Grant the deploying principal (the service principal / user running
# Terraform) full secret management so it can create/update the secrets
# below. Without this, `azurerm_key_vault_secret` writes fail with 403.
resource "azurerm_key_vault_access_policy" "deployer" {
  key_vault_id = azurerm_key_vault.secrets.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azurerm_client_config.current.object_id

  secret_permissions = [
    "Get",
    "List",
    "Set",
    "Delete",
    "Purge",
    "Recover",
  ]
}

# ── Key Vault Secrets ───────────────────────────────────────────────────────

resource "azurerm_key_vault_secret" "all" {
  for_each = toset(local.secret_names)

  name         = replace(each.key, "-", "--") # Azure KV uses -- as safe hyphen
  value        = "UNSET_SECRET"               # Managed externally via az CLI
  key_vault_id = azurerm_key_vault.secrets.id
  content_type = "text/plain"

  # The deployer access policy must exist before secrets can be written.
  depends_on = [azurerm_key_vault_access_policy.deployer]

  # Values should be set after creation:
  # az keyvault secret set --vault-name lazynext-kv-{env} --name "{name}" --value "{value}"

  lifecycle {
    ignore_changes = [value]
  }
}

# Database connection string (computed)
resource "azurerm_key_vault_secret" "database_url" {
  name         = "DATABASE--URL"
  value        = "postgresql://lazynext_app:${var.db_password}@${azurerm_postgresql_flexible_server.postgres.fqdn}:5432/lazynext?sslmode=require"
  key_vault_id = azurerm_key_vault.secrets.id
  content_type = "text/plain"

  # The deployer access policy must exist before secrets can be written.
  depends_on = [azurerm_key_vault_access_policy.deployer]

  lifecycle {
    ignore_changes = [value]
  }
}
