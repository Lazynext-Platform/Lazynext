# ── Azure Container Registry ────────────────────────────────────────────────

resource "azurerm_container_registry" "acr" {
  name                = "lazynextacr${var.environment}${random_string.storage_suffix.result}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = "Premium"
  # Admin credentials are enabled so Container Apps can authenticate to ACR
  # without a managed-identity AcrPull role assignment (role assignments are
  # gated behind var.enable_role_assignments, which needs elevated perms).
  admin_enabled = true

  tags = {
    Environment = var.environment
    Project     = "lazynext"
  }
}
