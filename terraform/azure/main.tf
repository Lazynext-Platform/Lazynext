terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

variable "location" {
  description = "Azure region for the deployment"
  default     = "East US"
}

variable "environment" {
  description = "Deployment environment (e.g. dev, staging, prod)"
  default     = "prod"
}

resource "azurerm_resource_group" "rg" {
  name     = "lazynext-rg-${var.environment}"
  location = var.location

  tags = {
    Environment = var.environment
    Project     = "Lazynext"
  }
}

# ── Virtual Network for Lazynext (Azure) ──────────────────────────────────
resource "azurerm_virtual_network" "vnet" {
  name                = "lazynext-vnet-${var.environment}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  address_space       = ["10.0.0.0/16"]
}

resource "azurerm_subnet" "aks_subnet" {
  name                 = "lazynext-aks-subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.1.0/24"]
}
