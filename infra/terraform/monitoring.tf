# ── Azure Monitor: Application Insights, Alerts, Availability Tests ──────
# Workspace-based Application Insights per service, metric/log alerts for
# CPU/Memory/5xx/Latency, URL ping tests, and diagnostic settings.

# ── Locals for monitoring ───────────────────────────────────────────────────

locals {
  # Parse memory strings (e.g., "4Gi") to bytes for alert thresholds
  memory_bytes = {
    for k, v in local.container_apps :
    k => tonumber(replace(v.memory, "Gi", "")) * 1024 * 1024 * 1024
  }

  # CPU alert threshold in nano-cores (80 % of allocated)
  cpu_alert_threshold_nano = {
    for k, v in local.container_apps :
    k => v.cpu * 1000000000 * 0.80
  }

  # Memory alert threshold in bytes (85 % of allocated)
  memory_alert_threshold_bytes = {
    for k, v in local.container_apps :
    k => local.memory_bytes[k] * 0.85
  }

  # Service → Container App resource ID lookup (for alert scopes)
  container_app_ids = {
    web               = azurerm_container_app.web.id
    ai_agents         = azurerm_container_app.ai_agents.id
    render_service    = azurerm_container_app.render_service.id
    pre_processing    = azurerm_container_app.pre_processing.id
    generative_studio = azurerm_container_app.generative_studio.id
    api_gateway       = azurerm_container_app.api_gateway.id
    collab_server     = azurerm_container_app.collab_server.id
    analytics_service = azurerm_container_app.analytics_service.id
  }

  # Friendly service names for alert labels
  service_labels = {
    web               = "Web App"
    ai_agents         = "AI Agents"
    render_service    = "Render Service"
    pre_processing    = "Pre-Processing"
    generative_studio = "Generative Studio"
    api_gateway       = "API Gateway"
    collab_server     = "Collab Server"
    analytics_service = "Analytics Service"
  }

  # Web test target URLs
  container_app_urls = {
    web               = "https://${azurerm_container_app.web.latest_revision_fqdn}"
    ai_agents         = "https://${azurerm_container_app.ai_agents.latest_revision_fqdn}/health"
    render_service    = "https://${azurerm_container_app.render_service.latest_revision_fqdn}/health"
    pre_processing    = "https://${azurerm_container_app.pre_processing.latest_revision_fqdn}/health"
    generative_studio = "https://${azurerm_container_app.generative_studio.latest_revision_fqdn}/health"
    api_gateway       = "https://${azurerm_container_app.api_gateway.latest_revision_fqdn}/health"
    collab_server     = "https://${azurerm_container_app.collab_server.latest_revision_fqdn}/health"
    analytics_service = "https://${azurerm_container_app.analytics_service.latest_revision_fqdn}/health"
  }
}

# ── Application Insights (workspace-based, one per service) ─────────────────

resource "azurerm_application_insights" "service" {
  for_each = local.container_apps

  name                = "lazynext-ai-${each.key}-${var.environment}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  application_type    = "web"

  # Workspace-based: all telemetry flows into the shared Log Analytics workspace
  workspace_id = azurerm_log_analytics_workspace.container_apps.id

  tags = {
    Environment = var.environment
    Project     = "lazynext"
    Service     = local.service_labels[each.key]
    ManagedBy   = "terraform"
  }
}

# ── Instrumentation Key secrets in Key Vault ────────────────────────────────

resource "azurerm_key_vault_secret" "appinsights_connection_string" {
  for_each = local.container_apps

  name         = "appinsights-connection-string-${replace(lower(each.key), "_", "-")}"
  value        = azurerm_application_insights.service[each.key].connection_string
  key_vault_id = azurerm_key_vault.secrets.id
  content_type = "text/plain"

  lifecycle {
    ignore_changes = [value]
  }
}

# ── Action Group ────────────────────────────────────────────────────────────

resource "azurerm_monitor_action_group" "main" {
  name                = "lazynext-ag-${var.environment}"
  resource_group_name = azurerm_resource_group.rg.name
  short_name          = "lazynext"

  email_receiver {
    name                    = "lazynext-ops-email"
    email_address           = var.alert_email_address
    use_common_alert_schema = true
  }

  # Optional Slack receiver (only created when webhook URL is provided)
  dynamic "webhook_receiver" {
    for_each = var.alert_slack_webhook_url != "" ? [1] : []
    content {
      name                    = "lazynext-slack"
      service_uri             = var.alert_slack_webhook_url
      use_common_alert_schema = true
    }
  }

  tags = {
    Environment = var.environment
    Project     = "lazynext"
    ManagedBy   = "terraform"
  }
}

# ── Metric Alert: CPU > 80 % (per service) ──────────────────────────────────

resource "azurerm_monitor_metric_alert" "cpu" {
  for_each = local.container_apps

  name                = "lazynext-cpu-high-${each.key}-${var.environment}"
  resource_group_name = azurerm_resource_group.rg.name
  scopes              = [local.container_app_ids[each.key]]
  description         = "${local.service_labels[each.key]}: CPU usage exceeds 80% for 5 minutes"
  severity            = 2
  frequency           = "PT1M"
  window_size         = "PT5M"
  auto_mitigate       = true

  criteria {
    metric_namespace = "Microsoft.App/containerApps"
    metric_name      = "UsageNanoCores"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = local.cpu_alert_threshold_nano[each.key]

    dimension {
      name     = "revisionName"
      operator = "Include"
      values   = ["*"]
    }
  }

  dynamic "action" {
    for_each = [1]
    content {
      action_group_id = azurerm_monitor_action_group.main.id
    }
  }

  tags = {
    Environment = var.environment
    Project     = "lazynext"
    Service     = local.service_labels[each.key]
  }
}

# ── Metric Alert: Memory > 85 % (per service) ───────────────────────────────

resource "azurerm_monitor_metric_alert" "memory" {
  for_each = local.container_apps

  name                = "lazynext-mem-high-${each.key}-${var.environment}"
  resource_group_name = azurerm_resource_group.rg.name
  scopes              = [local.container_app_ids[each.key]]
  description         = "${local.service_labels[each.key]}: memory usage exceeds 85% for 5 minutes"
  severity            = 2
  frequency           = "PT1M"
  window_size         = "PT5M"
  auto_mitigate       = true

  criteria {
    metric_namespace = "Microsoft.App/containerApps"
    metric_name      = "WorkingSetBytes"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = local.memory_alert_threshold_bytes[each.key]

    dimension {
      name     = "revisionName"
      operator = "Include"
      values   = ["*"]
    }
  }

  dynamic "action" {
    for_each = [1]
    content {
      action_group_id = azurerm_monitor_action_group.main.id
    }
  }

  tags = {
    Environment = var.environment
    Project     = "lazynext"
    Service     = local.service_labels[each.key]
  }
}

# ── Log Query Alert: HTTP 5xx Error Rate > 2% ───────────────────────────────

resource "azurerm_monitor_scheduled_query_rules_alert_v2" "http_5xx" {
  for_each = local.container_apps

  name                 = "lazynext-5xx-rate-${each.key}-${var.environment}"
  resource_group_name  = azurerm_resource_group.rg.name
  location             = azurerm_resource_group.rg.location
  description          = "${local.service_labels[each.key]}: HTTP 5xx error rate exceeds 2% over 5 minutes"
  severity             = 1
  evaluation_frequency = "PT5M"
  window_duration      = "PT5M"

  scopes = [azurerm_application_insights.service[each.key].id]

  criteria {
    query = <<-KQL
      requests
      | where timestamp > ago(5m)
      | summarize total = count(),
                  failed = countif(success == false and toint(resultCode) >= 500)
      | project failedRate = iff(total > 0, toreal(failed) / toreal(total) * 100.0, 0.0)
      | where failedRate > 2.0
    KQL

    time_aggregation_method = "Count"

    operator  = "GreaterThan"
    threshold = 0

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }

  enabled = var.environment == "production"

  dynamic "action" {
    for_each = [1]
    content {
      action_groups = [azurerm_monitor_action_group.main.id]
    }
  }

  tags = {
    Environment = var.environment
    Project     = "lazynext"
    Service     = local.service_labels[each.key]
  }
}

# ── Log Query Alert: Response Time p95 > 5 seconds ──────────────────────────

resource "azurerm_monitor_scheduled_query_rules_alert_v2" "response_time_p95" {
  for_each = local.container_apps

  name                 = "lazynext-p95-latency-${each.key}-${var.environment}"
  resource_group_name  = azurerm_resource_group.rg.name
  location             = azurerm_resource_group.rg.location
  description          = "${local.service_labels[each.key]}: P95 response time exceeds 5 seconds over 5 minutes"
  severity             = 2
  evaluation_frequency = "PT5M"
  window_duration      = "PT5M"

  scopes = [azurerm_application_insights.service[each.key].id]

  criteria {
    query = <<-KQL
      requests
      | where timestamp > ago(5m)
      | summarize percentiles(duration, 95)
      | project p95_duration = percentile_duration_95 / 1000.0
      | where p95_duration > 5000.0
    KQL

    time_aggregation_method = "Count"

    operator  = "GreaterThan"
    threshold = 0

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }

  enabled = var.environment == "production"

  dynamic "action" {
    for_each = [1]
    content {
      action_groups = [azurerm_monitor_action_group.main.id]
    }
  }

  tags = {
    Environment = var.environment
    Project     = "lazynext"
    Service     = local.service_labels[each.key]
  }
}

# ── Replica Count Alert: fewer than 1 replica running ───────────────────────

resource "azurerm_monitor_metric_alert" "replica_count" {
  for_each = local.container_apps

  name                = "lazynext-replica-zero-${each.key}-${var.environment}"
  resource_group_name = azurerm_resource_group.rg.name
  scopes              = [local.container_app_ids[each.key]]
  description         = "${local.service_labels[each.key]}: running replica count is zero"
  severity            = 1
  frequency           = "PT1M"
  window_size         = "PT5M"
  auto_mitigate       = true

  criteria {
    metric_namespace = "Microsoft.App/containerApps"
    metric_name      = "ReplicaCount"
    aggregation      = "Average"
    operator         = "LessThan"
    threshold        = 1
  }

  dynamic "action" {
    for_each = [1]
    content {
      action_group_id = azurerm_monitor_action_group.main.id
    }
  }

  tags = {
    Environment = var.environment
    Project     = "lazynext"
    Service     = local.service_labels[each.key]
  }
}

# ── Availability (URL Ping) Test: every 5 min from 3 geographic locations ───

resource "azurerm_application_insights_standard_web_test" "web_app" {
  for_each = {
    web               = local.container_app_urls["web"]
    ai_agents         = local.container_app_urls["ai_agents"]
    render_service    = local.container_app_urls["render_service"]
    pre_processing    = local.container_app_urls["pre_processing"]
    generative_studio = local.container_app_urls["generative_studio"]
  }

  name                    = "lazynext-ping-${each.key}-${var.environment}"
  resource_group_name     = azurerm_resource_group.rg.name
  location                = azurerm_resource_group.rg.location
  application_insights_id = azurerm_application_insights.service[each.key].id
  frequency               = 300 # 5 minutes
  timeout                 = 30
  enabled                 = var.environment == "production"

  request {
    url                              = each.value
    parse_dependent_requests_enabled = false
    follow_redirects_enabled         = true
  }

  # Test from 3 globally distributed Azure datacenter regions
  geo_locations = [
    "us-va-ash-azr",   # Virginia, USA
    "emea-gb-db3-azr", # London, UK
    "apac-jp-kaw-azr", # Kawasaki, Japan
  ]

  tags = {
    Environment = var.environment
    Project     = "lazynext"
    Service     = local.service_labels[each.key]
    ManagedBy   = "terraform"
  }
}

# ── Diagnostic Settings: Container Apps → Log Analytics ─────────────────────

resource "azurerm_monitor_diagnostic_setting" "container_app" {
  for_each = local.container_apps

  name                       = "lazynext-diag-${each.key}-${var.environment}"
  target_resource_id         = local.container_app_ids[each.key]
  log_analytics_workspace_id = azurerm_log_analytics_workspace.container_apps.id

  enabled_log {
    category = "ContainerAppConsoleLogs"
  }

  enabled_log {
    category = "ContainerAppSystemLogs"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}

# ── Diagnostic Settings: Container Apps Environment → Log Analytics ─────────

resource "azurerm_monitor_diagnostic_setting" "container_app_env" {
  name                       = "lazynext-diag-cappenv-${var.environment}"
  target_resource_id         = azurerm_container_app_environment.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.container_apps.id

  enabled_metric {
    category = "AllMetrics"
  }
}

# ── Diagnostic Settings: PostgreSQL → Log Analytics ─────────────────────────

resource "azurerm_monitor_diagnostic_setting" "postgres" {
  name                       = "lazynext-diag-postgres-${var.environment}"
  target_resource_id         = azurerm_postgresql_flexible_server.postgres.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.container_apps.id

  enabled_log {
    category = "PostgreSQLLogs"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}

# ── Diagnostic Settings: Key Vault → Log Analytics ──────────────────────────

resource "azurerm_monitor_diagnostic_setting" "keyvault" {
  name                       = "lazynext-diag-keyvault-${var.environment}"
  target_resource_id         = azurerm_key_vault.secrets.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.container_apps.id

  enabled_log {
    category = "AuditEvent"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}
