# ── Private Endpoints for PaaS Services ────────────────────────────────────
# Places ACR, Key Vault, and Blob Storage behind private endpoints within
# the VNet's private-endpoints subnet. Traffic never traverses the public
# internet — all communication stays on the Azure backbone.
#
# Subnet used: lazynext-pe-subnet-{env} (10.0.5.0/24, defined in vnet.tf)

# ═══════════════════════════════════════════════════════════════════════════
# Private DNS Zones
# ═══════════════════════════════════════════════════════════════════════════

# ── ACR Private DNS Zone ────────────────────────────────────────────────────

resource "azurerm_private_dns_zone" "acr" {
  name                = "privatelink.azurecr.io"
  resource_group_name = azurerm_resource_group.rg.name

  tags = {
    Environment = var.environment
    Project     = "lazynext"
  }
}

resource "azurerm_private_dns_zone_virtual_network_link" "acr" {
  name                  = "lazynext-acr-dns-link-${var.environment}"
  private_dns_zone_name = azurerm_private_dns_zone.acr.name
  resource_group_name   = azurerm_resource_group.rg.name
  virtual_network_id    = azurerm_virtual_network.vnet.id

  tags = {
    Environment = var.environment
    Project     = "lazynext"
  }
}

# ── Key Vault Private DNS Zone ──────────────────────────────────────────────

resource "azurerm_private_dns_zone" "keyvault" {
  name                = "privatelink.vaultcore.azure.net"
  resource_group_name = azurerm_resource_group.rg.name

  tags = {
    Environment = var.environment
    Project     = "lazynext"
  }
}

resource "azurerm_private_dns_zone_virtual_network_link" "keyvault" {
  name                  = "lazynext-kv-dns-link-${var.environment}"
  private_dns_zone_name = azurerm_private_dns_zone.keyvault.name
  resource_group_name   = azurerm_resource_group.rg.name
  virtual_network_id    = azurerm_virtual_network.vnet.id

  tags = {
    Environment = var.environment
    Project     = "lazynext"
  }
}

# ── Blob Storage Private DNS Zone ───────────────────────────────────────────

resource "azurerm_private_dns_zone" "blob" {
  name                = "privatelink.blob.core.windows.net"
  resource_group_name = azurerm_resource_group.rg.name

  tags = {
    Environment = var.environment
    Project     = "lazynext"
  }
}

resource "azurerm_private_dns_zone_virtual_network_link" "blob" {
  name                  = "lazynext-blob-dns-link-${var.environment}"
  private_dns_zone_name = azurerm_private_dns_zone.blob.name
  resource_group_name   = azurerm_resource_group.rg.name
  virtual_network_id    = azurerm_virtual_network.vnet.id

  tags = {
    Environment = var.environment
    Project     = "lazynext"
  }
}

# ═══════════════════════════════════════════════════════════════════════════
# Private Endpoints
# ═══════════════════════════════════════════════════════════════════════════

# ── ACR Private Endpoint ────────────────────────────────────────────────────

resource "azurerm_private_endpoint" "acr" {
  name                = "lazynext-acr-pe-${var.environment}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  subnet_id           = azurerm_subnet.private_endpoints.id

  private_service_connection {
    name                           = "lazynext-acr-psc-${var.environment}"
    private_connection_resource_id = azurerm_container_registry.acr.id
    is_manual_connection           = false
    subresource_names              = ["registry"]
  }

  private_dns_zone_group {
    name                 = "acr-dns-zone-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.acr.id]
  }

  tags = {
    Environment = var.environment
    Project     = "lazynext"
    ManagedBy   = "terraform"
  }
}

# ── Key Vault Private Endpoint ──────────────────────────────────────────────

resource "azurerm_private_endpoint" "keyvault" {
  name                = "lazynext-kv-pe-${var.environment}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  subnet_id           = azurerm_subnet.private_endpoints.id

  private_service_connection {
    name                           = "lazynext-kv-psc-${var.environment}"
    private_connection_resource_id = azurerm_key_vault.secrets.id
    is_manual_connection           = false
    subresource_names              = ["vault"]
  }

  private_dns_zone_group {
    name                 = "kv-dns-zone-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.keyvault.id]
  }

  tags = {
    Environment = var.environment
    Project     = "lazynext"
    ManagedBy   = "terraform"
  }
}

# ── Storage Account (Blob) Private Endpoint ─────────────────────────────────
#
# NOTE: After enabling the private endpoint, you may set
#   public_network_access_enabled = false
# on the storage account (in storage.tf) to lock down public access.
# This requires all clients to be inside the VNet or connected via
# VPN/ExpressRoute to reach blob storage.

resource "azurerm_private_endpoint" "blob" {
  name                = "lazynext-blob-pe-${var.environment}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  subnet_id           = azurerm_subnet.private_endpoints.id

  private_service_connection {
    name                           = "lazynext-blob-psc-${var.environment}"
    private_connection_resource_id = azurerm_storage_account.media.id
    is_manual_connection           = false
    subresource_names              = ["blob"]
  }

  private_dns_zone_group {
    name                 = "blob-dns-zone-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.blob.id]
  }

  tags = {
    Environment = var.environment
    Project     = "lazynext"
    ManagedBy   = "terraform"
  }
}

# ── Storage Account (Blob) Private Endpoint Network Rules ───────────────────
# After the private endpoint is created, restrict storage account network
# access to only the VNet (deny public access). Uncomment for production
# once you have verified private endpoint connectivity from all clients.
#
# NOTE: Changing public_network_access_enabled will require updating
# storage.tf. This resource is commented out as a safe default — enable
# it in production after validating private endpoint access works for
# Container Apps, CI/CD runners, and any other blob clients.

resource "azurerm_storage_account_network_rules" "media" {
  storage_account_id = azurerm_storage_account.media.id
  default_action     = "Deny"

  bypass = ["AzureServices", "Logging", "Metrics"]

  # Allow only from the VNet
  virtual_network_subnet_ids = [
    azurerm_subnet.container_apps.id,
    azurerm_subnet.private_endpoints.id,
  ]

  depends_on = [
    azurerm_private_endpoint.blob,
  ]
}
