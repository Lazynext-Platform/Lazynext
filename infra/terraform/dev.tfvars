# ── Core ─────────────────────────────────────────────────────────────────
location     = "southeastasia"
environment  = "dev"
app_domain   = "lazynext.ai"
domain_name  = "lazynext.com"
create_dns_zone = false

# ── AKS ──────────────────────────────────────────────────────────────────
kubernetes_version = "1.32"
node_count         = 1

# ── Database ─────────────────────────────────────────────────────────────
db_password = "REPLACE_ME_DB_PASSWORD_MIN_16_CHARS"
db_sku_name = "B_Standard_B1ms"

# ── Application ──────────────────────────────────────────────────────────
better_auth_secret = "REPLACE_ME_64_CHAR_BETTER_AUTH_SECRET_MINIMUM_64_CHARACTERS_LONG"

# ── API Keys (placeholder — replace with real keys after dev testing) ───
openai_api_key        = "sk-placeholder-openai-key-for-dev"
anthropic_api_key     = "sk-ant-placeholder-anthropic-key-for-dev"
gemini_api_key        = "placeholder-gemini-key"
replicate_api_token   = "r8_placeholder-replicate-token"
elevenlabs_api_key    = "placeholder-elevenlabs-key"
stripe_secret_key     = "sk_test_placeholder"
stripe_webhook_secret = "whsec_placeholder"
resend_api_key        = "re_placeholder"

# ── LLM ──────────────────────────────────────────────────────────────────
llm_provider = "anthropic"
