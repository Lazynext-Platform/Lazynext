# ── Azure Key Vault ────────────────────────────────────────────────────────

resource "azurerm_key_vault" "secrets" {
  name                       = "lazynext-kv-${var.environment}-${random_string.storage_suffix.result}"
  location                   = azurerm_resource_group.rg.location
  resource_group_name        = azurerm_resource_group.rg.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 7

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

# ── Key Vault Secrets ───────────────────────────────────────────────────────

resource "azurerm_key_vault_secret" "all" {
  for_each = toset(local.secret_names)

  name         = replace(each.key, "-", "--") # Azure KV uses -- as safe hyphen
  value        = "UNSET_SECRET"               # Managed externally via az CLI
  key_vault_id = azurerm_key_vault.secrets.id
  content_type = "text/plain"

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

  lifecycle {
    ignore_changes = [value]
  }
}
