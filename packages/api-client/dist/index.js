export class LazynextClient {
    baseUrl;
    token;
    onTokenExpired;
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || "http://localhost:8005";
        this.token = config.token || null;
        this.onTokenExpired = config.onTokenExpired;
    }
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
    health = { check: () => this.request("GET", "/health") };
    editor = {
        autonomousEdit: (prompt, opts) => this.request("POST", "/api/v1/autonomous_edit", {
            prompt, require_plan_approval: opts?.requirePlanApproval ?? true,
            source_files: [], llm_provider: opts?.llmProvider,
        }),
        triggerRender: () => this.request("POST", "/api/v1/render"),
    };
    timeline = {
        get: () => this.request("GET", "/api/v1/timeline"),
        addClip: (clip) => this.request("POST", "/api/v1/timeline", clip),
    };
    projects = { list: () => this.request("GET", "/api/v1/projects") };
    user = {
        profile: () => this.request("GET", "/api/v1/user/profile"),
        credits: () => this.request("GET", "/api/v1/user/credits"),
    };
    ai = {
        generate: (prompt) => this.request("POST", "/api/v1/ai/generate", { prompt }),
        tts: (text, voiceId) => this.request("POST", "/api/v1/ai/tts", { text, voice_id: voiceId }),
        ingest: (url, source) => this.request("POST", "/api/v1/ai/ingest", { url, source }),
    };
    integrations = {
        connect: (platform, code, redirectUri) => this.request("POST", "/api/v1/user/integrations/connect", { platform, code, redirect_uri: redirectUri }),
    };
    admin = { dashboard: () => this.request("GET", "/api/v1/admin/dashboard") };
}
export default LazynextClient;
