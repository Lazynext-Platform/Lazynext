# ── Azure DNS Zone for lazynext.com ──────────────────────────────────────────
# Manages the public DNS zone for the primary domain. NS records should be
# configured at the registrar (Spaceship) to delegate to Azure name servers.
# See docs/domain-setup.md for step-by-step instructions.
#
# If you prefer to manage DNS at the registrar instead, set create_dns_zone = false
# and add the A/CNAME records manually. The Application Gateway public IP handle
# all HTTP Host-based routing (lazynext.com, api.lazynext.com, app.lazynext.com).

resource "azurerm_dns_zone" "primary" {
  count = var.create_dns_zone ? 1 : 0

  name                = var.domain_name
  resource_group_name = azurerm_resource_group.rg.name

  tags = {
    Environment = var.environment
    Project     = "lazynext"
    ManagedBy   = "terraform"
  }
}

# ── A Record: lazynext.com → Application Gateway ─────────────────────────────

resource "azurerm_dns_a_record" "root" {
  count = var.create_dns_zone ? 1 : 0

  name                = "@"
  zone_name           = azurerm_dns_zone.primary[0].name
  resource_group_name = azurerm_resource_group.rg.name
  ttl                 = 300
  records             = [azurerm_public_ip.app_gateway.ip_address]
}

# ── CNAME: www.lazynext.com → lazynext.com ───────────────────────────────────

resource "azurerm_dns_cname_record" "www" {
  count = var.create_dns_zone ? 1 : 0

  name                = "www"
  zone_name           = azurerm_dns_zone.primary[0].name
  resource_group_name = azurerm_resource_group.rg.name
  ttl                 = 300
  record              = var.domain_name
}

# ── CNAME: api.lazynext.com → lazynext.com ───────────────────────────────────
# Application Gateway routes by Host header — same IP, different backend pool

resource "azurerm_dns_cname_record" "api" {
  count = var.create_dns_zone ? 1 : 0

  name                = "api"
  zone_name           = azurerm_dns_zone.primary[0].name
  resource_group_name = azurerm_resource_group.rg.name
  ttl                 = 300
  record              = var.domain_name
}

# ── CNAME: app.lazynext.com → lazynext.com ───────────────────────────────────

resource "azurerm_dns_cname_record" "app" {
  count = var.create_dns_zone ? 1 : 0

  name                = "app"
  zone_name           = azurerm_dns_zone.primary[0].name
  resource_group_name = azurerm_resource_group.rg.name
  ttl                 = 300
  record              = var.domain_name
}

# ── Optional: Azure Front Door custom domain CNAME for web app ──────────────
# If using Front Door for the web app (not just media), uncomment below:
#
# resource "azurerm_dns_cname_record" "cdn_verify" {
#   count = var.create_dns_zone ? 1 : 0
#
#   name                = "cdnverify"
#   zone_name           = azurerm_dns_zone.primary[0].name
#   resource_group_name = azurerm_resource_group.rg.name
#   ttl                 = 300
#   record              = "cdnverify.${azurerm_cdn_frontdoor_endpoint.media.host_name}"
# }
