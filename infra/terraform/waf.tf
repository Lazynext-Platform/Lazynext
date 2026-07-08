# ── Azure Application Gateway v2 with WAF ──────────────────────────────────
# Provisions Application Gateway v2 with WAF policy (OWASP 3.2 managed
# ruleset), public IP, backend pools, HTTP settings, probes, listeners,
# and routing rules for the Lazynext platform front-end.
# ── Application Gateway v2 Subnet ──────────────────────────────────────────

resource "azurerm_subnet" "app_gateway" {
  name                 = "lazynext-agw-subnet-${var.environment}"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = var.app_gateway_subnet_prefix
}

# ── Public IP for Application Gateway ───────────────────────────────────────

resource "azurerm_public_ip" "app_gateway" {
  name                = "lazynext-agw-pip-${var.environment}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  allocation_method   = "Static"
  sku                 = "Standard"
  domain_name_label   = "lazynext-agw-${var.environment}"

  tags = {
    Environment = var.environment
    Project     = "lazynext"
    ManagedBy   = "terraform"
  }
}

# ── User-Assigned Identity for Application Gateway (Key Vault SSL certs) ────

resource "azurerm_user_assigned_identity" "app_gateway" {
  name                = "lazynext-agw-mi-${var.environment}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location

  tags = {
    Environment = var.environment
    Project     = "lazynext"
  }
}

# Grant App Gateway managed identity access to Key Vault for SSL certificates
resource "azurerm_key_vault_access_policy" "app_gateway" {
  key_vault_id = azurerm_key_vault.secrets.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_user_assigned_identity.app_gateway.principal_id

  secret_permissions = [
    "Get",
    "List",
  ]
}

# ── WAF Policy ──────────────────────────────────────────────────────────────

resource "azurerm_web_application_firewall_policy" "main" {
  name                = "lazynext-waf-policy-${var.environment}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location

  policy_settings {
    enabled                     = true
    mode                        = var.environment == "production" ? "Prevention" : "Detection"
    request_body_check          = true
    max_request_body_size_in_kb = 128
    file_upload_limit_in_mb     = 100
  }

  # ── Managed Ruleset: OWASP 3.2 ────────────────────────────────────────

  managed_rules {
    managed_rule_set {
      type    = "OWASP"
      version = "3.2"
    }
  }

  # Rate limiting handled at API Gateway middleware (ratelimit.rs)

  # ── Custom Rule 1: Geo-Filter ────────────────────────────────

  custom_rules {
    name      = "GeoFilterAllowList"
    priority  = 20
    rule_type = "MatchRule"
    action    = "Block"
    enabled   = true

    match_conditions {
      match_variables {
        variable_name = "RemoteAddr"
      }
      operator           = "GeoMatch"
      negation_condition = true
      # Azure Front Door limits each match condition to 10 match values.
      # Allow the primary served markets; expand via additional rules if needed.
      match_values = [
        "US", "CA", "GB", "DE", "FR", "NL", "SE", "ES", "IT", "IE",
      ]
    }
  }

  # ── Custom Rule 3: Block Known Scrapers / Attack Tools ────────────────

  custom_rules {
    name      = "BlockScrapers"
    priority  = 25
    rule_type = "MatchRule"
    action    = "Block"
    enabled   = true

    match_conditions {
      match_variables {
        variable_name = "RequestHeaders"
        selector      = "User-Agent"
      }
      operator           = "Contains"
      negation_condition = false
      match_values = [
        "zgrab", "masscan", "nmap", "gobuster", "sqlmap",
        "nikto", "burpsuite", "dirbuster", "wfuzz",
      ]
    }
  }

  # ── Custom Rule 4: Protect Admin / Internal Paths ─────────────────────

  custom_rules {
    name      = "ProtectAdminPaths"
    priority  = 30
    rule_type = "MatchRule"
    action    = "Block"
    enabled   = true

    match_conditions {
      match_variables {
        variable_name = "RequestUri"
      }
      operator           = "Contains"
      negation_condition = false
      match_values = [
        "/api/admin",
        "/api/internal",
        "/wp-admin",
        "/.env",
        "/.git",
        "/phpmyadmin",
      ]
    }
  }

  # ── Custom Rule 5: Enforce Lazynext API Content Types ─────────────────

  custom_rules {
    name      = "EnforceAPIContentType"
    priority  = 35
    rule_type = "MatchRule"
    action    = "Block"
    enabled   = true

    match_conditions {
      match_variables {
        variable_name = "RequestUri"
      }
      operator           = "BeginsWith"
      negation_condition = false
      match_values       = ["/api/"]
    }

    match_conditions {
      match_variables {
        variable_name = "RequestHeaders"
        selector      = "Content-Type"
      }
      operator           = "Contains"
      negation_condition = true
      match_values = [
        "application/json",
        "multipart/form-data",
        "application/x-www-form-urlencoded",
        "application/octet-stream",
      ]
    }
  }

  tags = {
    Environment = var.environment
    Project     = "lazynext"
    ManagedBy   = "terraform"
  }
}

# ── Application Gateway v2 ──────────────────────────────────────────────────

resource "azurerm_application_gateway" "main" {
  name                = "lazynext-agw-${var.environment}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.app_gateway.id]
  }

  sku {
    name     = var.app_gateway_sku_tier
    tier     = var.app_gateway_sku_tier
    capacity = var.app_gateway_capacity
  }

  autoscale_configuration {
    min_capacity = var.app_gateway_capacity
    max_capacity = var.environment == "production" ? 10 : 3
  }

  # Link to WAF policy (separate resource, above)
  firewall_policy_id = azurerm_web_application_firewall_policy.main.id

  # ── Gateway IP Configuration ──────────────────────────────────────────

  gateway_ip_configuration {
    name      = "lazynext-agw-ipcfg-${var.environment}"
    subnet_id = azurerm_subnet.app_gateway.id
  }

  # ── Frontend IP Configuration (Public) ────────────────────────────────

  frontend_ip_configuration {
    name                 = "lazynext-agw-feip-public-${var.environment}"
    public_ip_address_id = azurerm_public_ip.app_gateway.id
  }

  # ── Frontend Ports ────────────────────────────────────────────────────

  frontend_port {
    name = "port-http"
    port = 80
  }

  frontend_port {
    name = "port-https"
    port = 443
  }

  # ── Backend Address Pools (one per service) ───────────────────────────

  backend_address_pool {
    name = "pool-web"
    fqdns = [
      azurerm_container_app.web.latest_revision_fqdn,
    ]
  }

  backend_address_pool {
    name = "pool-ai-agents"
    fqdns = [
      azurerm_container_app.ai_agents.latest_revision_fqdn,
    ]
  }

  backend_address_pool {
    name = "pool-render-service"
    fqdns = [
      azurerm_container_app.render_service.latest_revision_fqdn,
    ]
  }

  backend_address_pool {
    name = "pool-pre-processing"
    fqdns = [
      azurerm_container_app.pre_processing.latest_revision_fqdn,
    ]
  }

  backend_address_pool {
    name = "pool-generative-studio"
    fqdns = [
      azurerm_container_app.generative_studio.latest_revision_fqdn,
    ]
  }

  backend_address_pool {
    name = "pool-api-gateway"
    fqdns = [
      azurerm_container_app.api_gateway.latest_revision_fqdn,
    ]
  }

  # ── Backend HTTP Settings ─────────────────────────────────────────────

  backend_http_settings {
    name                  = "http-settings-web"
    cookie_based_affinity = "Disabled"
    port                  = 443
    protocol              = "Https"
    request_timeout       = 60
    probe_name            = "probe-web"

    pick_host_name_from_backend_address = true

    connection_draining {
      enabled           = true
      drain_timeout_sec = 30
    }
  }

  backend_http_settings {
    name                  = "http-settings-ai-agents"
    cookie_based_affinity = "Disabled"
    port                  = 443
    protocol              = "Https"
    request_timeout       = 120
    probe_name            = "probe-ai-agents"

    pick_host_name_from_backend_address = true

    connection_draining {
      enabled           = true
      drain_timeout_sec = 30
    }
  }

  backend_http_settings {
    name                  = "http-settings-render-service"
    cookie_based_affinity = "Disabled"
    port                  = 443
    protocol              = "Https"
    request_timeout       = 300
    probe_name            = "probe-render-service"

    pick_host_name_from_backend_address = true

    connection_draining {
      enabled           = true
      drain_timeout_sec = 30
    }
  }

  backend_http_settings {
    name                  = "http-settings-pre-processing"
    cookie_based_affinity = "Disabled"
    port                  = 443
    protocol              = "Https"
    request_timeout       = 600
    probe_name            = "probe-pre-processing"

    pick_host_name_from_backend_address = true

    connection_draining {
      enabled           = true
      drain_timeout_sec = 30
    }
  }

  backend_http_settings {
    name                  = "http-settings-generative-studio"
    cookie_based_affinity = "Disabled"
    port                  = 443
    protocol              = "Https"
    request_timeout       = 600
    probe_name            = "probe-generative-studio"

    pick_host_name_from_backend_address = true

    connection_draining {
      enabled           = true
      drain_timeout_sec = 30
    }
  }

  backend_http_settings {
    name                  = "http-settings-api-gateway"
    cookie_based_affinity = "Disabled"
    port                  = 443
    protocol              = "Https"
    request_timeout       = 120
    probe_name            = "probe-api-gateway"

    pick_host_name_from_backend_address = true

    connection_draining {
      enabled           = true
      drain_timeout_sec = 30
    }
  }

  # ── Health Probes ─────────────────────────────────────────────────────

  probe {
    name                = "probe-web"
    protocol            = "Https"
    path                = "/"
    host                = azurerm_container_app.web.latest_revision_fqdn
    interval            = 30
    timeout             = 30
    unhealthy_threshold = 3

    match {
      status_code = ["200-399"]
    }
  }

  probe {
    name                = "probe-ai-agents"
    protocol            = "Https"
    path                = "/health"
    host                = azurerm_container_app.ai_agents.latest_revision_fqdn
    interval            = 30
    timeout             = 30
    unhealthy_threshold = 3

    match {
      status_code = ["200-399"]
    }
  }

  probe {
    name                = "probe-render-service"
    protocol            = "Https"
    path                = "/health"
    host                = azurerm_container_app.render_service.latest_revision_fqdn
    interval            = 30
    timeout             = 30
    unhealthy_threshold = 3

    match {
      status_code = ["200-399"]
    }
  }

  probe {
    name                = "probe-pre-processing"
    protocol            = "Https"
    path                = "/health"
    host                = azurerm_container_app.pre_processing.latest_revision_fqdn
    interval            = 30
    timeout             = 30
    unhealthy_threshold = 3

    match {
      status_code = ["200-399"]
    }
  }

  probe {
    name                = "probe-generative-studio"
    protocol            = "Https"
    path                = "/health"
    host                = azurerm_container_app.generative_studio.latest_revision_fqdn
    interval            = 30
    timeout             = 30
    unhealthy_threshold = 3

    match {
      status_code = ["200-399"]
    }
  }

  probe {
    name                = "probe-api-gateway"
    protocol            = "Https"
    path                = "/health"
    host                = azurerm_container_app.api_gateway.latest_revision_fqdn
    interval            = 30
    timeout             = 30
    unhealthy_threshold = 3

    match {
      status_code = ["200-399"]
    }
  }

  # ── HTTP Listeners ────────────────────────────────────────────────────

  # Port 80 listeners (HTTP)
  http_listener {
    name                           = "listener-web-http"
    frontend_ip_configuration_name = "lazynext-agw-feip-public-${var.environment}"
    frontend_port_name             = "port-http"
    protocol                       = "Http"
    host_name                      = var.app_domain
  }

  # Port 443 listeners (HTTPS)
  http_listener {
    name                           = "listener-web-https"
    frontend_ip_configuration_name = "lazynext-agw-feip-public-${var.environment}"
    frontend_port_name             = "port-https"
    protocol                       = "Https"
    host_name                      = var.app_domain
    # SSL certificate: import to Key Vault before production apply:
    #   az keyvault certificate import --vault-name lazynext-kv-${var.environment} \
    #     --name lazynext-tls --file lazynext.pfx
    ssl_certificate_name = "ssl-lazynext-${var.environment}"
  }

  # ── API Subdomain Listener ──────────────────────────────────────────
  # Routes api.lazynext.com → API Gateway Container App

  http_listener {
    name                           = "listener-api-https"
    frontend_ip_configuration_name = "lazynext-agw-feip-public-${var.environment}"
    frontend_port_name             = "port-https"
    protocol                       = "Https"
    host_name                      = "api.${var.app_domain}"
    ssl_certificate_name           = "ssl-lazynext-${var.environment}"
  }

  http_listener {
    name                           = "listener-api-http"
    frontend_ip_configuration_name = "lazynext-agw-feip-public-${var.environment}"
    frontend_port_name             = "port-http"
    protocol                       = "Http"
    host_name                      = "api.${var.app_domain}"
  }

  # ── Request Routing Rules ─────────────────────────────────────────────

  # Web App (HTTP — dev/staging; HTTPS for production)
  request_routing_rule {
    name                       = "rule-web-https"
    rule_type                  = "Basic"
    priority                   = 100
    http_listener_name         = "listener-web-https"
    backend_address_pool_name  = "pool-web"
    backend_http_settings_name = "http-settings-web"
  }

  # Fallback HTTP rule (redirects to HTTPS, or direct access for dev)
  request_routing_rule {
    name                       = "rule-web-http"
    rule_type                  = "Basic"
    priority                   = 110
    http_listener_name         = "listener-web-http"
    backend_address_pool_name  = "pool-web"
    backend_http_settings_name = "http-settings-web"
  }

  # ── API Subdomain Routing ───────────────────────────────────────────
  # Routes api.lazynext.com → API Gateway Container App

  request_routing_rule {
    name                       = "rule-api-https"
    rule_type                  = "Basic"
    priority                   = 120
    http_listener_name         = "listener-api-https"
    backend_address_pool_name  = "pool-api-gateway"
    backend_http_settings_name = "http-settings-api-gateway"
  }

  request_routing_rule {
    name                       = "rule-api-http"
    rule_type                  = "Basic"
    priority                   = 130
    http_listener_name         = "listener-api-http"
    backend_address_pool_name  = "pool-api-gateway"
    backend_http_settings_name = "http-settings-api-gateway"
  }

  # ── Lifecycle ─────────────────────────────────────────────────────────

  lifecycle {
    ignore_changes = [
      tags,
    ]
  }

  tags = {
    Environment = var.environment
    Project     = "lazynext"
    ManagedBy   = "terraform"
  }
}

# ── Diagnostic Settings: Application Gateway → Log Analytics ────────────────

resource "azurerm_monitor_diagnostic_setting" "app_gateway" {
  name                       = "lazynext-diag-agw-${var.environment}"
  target_resource_id         = azurerm_application_gateway.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.container_apps.id

  enabled_log {
    category = "ApplicationGatewayAccessLog"
  }

  enabled_log {
    category = "ApplicationGatewayPerformanceLog"
  }

  enabled_log {
    category = "ApplicationGatewayFirewallLog"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}
