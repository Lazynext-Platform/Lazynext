// Vertex AI provider — uses Google Cloud Application Default Credentials (ADC)
// to call Google Cloud Vertex AI endpoints. This enables access to models that
// require billing (Imagen, Veo, Lyria) using GCP credits.
//
// ADC is set up via `gcloud auth application-default login` and stored at:
//   ~/.config/gcloud/application_default_credentials.json
//
// For production, set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON key.

import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const DEFAULT_ADC_PATH = join(homedir(), '.config', 'gcloud', 'application_default_credentials.json');

interface AdcCredentials {
  type: string;
  client_id: string;
  client_secret: string;
  refresh_token: string;
  quota_project_id?: string;
}

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

function getAdcCredentials(): AdcCredentials {
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS || DEFAULT_ADC_PATH;
  if (!existsSync(path)) {
    throw new Error('Vertex AI: No Application Default Credentials found. Run `gcloud auth application-default login`.');
  }
  return JSON.parse(readFileSync(path, 'utf-8')) as AdcCredentials;
}

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }

  // Try gcloud CLI first (most reliable in dev)
  try {
    const result = spawnSync('gcloud', ['auth', 'print-access-token'], {
      encoding: 'utf-8',
      timeout: 10_000,
    });
    if (result.status === 0 && result.stdout.trim()) {
      const token = result.stdout.trim();
      tokenCache = { token, expiresAt: Date.now() + 50 * 60 * 1000 }; // gcloud tokens last ~60min
      return token;
    }
  } catch {
    // Fall through to ADC refresh
  }

  // Fall back to ADC refresh token exchange
  const creds = getAdcCredentials();
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.client_id,
      client_secret: creds.client_secret,
      refresh_token: creds.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Vertex AI: Failed to refresh access token: ${res.status} ${body.slice(0, 200)}`);
  }
  const data = await res.json() as { access_token: string; expires_in: number };
  tokenCache = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

function getProjectId(): string {
  const fromEnv = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  if (fromEnv) return fromEnv;
  try {
    const creds = getAdcCredentials();
    if (creds.quota_project_id) return creds.quota_project_id;
  } catch { /* ignore */ }
  // Try gcloud config
  try {
    const result = spawnSync('gcloud', ['config', 'get-value', 'project'], {
      encoding: 'utf-8',
      timeout: 5_000,
    });
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  } catch { /* ignore */ }
  throw new Error('Vertex AI: No project ID found. Set GCP_PROJECT_ID or run `gcloud config set project <project>`.');
}

function getRegion(): string {
  return process.env.GCP_REGION || 'us-central1';
}

function vertexEndpoint(model: string, method: string = 'generateContent'): string {
  const project = getProjectId();
  const region = getRegion();
  return `https://${region}-aiplatform.googleapis.com/v1beta1/projects/${project}/locations/${region}/publishers/google/models/${model}:${method}`;
}

function vertexPredictEndpoint(model: string, method: string = 'predict'): string {
  const project = getProjectId();
  const region = getRegion();
  return `https://${region}-aiplatform.googleapis.com/v1/projects/${project}/locations/${region}/publishers/google/models/${model}:${method}`;
}

// ─── Image Generation (gemini-2.5-flash-image) ───

export interface VertexImageResult {
  mimeType: string;
  data: Buffer; // raw image bytes
}

export async function generateImageViaVertex(
  prompt: string,
  aspectRatio?: string,
  referenceImages?: Buffer[],
): Promise<VertexImageResult[]> {
  const token = await getAccessToken();
  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  if (aspectRatio) {
    parts[0].text = `${prompt}\n\nAspect ratio: ${aspectRatio}`;
  }
  for (const ref of referenceImages ?? []) {
    parts.push({ inlineData: { mimeType: 'image/png', data: ref.toString('base64') } });
  }

  const res = await fetch(vertexEndpoint('gemini-2.5-flash-image'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Vertex AI image generation failed: ${res.status} ${body.slice(0, 300)}`);
  }
  const data = await res.json() as { candidates: Array<{ content: { parts: Array<{ inlineData?: { mimeType: string; data: string } }> } }> };
  const results: VertexImageResult[] = [];
  for (const part of data.candidates[0].content.parts) {
    if (part.inlineData) {
      results.push({ mimeType: part.inlineData.mimeType, data: Buffer.from(part.inlineData.data, 'base64') });
    }
  }
  if (results.length === 0) throw new Error('Vertex AI image generation returned no images');
  return results;
}

// ─── Video Generation (Veo 3.1 Lite) ───

export interface VertexVideoOperation {
  operationName: string;
}

export async function startVideoGenerationViaVertex(
  prompt: string,
  options?: { durationSeconds?: number; aspectRatio?: string; sampleCount?: number },
): Promise<VertexVideoOperation> {
  const token = await getAccessToken();
  const params: Record<string, unknown> = {
    sampleCount: options?.sampleCount ?? 1,
  };
  if (options?.durationSeconds) params.durationSeconds = options.durationSeconds;
  if (options?.aspectRatio) params.aspectRatio = options.aspectRatio;

  const res = await fetch(vertexPredictEndpoint('veo-3.1-lite-generate-001', 'predictLongRunning'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: params,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Vertex AI video generation failed: ${res.status} ${body.slice(0, 300)}`);
  }
  const data = await res.json() as { name: string };
  return { operationName: data.name };
}

export async function checkVideoOperation(operationName: string): Promise<{ done: boolean; videoUri?: string; error?: string }> {
  const token = await getAccessToken();
  const baseUrl = `https://${getRegion()}-aiplatform.googleapis.com/v1beta1/${operationName}`;
  const res = await fetch(baseUrl, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Vertex AI operation check failed: ${res.status} ${body.slice(0, 300)}`);
  }
  const data = await res.json() as { done: boolean; error?: { message: string }; response?: { predictions?: Array<{ bytesBase64Encoded?: string; videoUri?: string }> } };
  if (data.error) return { done: true, error: data.error.message };
  if (data.done && data.response?.predictions?.[0]) {
    return { done: true, videoUri: data.response.predictions[0].videoUri };
  }
  return { done: false };
}

// ─── TTS (gemini-2.5-flash-tts via Vertex AI) ───

export async function generateTtsViaVertex(
  text: string,
  voiceName?: string,
): Promise<{ mimeType: string; data: Buffer }> {
  const token = await getAccessToken();
  const res = await fetch(vertexEndpoint('gemini-2.5-flash-tts'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || 'Puck' },
          },
        },
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Vertex AI TTS failed: ${res.status} ${body.slice(0, 300)}`);
  }
  const data = await res.json() as { candidates: Array<{ content: { parts: Array<{ inlineData?: { mimeType: string; data: string } }> } }> };
  for (const part of data.candidates[0].content.parts) {
    if (part.inlineData) {
      return { mimeType: part.inlineData.mimeType, data: Buffer.from(part.inlineData.data, 'base64') };
    }
  }
  throw new Error('Vertex AI TTS returned no audio');
}

// ─── Health check ───

export async function vertexAiHealthCheck(): Promise<{ ok: boolean; project?: string; error?: string }> {
  try {
    const token = await getAccessToken();
    const project = getProjectId();
    // Simple text generation to verify access
    const res = await fetch(vertexEndpoint('gemini-2.5-flash'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }] }),
    });
    if (res.ok) return { ok: true, project };
    const body = await res.text();
    return { ok: false, project, error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
