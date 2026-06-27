# ── Azure Backup Vault & Policies ──────────────────────────────────────────
# Data Protection Backup Vault for PostgreSQL long-term retention (beyond the
# built-in 30-day backup). Recovery Services Vault for future VM / File Share
# protection. Storage blob operational backup and Key Vault backup config.

# ── Recovery Services Vault (VMs, File Shares, SQL in VM) ───────────────────

resource "azurerm_recovery_services_vault" "main" {
  name                = "lazynext-rsv-${var.environment}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "Standard"

  storage_mode_type             = var.environment == "production" ? "GeoRedundant" : "LocallyRedundant"
  cross_region_restore_enabled  = var.environment == "production"
  public_network_access_enabled = false

  tags = {
    Environment = var.environment
    Project     = "lazynext"
    ManagedBy   = "terraform"
  }
}

# ── Data Protection Backup Vault (PostgreSQL, Blob, Disk) ───────────────────

resource "azurerm_data_protection_backup_vault" "main" {
  name                = "lazynext-bv-${var.environment}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  datastore_type      = "VaultStore"
  redundancy          = var.environment == "production" ? "GeoRedundant" : "LocallyRedundant"

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = var.environment
    Project     = "lazynext"
    ManagedBy   = "terraform"
  }
}

# ── Role Assignments for Backup Vault ───────────────────────────────────────
# The Backup Vault managed identity needs permissions on the PostgreSQL server,
# Key Vault, and storage account to perform and store backups.

# Contributor on Resource Group (needed for PostgreSQL backup operations)
resource "azurerm_role_assignment" "backup_vault_rg" {
  scope                = azurerm_resource_group.rg.id
  role_definition_name = "Contributor"
  principal_id         = azurerm_data_protection_backup_vault.main.identity[0].principal_id
}

# Storage Blob Data Contributor on media storage (backup data destination)
resource "azurerm_role_assignment" "backup_vault_storage" {
  scope                = azurerm_storage_account.media.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_data_protection_backup_vault.main.identity[0].principal_id
}

# Key Vault access policy for Backup Vault (read secrets for backup)
resource "azurerm_key_vault_access_policy" "backup_vault" {
  key_vault_id = azurerm_key_vault.secrets.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_data_protection_backup_vault.main.identity[0].principal_id

  secret_permissions = [
    "Get",
    "List",
    "Backup",
  ]

  key_permissions = [
    "Get",
    "List",
    "Backup",
  ]
}

# ── PostgreSQL Flexible Server Backup Policy ────────────────────────────────
# Daily at 02:00 UTC, retained for 30 days.

resource "azurerm_data_protection_backup_policy_postgresql_flexible_server" "main" {
  name     = "lazynext-pg-daily-0200-${var.environment}"
  vault_id = azurerm_data_protection_backup_vault.main.id

  # Daily backup at 2:00 AM UTC, ISO 8601 recurring time expression
  backup_repeating_time_intervals = [
    "R/2025-01-01T${var.backup_policy_time}:00+00:00/P1D"
  ]

  # Retain backups for the configured number of days in the VaultStore
  default_retention_rule {
    life_cycle {
      duration        = "P${var.backup_retention_days}D"
      data_store_type = "VaultStore"
    }
  }
}

# ── PostgreSQL Flexible Server Backup Instance ──────────────────────────────

resource "azurerm_data_protection_backup_instance_postgresql_flexible_server" "main" {
  name             = "lazynext-pg-backup-instance-${var.environment}"
  location         = azurerm_data_protection_backup_vault.main.location
  vault_id         = azurerm_data_protection_backup_vault.main.id
  server_id        = azurerm_postgresql_flexible_server.postgres.id
  backup_policy_id = azurerm_data_protection_backup_policy_postgresql_flexible_server.main.id
}

# ── Storage Account Blob Operational Backup ─────────────────────────────────
# Enables point-in-time restore for block blobs with operational backup tier.
# Managed at the storage account level — no additional backup schedule needed.

resource "azurerm_data_protection_backup_policy_blob_storage" "media" {
  name     = "lazynext-blob-backup-policy-${var.environment}"
  vault_id = azurerm_data_protection_backup_vault.main.id

  operational_default_retention_duration = "P${var.backup_retention_days}D"
}

resource "azurerm_data_protection_backup_instance_blob_storage" "media" {
  name               = "lazynext-blob-backup-instance-${var.environment}"
  location           = azurerm_data_protection_backup_vault.main.location
  vault_id           = azurerm_data_protection_backup_vault.main.id
  storage_account_id = azurerm_storage_account.media.id
  backup_policy_id   = azurerm_data_protection_backup_policy_blob_storage.media.id
}

# ── Key Vault Backup ───────────────────────────────────────────────────────
# Key Vault soft-delete and purge protection are configured on the vault
# resource itself (see keyvault.tf). For additional off-site backup of
# individual secrets, use the Azure CLI periodically:
#
#   az keyvault secret backup --vault-name lazynext-kv-{env} \
#     --file <secret-name>.backup
#
# Or use Azure Backup to protect the entire Key Vault via the portal.
#
# NOTE: Full Key Vault backup via Azure Backup is configured through the
# Recovery Services Vault in the Azure Portal — Terraform support for the
# "AzureKeyVault" workload type is limited. The soft-delete retention
# (configured in keyvault.tf) provides the primary data protection layer.
