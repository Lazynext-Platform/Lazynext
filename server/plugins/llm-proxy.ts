import type { IncomingMessage } from 'node:http';
import type { Plugin } from 'vite';
import { spawnSync } from 'node:child_process';
import { getKey, type KeyName } from '../keystore.ts';
import {
  normalizeLlmProvider,
  llmProviderPreset,
  protocolForProvider,
  type LlmProvider,
} from '../../shared/llm-providers.ts';
import { resolveLlmProviderConfig } from '../llm-config.ts';
import { proxyMiddleware } from '../proxy.ts';

function keyReader(name: string): string {
  return getKey(name as KeyName);
}

export function llmProviderForRequest(req?: IncomingMessage): LlmProvider {
  const requested = req?.headers['x-lazynext-provider'];
  return normalizeLlmProvider(typeof requested === 'string' ? requested : getKey('LLM_PROVIDER'));
}

export function llmTarget(req?: IncomingMessage): string {
  const provider = llmProviderForRequest(req);
  const protocol = protocolForProvider(provider);
  if (protocol === 'google-vertex') {
    // Construct Vertex AI base URL dynamically from GCP project/region.
    const project = getKey('GCP_PROJECT_ID') || process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || '';
    const region = getKey('GCP_REGION') || process.env.GCP_REGION || process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
    if (!project) {
      // Fall back to preset default if project is not configured
      return resolveLlmProviderConfig(provider, keyReader).baseUrl;
    }
    return `https://${region}-aiplatform.googleapis.com/v1beta1/projects/${project}/locations/${region}/publishers/google`;
  }
  return resolveLlmProviderConfig(provider, keyReader).baseUrl;
}

// Synchronous ADC token retrieval for the Vertex AI proxy path.
// Uses gcloud CLI (spawnSync) with an in-memory cache. In production,
// GOOGLE_APPLICATION_CREDENTIALS can point to a service account key.
let vertexTokenCache: { token: string; expiresAt: number } | null = null;

function getVertexAccessToken(): string {
  if (vertexTokenCache && Date.now() < vertexTokenCache.expiresAt - 60_000) {
    return vertexTokenCache.token;
  }
  try {
    const result = spawnSync('gcloud', ['auth', 'print-access-token'], {
      encoding: 'utf-8',
      timeout: 10_000,
    });
    if (result.status === 0 && result.stdout.trim()) {
      const token = result.stdout.trim();
      vertexTokenCache = { token, expiresAt: Date.now() + 50 * 60 * 1000 };
      return token;
    }
  } catch { /* fall through */ }
  return '';
}

export function llmHeaders(req?: IncomingMessage): Record<string, string> {
  const config = resolveLlmProviderConfig(llmProviderForRequest(req), keyReader);
  const protocol = protocolForProvider(config.provider);
  if (protocol === 'google-vertex') {
    // Vertex AI uses OAuth bearer tokens from ADC, not API keys.
    const token = getVertexAccessToken();
    if (!token) return {};
    return { authorization: `Bearer ${token}` };
  }
  if (!config.apiKey) return {};
  if (protocol === 'anthropic') return { 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01' };
  if (protocol === 'google') return { 'x-goog-api-key': config.apiKey };
  return { authorization: `Bearer ${config.apiKey}` };
}

export function llmErrorMessage(status: number, req?: IncomingMessage): string {
  const provider = llmProviderForRequest(req);
  const label = llmProviderPreset(provider).label;
  if (status === 401 || status === 403) {
    return `${label} authentication failed. Please check the API Key in "Settings → Agent Model".`;
  }
  if (status === 402 || status === 429) {
    return `${label} insufficient quota or too many requests. Please check your account quota and try again later.`;
  }
  if (status === 404) {
    return `${label} endpoint or model not found. Please check the Base URL and model name.`;
  }
  if (status >= 500) {
    return `${label} service temporarily unavailable (HTTP ${status}). Please try again later or switch models.`;
  }
  return `${label} request failed (HTTP ${status}). Please check the connection settings in "Settings → Agent Model".`;
}

/** One dynamic proxy implementation shared by Vite dev and Electron production. */
export function llmProxyPlugin(): Plugin {
  return {
    name: 'lazynext-llm-proxy',
    configureServer(server) {
      server.middlewares.use('/llm', proxyMiddleware({
        target: llmTarget,
        headers: llmHeaders,
        forceJsonContentType: true,
        errorMessage: llmErrorMessage,
      }));
    },
  };
}
