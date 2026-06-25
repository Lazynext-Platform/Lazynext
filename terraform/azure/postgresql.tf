# ── Azure PostgreSQL Flexible Server ────────────────────────────────────────

resource "azurerm_postgresql_flexible_server" "postgres" {
  name                = "lazynext-postgres-${var.environment}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location

  version    = "17"
  sku_name   = var.db_sku_name
  storage_mb = var.environment == "production" ? 131072 : 32768 # 128GB / 32GB (Azure minimum: 32GB)

  delegated_subnet_id   = azurerm_subnet.postgres.id
  private_dns_zone_id   = azurerm_private_dns_zone.postgres.id

  # Only allow private network access (no public endpoint)
  public_network_access_enabled = false

  # Zone (production can use zone-redundant HA if available)
  zone = "1"

  administrator_login    = "lazynext_admin"
  administrator_password = var.db_password

  backup_retention_days = var.environment == "production" ? 30 : 7

  # Maintenance window (Sunday 4 AM)
  maintenance_window {
    day_of_week  = 0
    start_hour   = 4
    start_minute = 0
  }

  tags = {
    Environment = var.environment
    Project     = "lazynext"
  }
}

resource "azurerm_postgresql_flexible_server_database" "lazynext" {
  name      = "lazynext"
  server_id = azurerm_postgresql_flexible_server.postgres.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# Server parameters (mirrors GCP Cloud SQL flags)
resource "azurerm_postgresql_flexible_server_configuration" "log_min_duration" {
  name      = "log_min_duration_statement"
  server_id = azurerm_postgresql_flexible_server.postgres.id
  value     = "1000"
}

resource "azurerm_postgresql_flexible_server_configuration" "log_connections" {
  name      = "log_connections"
  server_id = azurerm_postgresql_flexible_server.postgres.id
  value     = "on"
}

resource "azurerm_postgresql_flexible_server_configuration" "max_connections" {
  name      = "max_connections"
  server_id = azurerm_postgresql_flexible_server.postgres.id
  value     = var.environment == "production" ? "400" : "100"
}

# Private DNS zone for PostgreSQL
resource "azurerm_private_dns_zone" "postgres" {
  name                = "lazynext-postgres-${var.environment}.private.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.rg.name

  tags = {
    Environment = var.environment
    Project     = "lazynext"
  }
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
  name                  = "lazynext-postgres-dns-link-${var.environment}"
  private_dns_zone_name = azurerm_private_dns_zone.postgres.name
  resource_group_name   = azurerm_resource_group.rg.name
  virtual_network_id    = azurerm_virtual_network.vnet.id
}
