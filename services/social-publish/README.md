# Social Publish Service

Publishes rendered videos directly to TikTok, YouTube, and Instagram.

## Features

- **Multi-platform OAuth 2.0** — TikTok, YouTube (Data API v3), Instagram (Graph API)
- **Chunked upload** with retry logic for large files
- **Auto-reframing** via ffmpeg for platform-specific aspect ratios
- **AI metadata generation** — titles, descriptions, hashtags, thumbnails
- **Thumbnail A/B testing**
- **Scheduled posting** with BullMQ-backed delay
- **Graceful degradation** — returns honest errors when API keys are absent

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/publish` | Publish a rendered video to one or more platforms |
| `GET` | `/publish/status/:jobId` | Check the status of a publish job |
| `POST` | `/oauth/connect` | Initiate OAuth 2.0 flow for a platform |
| `GET` | `/oauth/callback/:platform` | OAuth 2.0 callback handler |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TIKTOK_CLIENT_KEY` | For TikTok | TikTok API client key |
| `TIKTOK_CLIENT_SECRET` | For TikTok | TikTok API client secret |
| `YOUTUBE_CLIENT_ID` | For YouTube | Google API client ID |
| `YOUTUBE_CLIENT_SECRET` | For YouTube | Google API client secret |
| `INSTAGRAM_APP_ID` | For Instagram | Facebook app ID |
| `INSTAGRAM_APP_SECRET` | For Instagram | Facebook app secret |
| `OUTPUT_DIR` | No | Directory containing rendered videos (default: `../render-service/outputs`) |
