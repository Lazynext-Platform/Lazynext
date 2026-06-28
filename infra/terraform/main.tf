terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.70"
    }
  }
  required_version = ">= 1.2.0"
}

provider "azurerm" {
  features {}
}

variable "project_name" {
  type    = string
  default = "lazynext"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "location" {
  type    = string
  default = "East US"
}

# ------------------------------------------------------------------------------
# Resource Group
# ------------------------------------------------------------------------------
resource "azurerm_resource_group" "main" {
  name     = "rg-${var.project_name}-${var.environment}"
  location = var.location
}

# ------------------------------------------------------------------------------
# Azure Database for PostgreSQL (Flexible Server)
# ------------------------------------------------------------------------------
resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "psql-${var.project_name}-${var.environment}"
  resource_group_name    = azurerm_resource_group.main.name
  location               = azurerm_resource_group.main.location
  version                = "15"
  administrator_login    = "postgres"
  administrator_password = "ChangeMeSecurePassword123!" # Replace with Key Vault in prod
  storage_mb             = 32768
  sku_name               = "B_Standard_B1ms"

  lifecycle {
    ignore_changes = [
      zone,
      high_availability[0].standby_availability_zone
    ]
  }
  
  # Allow access from all Azure services
  # In a strict production environment, restrict this to a specific VNet
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure" {
  name             = "AllowAllAzureServices"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

resource "azurerm_postgresql_flexible_server_database" "lazynext" {
  name      = "lazynext"
  server_id = azurerm_postgresql_flexible_server.main.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

# ------------------------------------------------------------------------------
# Azure Cache for Redis
# ------------------------------------------------------------------------------
# ==============================================================================
# Redis (Container App to bypass Azure Cache for Redis retirement restrictions)
# ==============================================================================

resource "azurerm_container_app" "redis" {
  name                         = "ca-redis-lazynext"
  container_app_environment_id = data.azurerm_container_app_environment.existing.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"

  template {
    min_replicas = 1
    max_replicas = 1

    container {
      name   = "redis"
      image  = "redis:alpine"
      cpu    = 0.25
      memory = "0.5Gi"
    }
  }

  ingress {
    external_enabled = true
    target_port      = 6379
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }
}

# ------------------------------------------------------------------------------
# Azure Blob Storage (Media)
# ------------------------------------------------------------------------------
resource "azurerm_storage_account" "media" {
  name                     = replace("st${var.project_name}media${var.environment}", "-", "")
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  blob_properties {
    cors_rule {
      allowed_headers    = ["*"]
      allowed_methods    = ["GET", "PUT", "POST", "OPTIONS"]
      allowed_origins    = ["*"]
      exposed_headers    = ["*"]
      max_age_in_seconds = 3600
    }
  }
}

resource "azurerm_storage_container" "media" {
  name                  = "media"
  storage_account_name  = azurerm_storage_account.media.name
  container_access_type = "blob" # Public read access for media
}

# ------------------------------------------------------------------------------
# ==============================================================================
# Container App Environment & API Gateway
# ==============================================================================

data "azurerm_container_app_environment" "existing" {
  name                = "lazynext-capps-env-dev"
  resource_group_name = "lazynext-rg-dev"
}

resource "azurerm_container_app" "api_gateway" {
  name                         = "ca-apigateway-${var.project_name}"
  container_app_environment_id = data.azurerm_container_app_environment.existing.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"

  template {
    min_replicas = 0
    max_replicas = 10

    container {
      name   = "api-gateway"
      image  = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "DATABASE_URL"
        value = "postgresql://${azurerm_postgresql_flexible_server.main.administrator_login}:${azurerm_postgresql_flexible_server.main.administrator_password}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/${azurerm_postgresql_flexible_server_database.lazynext.name}?sslmode=require"
      }
      env {
        name  = "REDIS_URL"
        value = "redis://${azurerm_container_app.redis.ingress[0].fqdn}:6379"
      }
      env {
        name  = "AZURE_STORAGE_ACCOUNT"
        value = azurerm_storage_account.media.name
      }
      env {
        name  = "AZURE_STORAGE_ACCESS_KEY"
        value = azurerm_storage_account.media.primary_access_key
      }
      env {
        name  = "AZURE_STORAGE_CONTAINER"
        value = azurerm_storage_container.media.name
      }
    }
  }

  ingress {
    external_enabled = true
    target_port      = 3000
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }
}

# ------------------------------------------------------------------------------
# Outputs
# ------------------------------------------------------------------------------
output "api_gateway_url" {
  value = "https://${azurerm_container_app.api_gateway.ingress[0].fqdn}"
}

output "storage_account_name" {
  value = azurerm_storage_account.media.name
}
