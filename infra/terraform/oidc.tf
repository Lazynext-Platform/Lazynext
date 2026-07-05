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
  name                      = "lazynext-gha-main-${var.environment}"
  user_assigned_identity_id = azurerm_user_assigned_identity.github_actions.id
  audience                  = ["api://AzureADTokenExchange"]
  issuer                    = "https://token.actions.githubusercontent.com"
  subject                   = "repo:Lazynext-Platform/Lazynext:ref:refs/heads/main"
}

# Federated credential for PRs
resource "azurerm_federated_identity_credential" "github_pr" {
  name                      = "lazynext-gha-pr-${var.environment}"
  user_assigned_identity_id = azurerm_user_assigned_identity.github_actions.id
  audience                  = ["api://AzureADTokenExchange"]
  issuer                    = "https://token.actions.githubusercontent.com"
  subject                   = "repo:Lazynext-Platform/Lazynext:pull_request"
}

# Grant ACR push/pull to GitHub Actions
resource "azurerm_role_assignment" "github_acr_push" {
  scope                = azurerm_container_registry.acr.id
  role_definition_name = "AcrPush"
  principal_id         = azurerm_user_assigned_identity.github_actions.principal_id
}

# Grant Contributor on Container Apps Environment to GitHub Actions
# TODO: This should be further scoped — ideally a custom role with only the
#       permissions needed for deploying container app revisions (e.g.
#       Microsoft.App/containerApps/write, /revisions/write, etc.) rather
#       than blanket Contributor on the environment.
resource "azurerm_role_assignment" "github_cappenv_contributor" {
  scope                = azurerm_container_app_environment.main.id
  role_definition_name = "Contributor"
  principal_id         = azurerm_user_assigned_identity.github_actions.principal_id
}

# Grant Contributor on each Container App to GitHub Actions
# This should be further scoped — a custom role with just the minimum
# permissions for deploying (write registry, update revision, swap traffic)
# would be more secure than Contributor on every container app.
resource "azurerm_role_assignment" "github_container_app_contributor" {
  for_each = local.container_apps

  scope                = local.container_app_ids[each.key]
  role_definition_name = "Contributor"
  principal_id         = azurerm_user_assigned_identity.github_actions.principal_id
}
