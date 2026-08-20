# Google Cloud Migration Guide

This guide explains how to migrate the Lazynext Google Cloud setup from the current account to a new account.

## Current Setup

| Item | Value |
|---|---|
| Current account | `support@devinedesk.com` |
| Target account | `support@lazynext.com` |
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

Lazynext uses Application Default Credentials (ADC):
- ADC file: `~/.config/gcloud/application_default_credentials.json`
- No service account JSON key is downloaded (org policy blocks key creation)
- The app reads `GCP_PROJECT_ID` and `GCP_REGION` from `.env`

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
- **Gemini API key**: The Gemini API key (for chat/transcription/TTS) is separate from Vertex AI and works across accounts
- **Pollinations**: Free image generation, no GCP dependency
- **Repository**: GitHub repo is independent of GCP account

## Security Checklist

- [ ] Rotate the Gemini API key (if exposed)
- [ ] Do not commit `.env` to git
- [ ] Do not commit ADC files or service account JSON keys
- [ ] Verify `.gitignore` excludes all credential files
- [ ] Set up billing budget alerts
- [ ] Use workload identity for production deployments (not downloaded keys)
