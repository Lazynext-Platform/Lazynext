# ── Azure Blob Storage (Media Bucket) ───────────────────────────────────────

resource "azurerm_storage_account" "media" {
  # Storage account names must be 3-24 lowercase alphanumeric chars.
  # "lznxmedia" + env_short(<=4) + 6-char suffix = <= 19 chars.
  name                     = "lznxmedia${local.env_short}${random_string.storage_suffix.result}"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = var.environment == "production" ? "GRS" : "LRS"
  account_kind             = "StorageV2"
  min_tls_version          = "TLS1_2"

  # Deny public access — all traffic must come through the private endpoint
  public_network_access_enabled = var.storage_public_network_access_enabled
  shared_access_key_enabled     = true

  blob_properties {
    versioning_enabled = var.environment == "production"

    delete_retention_policy {
      days = var.environment == "production" ? 90 : 30
    }

    container_delete_retention_policy {
      days = var.environment == "production" ? 90 : 30
    }
  }

  tags = {
    Environment = var.environment
    Project     = "lazynext"
  }
}

resource "azurerm_storage_container" "media" {
  name                  = "media"
  storage_account_id    = azurerm_storage_account.media.id
  container_access_type = "private"
}

# Random suffix for globally unique storage name
resource "random_string" "storage_suffix" {
  length  = 6
  special = false
  upper   = false
}

# Lifecycle management: auto-delete blobs after 30d (dev) / 90d (prod)
resource "azurerm_storage_management_policy" "media" {
  storage_account_id = azurerm_storage_account.media.id

  rule {
    name    = "expire-old-media"
    enabled = true
    filters {
      blob_types   = ["blockBlob"]
      prefix_match = ["media/"]
    }
    actions {
      base_blob {
        delete_after_days_since_modification_greater_than = var.environment == "production" ? 90 : 30
      }
    }
  }
}
