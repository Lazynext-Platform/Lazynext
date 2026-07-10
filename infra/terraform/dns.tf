# ── Azure DNS Zone for lazynext.com ──────────────────────────────────────────
# Manages the public DNS zone for the primary domain. NS records should be
# configured at the registrar (Spaceship) to delegate to Azure name servers.
# See docs/domain-setup.md for step-by-step instructions.
#
# DNS records point directly at the deployed Container App FQDNs (no
# Application Gateway WAF v2 proxy yet — the AGW is blocked on the student
# subscription SKU). Once you point a domain at a Container App, you can
# enable managed TLS certificates (free, auto-renewing) in the Azure Portal.

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

# ── CNAME: @ (root) → Web Container App ───────────────────────────────
# Azure DNS supports ALIAS/ANAME records at the zone apex; a CNAME is not
# valid for the root. Use a CNAME at www and redirect @→www at your
# registrar (Spaceship) instead.

# ── CNAME: www / app → Web Container App ──────────────────────────────

resource "azurerm_dns_cname_record" "web_www" {
  count = var.create_dns_zone ? 1 : 0

  name                = "www"
  zone_name           = azurerm_dns_zone.primary[0].name
  resource_group_name = azurerm_resource_group.rg.name
  ttl                 = 300
  record              = azurerm_container_app.web.ingress[0].fqdn
}

resource "azurerm_dns_cname_record" "web_app" {
  count = var.create_dns_zone ? 1 : 0

  name                = "app"
  zone_name           = azurerm_dns_zone.primary[0].name
  resource_group_name = azurerm_resource_group.rg.name
  ttl                 = 300
  record              = azurerm_container_app.web.ingress[0].fqdn
}

# ── CNAME: api → API Gateway Container App ────────────────────────────

resource "azurerm_dns_cname_record" "api_gw" {
  count = var.create_dns_zone ? 1 : 0

  name                = "api"
  zone_name           = azurerm_dns_zone.primary[0].name
  resource_group_name = azurerm_resource_group.rg.name
  ttl                 = 300
  record              = azurerm_container_app.api_gateway.ingress[0].fqdn
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
