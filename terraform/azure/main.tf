# ── Lazynext Azure Infrastructure ──────────────────────────────────────────
# Resource Group, VNet, Container Apps, PostgreSQL, Blob Storage, ACR, AKS, Key Vault

terraform {
  required_version = ">= 1.10"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  backend "azurerm" {
    resource_group_name  = "lazynext-terraform-rg"
    storage_account_name = "lazynexttf15c270"
    container_name       = "tfstate"
    key                  = "azure/terraform.tfstate"
  }
}

provider "azurerm" {
  features {}

  resource_provider_registrations = "none"
}

provider "azuread" {}

data "azurerm_client_config" "current" {}

# ── Resource Group ──────────────────────────────────────────────────────────

resource "azurerm_resource_group" "rg" {
  name     = "lazynext-rg-${var.environment}"
  location = var.location

  tags = {
    Environment = var.environment
    Project     = "lazynext"
    ManagedBy   = "terraform"
  }
}

# ── Locals ──────────────────────────────────────────────────────────────────

locals {
  # Match GCP Cloud Run resource configs
  container_apps = {
    web = {
      cpu    = var.environment == "production" ? 2.0 : 1.0
      memory = var.environment == "production" ? "4Gi" : "2Gi"
      port   = 3000
      min    = var.environment == "production" ? 1 : 0
      max    = var.environment == "production" ? 10 : 3
    }
    ai_agents = {
      cpu    = 2.0
      memory = "4Gi"
      port   = 8002
      min    = var.environment == "production" ? 1 : 0
      max    = var.environment == "production" ? 8 : 2
    }
    render_service = {
      cpu    = 4.0
      memory = "8Gi"
      port   = 8003
      min    = var.environment == "production" ? 1 : 0
      max    = var.environment == "production" ? 15 : 3
    }
    pre_processing = {
      cpu    = 4.0
      memory = "8Gi"
      port   = 8000
      min    = 0
      max    = var.environment == "production" ? 4 : 1
    }
    generative_studio = {
      cpu    = 4.0
      memory = "8Gi"
      port   = 8001
      min    = 0
      max    = var.environment == "production" ? 4 : 1
    }
  }

  acr_repos = [
    "lazynext-web",
    "lazynext-ai-agents",
    "lazynext-render-service",
    "lazynext-pre-processing",
    "lazynext-generative-studio",
    "lazynext-analytics-service",
    "lazynext-mcp",
  ]

  secret_names = [
    "better-auth-secret",
    "openai-api-key",
    "anthropic-api-key",
    "gemini-api-key",
    "replicate-api-token",
    "elevenlabs-api-key",
    "stripe-secret-key",
    "stripe-webhook-secret",
    "resend-api-key",
  ]
}
