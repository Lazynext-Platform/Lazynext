/**
 * Lazynext API Client SDK
 *
 * TypeScript client for the Lazynext API Gateway (port 8005).
 * Provides typed methods with JWT authentication and rate limit handling.
 */
/**
 * Configuration for the Lazynext API client.
 *
 * @example
 * ```ts
 * const client = new LazynextClient({
 *   baseUrl: "https://api.lazynext.com",
 *   token: "lz_sk_...",
 *   onTokenExpired: async () => refreshMyToken(),
 * });
 * ```
 */
export interface ClientConfig {
  /** API Gateway base URL (default: `http://localhost:8005`) */
  baseUrl?: string;
  /** JWT bearer token for authenticated requests */
  token?: string;
  /** Callback invoked on 401; should return a fresh token */
  onTokenExpired?: () => Promise<string>;
}

/**
 * TypeScript client for the Lazynext API Gateway (Axum, port 8005).
 *
 * Provides typed methods with automatic JWT authentication, token
 * refresh on 401, and Retry-After-aware 429 backoff. All methods
 * return Promises that throw on non-2xx responses.
 *
 * @example Basic usage
 * ```ts
 * const lazynext = new LazynextClient({ token: "lz_sk_..." });
 *
 * // Check gateway health
 * const { status } = await lazynext.health.check();
 *
 * // Run an AI edit
 * const { plan, operations } = await lazynext.editor.autonomousEdit(
 *   "Remove all silence and add background music"
 * );
 *
 * // Get timeline state
 * const timeline = await lazynext.timeline.get();
 *
 * // List projects
 * const { projects } = await lazynext.projects.list();
 * ```
 */
export class LazynextClient {
  /** API Gateway base URL */
  private baseUrl: string;
  /** JWT bearer token */
  private token: string | null;
  /** Optional callback for automatic token refresh on 401 */
  private onTokenExpired?: () => Promise<string>;

  /**
   * Create a new API client.
   *
   * @param config - Client configuration (all fields optional)
   */
  constructor(config: ClientConfig = {}) {
    this.baseUrl = config.baseUrl || "http://localhost:8005";
    this.token = config.token || null;
    this.onTokenExpired = config.onTokenExpired;
  }

  /**
   * Update the bearer token for subsequent requests.
   * Call after token refresh or initial login.
   */
  setToken(token: string): void { this.token = token; }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;

    const resp = await fetch(`${this.baseUrl}${path}`, {
      method, headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (resp.status === 401 && this.onTokenExpired) {
      this.token = await this.onTokenExpired();
      return this.request(method, path, body);
    }
    if (resp.status === 429) {
      const retry = parseInt(resp.headers.get("Retry-After") || "1", 10);
      await new Promise((r) => setTimeout(r, retry * 1000));
      return this.request(method, path, body);
    }
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${resp.status}`);
    }
    return resp.json();
  }

  health = { check: () => this.request<{ status: string }>("GET", "/health") };

  editor = {
    autonomousEdit: (prompt: string, opts?: { requirePlanApproval?: boolean; llmProvider?: string }) =>
      this.request("POST", "/api/v1/autonomous_edit", {
        prompt, require_plan_approval: opts?.requirePlanApproval ?? true,
        source_files: [], llm_provider: opts?.llmProvider,
      }),
    triggerRender: () => this.request("POST", "/api/v1/render"),
  };

  timeline = {
    get: () => this.request<any>("GET", "/api/v1/timeline"),
    addClip: (clip: { trackId?: string; clipType?: string; name?: string; start?: number; end?: number }) =>
      this.request("POST", "/api/v1/timeline", clip),
  };

  projects = { list: () => this.request<{ projects: any[] }>("GET", "/api/v1/projects") };

  user = {
    profile: () => this.request<any>("GET", "/api/v1/user/profile"),
    credits: () => this.request<{ credits: number }>("GET", "/api/v1/user/credits"),
  };

  ai = {
    generate: (prompt: string) => this.request("POST", "/api/v1/ai/generate", { prompt }),
    tts: (text: string, voiceId?: string) => this.request("POST", "/api/v1/ai/tts", { text, voice_id: voiceId }),
    ingest: (url: string, source?: string) => this.request("POST", "/api/v1/ai/ingest", { url, source }),
  };

  integrations = {
    connect: (platform: string, code?: string, redirectUri?: string) =>
      this.request("POST", "/api/v1/user/integrations/connect", { platform, code, redirect_uri: redirectUri }),
  };

  admin = { dashboard: () => this.request<any>("GET", "/api/v1/admin/dashboard") };
}

export default LazynextClient;
