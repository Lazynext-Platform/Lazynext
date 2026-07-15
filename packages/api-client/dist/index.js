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
    baseUrl;
    /** JWT bearer token */
    token;
    /** Optional callback for automatic token refresh on 401 */
    onTokenExpired;
    /**
     * Create a new API client.
     *
     * @param config - Client configuration (all fields optional)
     */
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || "http://localhost:8005";
        this.token = config.token || null;
        this.onTokenExpired = config.onTokenExpired;
    }
    /**
     * Update the bearer token for subsequent requests.
     * Call after token refresh or initial login.
     */
    setToken(token) { this.token = token; }
    async request(method, path, body) {
        const headers = { "Content-Type": "application/json" };
        if (this.token)
            headers["Authorization"] = `Bearer ${this.token}`;
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
    /** Gateway health-check endpoint. */
    health = { check: () => this.request("GET", "/health") };
    /** Editor commands: autonomous AI edits and render trigger. */
    editor = {
        /** Submit a natural-language editing prompt to the Chronos AI copilot. */
        autonomousEdit: (prompt, opts) => this.request("POST", "/api/v1/autonomous_edit", {
            prompt, require_plan_approval: opts?.requirePlanApproval ?? true,
            source_files: [], llm_provider: opts?.llmProvider,
        }),
        /** Trigger a render of the current timeline state. */
        triggerRender: () => this.request("POST", "/api/v1/render"),
    };
    /** Timeline CRDT operations: read current state and insert clips. */
    timeline = {
        /** Fetch the current CRDT timeline snapshot. */
        get: () => this.request("GET", "/api/v1/timeline"),
        /** Insert a new clip onto the timeline. */
        addClip: (clip) => this.request("POST", "/api/v1/timeline", clip),
    };
    /** Project listing. */
    projects = { list: () => this.request("GET", "/api/v1/projects") };
    /** Authenticated user profile and credit balance. */
    user = {
        /** Fetch the current user's profile. */
        profile: () => this.request("GET", "/api/v1/user/profile"),
        /** Fetch the current user's credit balance. */
        credits: () => this.request("GET", "/api/v1/user/credits"),
    };
    /** AI generation: text-to-video, TTS, and media ingestion. */
    ai = {
        /** Generate video from a text prompt. */
        generate: (prompt) => this.request("POST", "/api/v1/ai/generate", { prompt }),
        /** Convert text to speech with optional voice selection. */
        tts: (text, voiceId) => this.request("POST", "/api/v1/ai/tts", { text, voice_id: voiceId }),
        /** Ingest media from an external URL. */
        ingest: (url, source) => this.request("POST", "/api/v1/ai/ingest", { url, source }),
    };
    /** Third-party platform integrations (TikTok, YouTube, Instagram). */
    integrations = {
        /** Connect a social platform via OAuth 2.0. */
        connect: (platform, code, redirectUri) => this.request("POST", "/api/v1/user/integrations/connect", { platform, code, redirect_uri: redirectUri }),
    };
    /** Admin dashboard (requires admin role). */
    admin = { dashboard: () => this.request("GET", "/api/v1/admin/dashboard") };
}
export default LazynextClient;
