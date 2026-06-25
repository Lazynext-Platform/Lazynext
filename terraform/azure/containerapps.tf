# ── Managed Identity for Container Apps ─────────────────────────────────────

resource "azurerm_user_assigned_identity" "container_apps" {
  name                = "lazynext-capps-mi-${var.environment}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location

  tags = {
    Environment = var.environment
    Project     = "lazynext"
  }
}

# Grant ACR pull to Container Apps
resource "azurerm_role_assignment" "acr_pull" {
  scope                = azurerm_container_registry.acr.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.container_apps.principal_id
}

# Grant Storage Blob Data Contributor to Container Apps
resource "azurerm_role_assignment" "blob_access" {
  scope                = azurerm_storage_account.media.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.container_apps.principal_id
}

# ── Log Analytics Workspace ─────────────────────────────────────────────────

resource "azurerm_log_analytics_workspace" "container_apps" {
  name                = "lazynext-law-${var.environment}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "PerGB2018"
  retention_in_days   = var.environment == "production" ? 90 : 30

  tags = {
    Environment = var.environment
    Project     = "lazynext"
  }
}

# ── Container Apps Environment ──────────────────────────────────────────────

resource "azurerm_container_app_environment" "main" {
  name                       = "lazynext-capps-env-${var.environment}"
  location                   = azurerm_resource_group.rg.location
  resource_group_name        = azurerm_resource_group.rg.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.container_apps.id

  infrastructure_subnet_id = azurerm_subnet.container_apps.id

  workload_profile {
    name                  = "Consumption"
    workload_profile_type = "Consumption"
  }

  tags = {
    Environment = var.environment
    Project     = "lazynext"
  }
}

# ── Container Apps (5 services) ─────────────────────────────────────────────

# Web App (Next.js)
resource "azurerm_container_app" "web" {
  name                         = "lazynext-web-${var.environment}"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.container_apps.id]
  }

  registry {
    server               = azurerm_container_registry.acr.login_server
    username             = azurerm_container_registry.acr.admin_username
    password_secret_name = "acr-password"
  }

  template {
    container {
      name   = "web"
      image  = "${azurerm_container_registry.acr.login_server}/lazynext-web:latest"
      cpu    = local.container_apps["web"].cpu
      memory = local.container_apps["web"].memory

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "STORAGE_PROVIDER"
        value = "azure"
      }
      env {
        name  = "AZURE_STORAGE_ACCOUNT"
        value = azurerm_storage_account.media.name
      }
      env {
        name  = "MEDIA_BUCKET"
        value = azurerm_storage_container.media.name
      }
      env {
        name        = "DATABASE_URL"
        secret_name = "database-url"
      }
      env {
        name        = "BETTER_AUTH_SECRET"
        secret_name = "better-auth-secret"
      }
    }

    min_replicas = local.container_apps["web"].min
    max_replicas = local.container_apps["web"].max
  }

  ingress {
    allow_insecure_connections = false
    external_enabled           = true
    target_port                = 3000
    transport                  = "http"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  secret {
    name  = "database-url"
    value = "postgresql://lazynext_app:${var.db_password}@${azurerm_postgresql_flexible_server.postgres.fqdn}:5432/lazynext?sslmode=require"
  }
  secret {
    name  = "better-auth-secret"
    value = var.better_auth_secret
  }

  secret {
    name  = "acr-password"
    value = azurerm_container_registry.acr.admin_password
  }

  lifecycle {
    ignore_changes = [
      template[0].container[0].image,
      secret,
    ]
  }

  tags = {
    Environment = var.environment
    Project     = "lazynext"
  }
}

# AI Agents
resource "azurerm_container_app" "ai_agents" {
  name                         = "lazynext-ai-agents-${var.environment}"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.container_apps.id]
  }

  registry {
    server               = azurerm_container_registry.acr.login_server
    username             = azurerm_container_registry.acr.admin_username
    password_secret_name = "acr-password"
  }

  template {
    container {
      name   = "ai-agents"
      image  = "${azurerm_container_registry.acr.login_server}/lazynext-ai-agents:latest"
      cpu    = local.container_apps["ai_agents"].cpu
      memory = local.container_apps["ai_agents"].memory

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "LLM_PROVIDER"
        value = var.llm_provider
      }
      env {
        name        = "OPENAI_API_KEY"
        secret_name = "openai-api-key"
      }
      env {
        name        = "ANTHROPIC_API_KEY"
        secret_name = "anthropic-api-key"
      }
      env {
        name        = "BETTER_AUTH_SECRET"
        secret_name = "better-auth-secret"
      }
    }

    min_replicas = local.container_apps["ai_agents"].min
    max_replicas = local.container_apps["ai_agents"].max
  }

  ingress {
    allow_insecure_connections = false
    external_enabled           = true
    target_port                = 8002
    transport                  = "http"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  secret {
    name  = "openai-api-key"
    value = var.openai_api_key
  }
  secret {
    name  = "anthropic-api-key"
    value = var.anthropic_api_key
  }
  secret {
    name  = "better-auth-secret"
    value = var.better_auth_secret
  }

  secret {
    name  = "acr-password"
    value = azurerm_container_registry.acr.admin_password
  }

  lifecycle {
    ignore_changes = [
      template[0].container[0].image,
      secret,
    ]
  }

  tags = {
    Environment = var.environment
    Project     = "lazynext"
  }
}

# Render Service
resource "azurerm_container_app" "render_service" {
  name                         = "lazynext-render-${var.environment}"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.container_apps.id]
  }

  registry {
    server               = azurerm_container_registry.acr.login_server
    username             = azurerm_container_registry.acr.admin_username
    password_secret_name = "acr-password"
  }

  template {
    container {
      name   = "render-service"
      image  = "${azurerm_container_registry.acr.login_server}/lazynext-render-service:latest"
      cpu    = local.container_apps["render_service"].cpu
      memory = local.container_apps["render_service"].memory

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "STORAGE_PROVIDER"
        value = "azure"
      }
      env {
        name  = "AZURE_STORAGE_ACCOUNT"
        value = azurerm_storage_account.media.name
      }
      env {
        name  = "MEDIA_BUCKET"
        value = azurerm_storage_container.media.name
      }
    }

    min_replicas = local.container_apps["render_service"].min
    max_replicas = local.container_apps["render_service"].max
  }

  ingress {
    allow_insecure_connections = false
    external_enabled           = true
    target_port                = 8003
    transport                  = "http"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  secret {
    name  = "acr-password"
    value = azurerm_container_registry.acr.admin_password
  }

  lifecycle {
    ignore_changes = [
      template[0].container[0].image,
    ]
  }

  tags = {
    Environment = var.environment
    Project     = "lazynext"
  }
}

# Pre-Processing
resource "azurerm_container_app" "pre_processing" {
  name                         = "lazynext-pre-processing-${var.environment}"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.container_apps.id]
  }

  registry {
    server               = azurerm_container_registry.acr.login_server
    username             = azurerm_container_registry.acr.admin_username
    password_secret_name = "acr-password"
  }

  template {
    container {
      name   = "pre-processing"
      image  = "${azurerm_container_registry.acr.login_server}/lazynext-pre-processing:latest"
      cpu    = local.container_apps["pre_processing"].cpu
      memory = local.container_apps["pre_processing"].memory

      env {
        name  = "PYTHONUNBUFFERED"
        value = "1"
      }
      env {
        name  = "AZURE_STORAGE_ACCOUNT"
        value = azurerm_storage_account.media.name
      }
      env {
        name  = "MEDIA_BUCKET"
        value = azurerm_storage_container.media.name
      }
      env {
        name        = "OPENAI_API_KEY"
        secret_name = "openai-api-key"
      }
      env {
        name        = "REPLICATE_API_TOKEN"
        secret_name = "replicate-api-token"
      }
    }

    min_replicas = local.container_apps["pre_processing"].min
    max_replicas = local.container_apps["pre_processing"].max
  }

  ingress {
    allow_insecure_connections = false
    external_enabled           = true
    target_port                = 8000
    transport                  = "http"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  secret {
    name  = "openai-api-key"
    value = var.openai_api_key
  }
  secret {
    name  = "replicate-api-token"
    value = var.replicate_api_token
  }

  secret {
    name  = "acr-password"
    value = azurerm_container_registry.acr.admin_password
  }

  lifecycle {
    ignore_changes = [
      template[0].container[0].image,
      secret,
    ]
  }

  tags = {
    Environment = var.environment
    Project     = "lazynext"
  }
}

# Generative Studio
resource "azurerm_container_app" "generative_studio" {
  name                         = "lazynext-gen-studio-${var.environment}"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.container_apps.id]
  }

  registry {
    server               = azurerm_container_registry.acr.login_server
    username             = azurerm_container_registry.acr.admin_username
    password_secret_name = "acr-password"
  }

  template {
    container {
      name   = "generative-studio"
      image  = "${azurerm_container_registry.acr.login_server}/lazynext-generative-studio:latest"
      cpu    = local.container_apps["generative_studio"].cpu
      memory = local.container_apps["generative_studio"].memory

      env {
        name  = "PYTHONUNBUFFERED"
        value = "1"
      }
      env {
        name  = "HF_HOME"
        value = "/tmp/huggingface"
      }
      env {
        name  = "TRANSFORMERS_CACHE"
        value = "/tmp/huggingface"
      }
      env {
        name        = "REPLICATE_API_TOKEN"
        secret_name = "replicate-api-token"
      }
      env {
        name        = "ELEVENLABS_API_KEY"
        secret_name = "elevenlabs-api-key"
      }
    }

    min_replicas = local.container_apps["generative_studio"].min
    max_replicas = local.container_apps["generative_studio"].max
  }

  ingress {
    allow_insecure_connections = false
    external_enabled           = true
    target_port                = 8001
    transport                  = "http"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  secret {
    name  = "replicate-api-token"
    value = var.replicate_api_token
  }
  secret {
    name  = "elevenlabs-api-key"
    value = var.elevenlabs_api_key
  }

  secret {
    name  = "acr-password"
    value = azurerm_container_registry.acr.admin_password
  }

  lifecycle {
    ignore_changes = [
      template[0].container[0].image,
      secret,
    ]
  }

  tags = {
    Environment = var.environment
    Project     = "lazynext"
  }
}
