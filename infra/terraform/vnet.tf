# ── Virtual Network ────────────────────────────────────────────────────────

resource "azurerm_virtual_network" "vnet" {
  name                = "lazynext-vnet-${var.environment}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  address_space       = ["10.0.0.0/16"]

  tags = {
    Environment = var.environment
    Project     = "lazynext"
  }
}

# ── Subnets ─────────────────────────────────────────────────────────────────

# Container Apps Environment subnet (delegated)
resource "azurerm_subnet" "container_apps" {
  name                 = "lazynext-capps-subnet-${var.environment}"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.8.0/23"]

  delegation {
    name = "delegation"
    service_delegation {
      name = "Microsoft.App/environments"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action",
      ]
    }
  }
}

# PostgreSQL Flexible Server subnet (delegated)
resource "azurerm_subnet" "postgres" {
  name                 = "lazynext-postgres-subnet-${var.environment}"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.4.0/24"]

  delegation {
    name = "delegation"
    service_delegation {
      name = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action",
      ]
    }
  }
}

# Private endpoints subnet
resource "azurerm_subnet" "private_endpoints" {
  name                 = "lazynext-pe-subnet-${var.environment}"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.5.0/24"]
}
