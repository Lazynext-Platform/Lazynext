# Google Cloud Migration Guide

This guide explains how to migrate the Lazynext Google Cloud setup from the current account to a new account.

## Account Plan

| Phase | Account | Status | Timeline |
|---|---|---|---|
| **Current (now)** | `support@devinedesk.com` | Active — all models, Vertex AI, billing | Now |
| **Future (migration)** | `support@lazynext.com` | Not yet created — will replace devinedesk | In 1-2 months |
| **Retired** | `avaspatel99@gmail.com` | 8 projects already deleted; 1 inaccessible project (`concrete-drake-spwwt`) remains under AIDA org | N/A |

**Rule**: Only `support@devinedesk.com` and `support@lazynext.com` are used for this project.
No other GCP account is used. The old `avaspatel99@gmail.com` account has been cleaned up
and is no longer used for Lazynext.

## Current Setup

| Item | Value |
|---|---|
| Current account | `support@devinedesk.com` |
| Target account (future) | `support@lazynext.com` |
| Project ID | `lazynext-ai` |
| Project number | `1016776851172` |
| Region | `us-central1` |
| Billing account | `0109DF-FA3450-4B5459` (My Billing Account) |

## Enabled APIs

The following APIs are enabled on the current project:

- `aiplatform.googleapis.com` — Vertex AI (Imagen, Veo, Gemini)
- `speech.googleapis.com` — Cloud Speech-to-Text
- `texttospeech.googleapis.com` — Cloud Text-to-Text
- `billingbudgets.googleapis.com` — Billing Budget API
- `bigquery.googleapis.com` — BigQuery (auto-enabled)
- `logging.googleapis.com` — Cloud Logging (auto-enabled)
- `monitoring.googleapis.com` — Cloud Monitoring (auto-enabled)

## IAM Roles

The service account `lazynext-ai-sa@lazynext-ai.iam.gserviceaccount.com` has:
- `roles/aiplatform.user` — Vertex AI access
- `roles/owner` — Project owner (granted during setup)

## Authentication

Lazynext uses Application Default Credentials (ADC) for all Google Cloud services:
- ADC file: `~/.config/gcloud/application_default_credentials.json`
- No service account JSON key is downloaded (org policy blocks key creation)
- The app reads `GCP_PROJECT_ID` and `GCP_REGION` from `.env`
- The Vertex AI LLM provider (`LLM_PROVIDER=vertex`) uses ADC bearer tokens obtained via `gcloud auth print-access-token` — no API key required
- Image generation (Imagen), video generation (Veo), and TTS also use ADC through the same GCP project

## Migration Steps

### 1. Create a new GCP project in the target account

```bash
# Log in with the new account
gcloud auth login
gcloud auth application-default login

# Create a new project
gcloud projects create lazynext-ai-prod --name="Lazynext AI"
gcloud config set project lazynext-ai-prod
gcloud config set compute/region us-central1
```

### 2. Link billing

```bash
# List billing accounts available in the new account
gcloud billing accounts list

# Link the billing account
gcloud billing projects link lazynext-ai-prod --billing-account=NEW_BILLING_ACCOUNT_ID
```

### 3. Enable APIs

```bash
gcloud services enable aiplatform.googleapis.com
gcloud services enable speech.googleapis.com
gcloud services enable texttospeech.googleapis.com
```

### 4. Create a service account (if org policy allows)

```bash
gcloud iam service-accounts create lazynext-ai-sa \
  --display-name="Lazynext AI Service Account" \
  --project=lazynext-ai-prod

gcloud projects add-iam-policy-binding lazynext-ai-prod \
  --member="serviceAccount:lazynext-ai-sa@lazynext-ai-prod.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

### 5. Update ADC quota project

```bash
gcloud auth application-default set-quota-project lazynext-ai-prod
```

### 6. Update Lazynext .env

```bash
GCP_PROJECT_ID=lazynext-ai-prod
GCP_REGION=us-central1
```

The Vertex AI LLM provider automatically constructs the correct regional endpoint from these values. No `LLM_VERTEX_BASE_URL` or `LLM_VERTEX_API_KEY` is needed — ADC handles authentication.

### 7. Set up billing budget alerts

Go to https://console.cloud.google.com/billing → Budgets → Create Budget:
- Name: `Lazynext AI Budget`
- Amount: `$50` (or your preferred amount)
- Alerts at: 50%, 75%, 90%, 100%
- Scope: `lazynext-ai-prod` project only

### 8. Verify

```bash
# Test Vertex AI access
gcloud auth print-access-token | head -c 20
echo "Token obtained"

# Test image generation
curl -s -X POST \
  "https://us-central1-aiplatform.googleapis.com/v1beta1/projects/lazynext-ai-prod/locations/us-central1/publishers/google/models/gemini-2.5-flash-image:generateContent" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"role":"user","parts":[{"text":"Draw a blue circle"}]}],"generationConfig":{"responseModalities":["IMAGE","TEXT"]}}' | head -c 100
```

## What Does NOT Need Migration

- **Application code**: No code changes needed — the app reads project ID from env
- **Vertex AI LLM provider**: The `vertex` provider uses ADC and reads `GCP_PROJECT_ID`/`GCP_REGION` from `.env`. After updating those values, the LLM chat path automatically uses the new project.
- **Pollinations**: Free image generation, no GCP dependency
- **Repository**: GitHub repo is independent of GCP account

## Security Checklist

- [ ] Do not commit `.env` to git
- [ ] Do not commit ADC files or service account JSON keys
- [ ] Verify `.gitignore` excludes all credential files
- [ ] Set up billing budget alerts
- [ ] Use workload identity for production deployments (not downloaded keys)
- [ ] Run `gcloud auth application-default login` on each developer machine
