# ── GitHub Actions OIDC Federation ──────────────────────────────────────────
# Allows GitHub Actions to authenticate to Azure without storing secrets

# Federated Identity Credential for GitHub Actions
# This ties the managed identity below to the GitHub repo's OIDC token

resource "azurerm_user_assigned_identity" "github_actions" {
  name                = "lazynext-gha-mi-${var.environment}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location

  tags = {
    Environment = var.environment
    Project     = "lazynext"
  }
}

# Federated credential for the main branch
resource "azurerm_federated_identity_credential" "github_main" {
  name                = "lazynext-gha-main-${var.environment}"
  parent_id           = azurerm_user_assigned_identity.github_actions.id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = "https://token.actions.githubusercontent.com"
  subject             = "repo:Lazynext-Platform/Lazynext:ref:refs/heads/main"
}

# Federated credential for PRs
resource "azurerm_federated_identity_credential" "github_pr" {
  name                = "lazynext-gha-pr-${var.environment}"
  parent_id           = azurerm_user_assigned_identity.github_actions.id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = "https://token.actions.githubusercontent.com"
  subject             = "repo:Lazynext-Platform/Lazynext:pull_request"
}

# Grant ACR push/pull to GitHub Actions
resource "azurerm_role_assignment" "github_acr_push" {
  scope                = azurerm_container_registry.acr.id
  role_definition_name = "AcrPush"
  principal_id         = azurerm_user_assigned_identity.github_actions.principal_id
}

# Grant Contributor on Resource Group to GitHub Actions
resource "azurerm_role_assignment" "github_rg_contributor" {
  scope                = azurerm_resource_group.rg.id
  role_definition_name = "Contributor"
  principal_id         = azurerm_user_assigned_identity.github_actions.principal_id
}
