# ── Azure Container Registry ────────────────────────────────────────────────

resource "azurerm_container_registry" "acr" {
  name                = "lazynextacr${var.environment}${random_string.storage_suffix.result}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = "Premium"
  # Managed identity replaces admin credentials — ACR pulls are authenticated
  # via the Container Apps user-assigned managed identity (AcrPull role).
  admin_enabled       = false

  tags = {
    Environment = var.environment
    Project     = "lazynext"
  }
}
