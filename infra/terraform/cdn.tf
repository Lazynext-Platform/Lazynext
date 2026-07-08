# ── Azure Front Door CDN (Media Delivery) ──────────────────────────────────
# Global anycast CDN fronted by a WAF policy. Serves media blobs from the
# Lazynext storage account at media.lazynext.ai with managed TLS.
# Disabled in dev (set cdn_enabled = false in tfvars) — Free Trial restriction.

# ── Front Door Profile ──────────────────────────────────────────────────────

resource "azurerm_cdn_frontdoor_profile" "media" {
  count               = var.enable_cdn ? 1 : 0
  name                = "lazynext-cdn-${var.environment}"
  resource_group_name = azurerm_resource_group.rg.name
  sku_name            = var.cdn_sku_name

  # Premium is required for managed TLS custom domains with WAF
  # (Standard requires AzureDNS or user-managed cert)

  tags = {
    Environment = var.environment
    Project     = "lazynext"
    ManagedBy   = "terraform"
  }
}

# ── Front Door Endpoint ─────────────────────────────────────────────────────

resource "azurerm_cdn_frontdoor_endpoint" "media" {
  count                    = var.enable_cdn ? 1 : 0
  name                     = "lazynext-media-ep-${var.environment}"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.media[0].id

  tags = {
    Environment = var.environment
    Project     = "lazynext"
  }
}

# ── Origin Group & Origin → Storage Account ─────────────────────────────────

resource "azurerm_cdn_frontdoor_origin_group" "media" {
  count                    = var.enable_cdn ? 1 : 0
  name                     = "lazynext-media-og-${var.environment}"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.media[0].id

  session_affinity_enabled = false

  load_balancing {
    sample_size                 = 4
    successful_samples_required = 3
  }

  health_probe {
    interval_in_seconds = 60
    path                = "/"
    protocol            = "Https"
    request_type        = "HEAD"
  }
}

resource "azurerm_cdn_frontdoor_origin" "media" {
  count                         = var.enable_cdn ? 1 : 0
  name                          = "lazynext-media-origin-${var.environment}"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.media[0].id

  enabled = true

  host_name          = azurerm_storage_account.media.primary_blob_host
  origin_host_header = azurerm_storage_account.media.primary_blob_host

  http_port  = 80
  https_port = 443
  priority   = 1
  weight     = 1000

  certificate_name_check_enabled = true
}

# ── Route ───────────────────────────────────────────────────────────────────

resource "azurerm_cdn_frontdoor_route" "media" {
  count                         = var.enable_cdn ? 1 : 0
  name                          = "lazynext-media-route-${var.environment}"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.media[0].id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.media[0].id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.media[0].id]

  patterns_to_match          = ["/*"]
  forwarding_protocol        = "HttpsOnly"
  https_redirect_enabled     = true
  supported_protocols        = ["Http", "Https"]
  link_to_default_domain     = true
  cdn_frontdoor_rule_set_ids = []
}

# ── Custom Domain: media.lazynext.ai ────────────────────────────────────────

resource "azurerm_cdn_frontdoor_custom_domain" "media" {
  count                    = var.enable_cdn ? 1 : 0
  name                     = "lazynext-media-domain-${var.environment}"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.media[0].id
  host_name                = var.media_custom_domain

  # When using Premium SKU, set dns_zone_id for automatic DNS validation.
  # With Standard SKU, omit dns_zone_id and add a CNAME manually.
  dns_zone_id = var.cdn_dns_zone_id != "" ? var.cdn_dns_zone_id : null

  tls {
    certificate_type = "ManagedCertificate"
    minimum_version  = "TLS12"
  }
}

resource "azurerm_cdn_frontdoor_custom_domain_association" "media" {
  count                          = var.enable_cdn ? 1 : 0
  cdn_frontdoor_custom_domain_id = azurerm_cdn_frontdoor_custom_domain.media[0].id
  cdn_frontdoor_route_ids        = [azurerm_cdn_frontdoor_route.media[0].id]
}

# ── Front Door WAF Policy ───────────────────────────────────────────────────

resource "azurerm_cdn_frontdoor_firewall_policy" "media" {
  count               = var.enable_cdn ? 1 : 0
  name                = "lazynextcdnwaf${var.environment}"
  resource_group_name = azurerm_resource_group.rg.name
  sku_name            = "Premium_AzureFrontDoor"
  mode                = var.environment == "production" ? "Prevention" : "Detection"

  enabled = true

  # Managed rule sets
  managed_rule {
    type    = "Microsoft_DefaultRuleSet"
    version = "2.1"
    action  = "Block"
  }

  managed_rule {
    type    = "Microsoft_BotManagerRuleSet"
    version = "1.0"
    action  = "Block"
  }

  # Rate limiting: 300 requests per minute per IP
  custom_rule {
    name     = "RateLimitPerIP"
    enabled  = true
    priority = 10
    action   = "Block"
    type     = "RateLimitRule"

    rate_limit_duration_in_minutes = 1
    rate_limit_threshold           = 300

    match_condition {
      match_variable     = "RemoteAddr"
      operator           = "IPMatch"
      negation_condition = false
      match_values       = ["0.0.0.0/0", "::/0"]
    }
  }

  # Geo-filtering: allow only US, CA, EU countries
  custom_rule {
    name     = "GeoFilter"
    enabled  = true
    priority = 20
    action   = "Block"
    type     = "MatchRule"

    match_condition {
      match_variable     = "RemoteAddr"
      operator           = "GeoMatch"
      negation_condition = true
      match_values = [
        "US", "CA",
        "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
        "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
        "PL", "PT", "RO", "SK", "SI", "ES", "SE",
        "IS", "LI", "NO", "CH", "GB",
      ]
    }
  }

  tags = {
    Environment = var.environment
    Project     = "lazynext"
    ManagedBy   = "terraform"
  }
}

# ── WAF Policy → Front Door Association ─────────────────────────────────────

resource "azurerm_cdn_frontdoor_security_policy" "media" {
  count                    = var.enable_cdn ? 1 : 0
  name                     = "lazynext-cdn-secpol-${var.environment}"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.media[0].id

  security_policies {
    firewall {
      cdn_frontdoor_firewall_policy_id = azurerm_cdn_frontdoor_firewall_policy.media[0].id

      association {
        domain {
          cdn_frontdoor_domain_id = azurerm_cdn_frontdoor_custom_domain.media[0].id
        }
        patterns_to_match = ["/*"]
      }
    }
  }
}
