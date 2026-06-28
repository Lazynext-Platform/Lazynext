# ── Azure Cache for Redis Enterprise ───────────────────────────────────────
# Enterprise E10 (12 GB) with RedisJSON, RediSearch, RedisTimeSeries modules.
# Deployed with private endpoint into the VNet — no public exposure.

# ── Redis Enterprise Cluster ─────────────────────────────────────────────────

resource "azurerm_redis_enterprise_cluster" "main" {
  name                = "lazynext-redis-${var.environment}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku_name            = var.redis_sku_name

  minimum_tls_version = "1.2"

  tags = {
    Environment = var.environment
    Project     = "lazynext"
    ManagedBy   = "terraform"
  }
}

# ── Redis Enterprise Database ───────────────────────────────────────────────

resource "azurerm_redis_enterprise_database" "main" {
  name       = "default"
  cluster_id = azurerm_redis_enterprise_cluster.main.id

  client_protocol   = "Encrypted"
  clustering_policy = "OSSCluster"
  eviction_policy   = "VolatileLRU"

  # Redis modules available in Enterprise tier
  module {
    name = "RedisJSON"
  }

  module {
    name = "RediSearch"
  }

  module {
    name = "RedisTimeSeries"
  }
}

# ── Private Endpoint for Redis ──────────────────────────────────────────────

resource "azurerm_private_endpoint" "redis" {
  name                = "lazynext-redis-pe-${var.environment}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  subnet_id           = azurerm_subnet.private_endpoints.id

  private_service_connection {
    name                           = "lazynext-redis-psc-${var.environment}"
    private_connection_resource_id = azurerm_redis_enterprise_cluster.main.id
    is_manual_connection           = false
    subresource_names              = ["redisEnterprise"]
  }

  private_dns_zone_group {
    name                 = "redis-dns-zone-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.redis.id]
  }

  tags = {
    Environment = var.environment
    Project     = "lazynext"
    ManagedBy   = "terraform"
  }
}

# ── Private DNS Zone for Redis ──────────────────────────────────────────────

resource "azurerm_private_dns_zone" "redis" {
  name                = "privatelink.redis.cache.azure.net"
  resource_group_name = azurerm_resource_group.rg.name

  tags = {
    Environment = var.environment
    Project     = "lazynext"
  }
}

resource "azurerm_private_dns_zone_virtual_network_link" "redis" {
  name                  = "lazynext-redis-dns-link-${var.environment}"
  private_dns_zone_name = azurerm_private_dns_zone.redis.name
  resource_group_name   = azurerm_resource_group.rg.name
  virtual_network_id    = azurerm_virtual_network.vnet.id

  tags = {
    Environment = var.environment
    Project     = "lazynext"
  }
}

# ── Diagnostic Settings → Log Analytics ─────────────────────────────────────

resource "azurerm_monitor_diagnostic_setting" "redis" {
  name                       = "lazynext-redis-diag-${var.environment}"
  target_resource_id         = azurerm_redis_enterprise_cluster.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.container_apps.id

  enabled_log {
    category = "ConnectionEvents"
  }

  enabled_log {
    category = "ConnectedClientList"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}
