# ── Core ─────────────────────────────────────────────────────────────────
location        = "eastus2"
environment     = "production"
app_domain      = "lazynext.com"
domain_name     = "lazynext.com"
create_dns_zone = true

# ── AKS ──────────────────────────────────────────────────────────────────
kubernetes_version = "1.32"
node_count         = 3

# ── Database ─────────────────────────────────────────────────────────────
db_password = "REPLACE_ME_DB_PASSWORD_MIN_16_CHARS"
db_sku_name = "GP_Standard_D2s_v3"

# ── Application ──────────────────────────────────────────────────────────
better_auth_secret = "REPLACE_ME_64_CHAR_BETTER_AUTH_SECRET_MINIMUM_64_CHARACTERS_LONG"

# ── API Keys (placeholder — replace with real keys before production) ───
openai_api_key        = "sk-placeholder-openai-key-for-production"
anthropic_api_key     = "sk-ant-placeholder-anthropic-key-for-production"
gemini_api_key        = "placeholder-gemini-key"
replicate_api_token   = "r8_placeholder-replicate-token"
elevenlabs_api_key    = "placeholder-elevenlabs-key"
stripe_secret_key     = "sk_live_placeholder"
stripe_webhook_secret = "whsec_placeholder"
resend_api_key        = "re_placeholder"

# ── LLM ──────────────────────────────────────────────────────────────────
llm_provider = "anthropic"

# ── Redis Cache ──────────────────────────────────────────────────────────
redis_sku_name = "Enterprise_E20"
redis_capacity = 2

# ── CDN / Front Door ─────────────────────────────────────────────────────
cdn_sku_name        = "Premium_AzureFrontDoor"
media_custom_domain = "media.lazynext.com"

# ── Monitoring / Alerts ──────────────────────────────────────────────────
alert_email_address             = "alerts@lazynext.ai"
alert_slack_webhook_url         = ""
alert_pagerduty_integration_key = ""

# ── Application Gateway / WAF ────────────────────────────────────────────
app_gateway_sku_tier      = "WAF_v2"
app_gateway_capacity      = 3
app_gateway_subnet_prefix = ["10.0.1.0/24"]

# ── Backup ───────────────────────────────────────────────────────────────
backup_retention_days = 90
backup_policy_time    = "02:00"

# Enable Azure Backup Vault for PostgreSQL and Blob storage
enable_backup = true
