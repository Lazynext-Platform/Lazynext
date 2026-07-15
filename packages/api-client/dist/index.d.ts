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
export declare class LazynextClient {
    /** API Gateway base URL */
    private baseUrl;
    /** JWT bearer token */
    private token;
    /** Optional callback for automatic token refresh on 401 */
    private onTokenExpired?;
    /**
     * Create a new API client.
     *
     * @param config - Client configuration (all fields optional)
     */
    constructor(config?: ClientConfig);
    /**
     * Update the bearer token for subsequent requests.
     * Call after token refresh or initial login.
     */
    setToken(token: string): void;
    private request;
    /** Gateway health-check endpoint. */
    health: {
        check: () => Promise<{
            status: string;
        }>;
    };
    /** Editor commands: autonomous AI edits and render trigger. */
    editor: {
        /** Submit a natural-language editing prompt to the Chronos AI copilot. */
        autonomousEdit: (prompt: string, opts?: {
            requirePlanApproval?: boolean;
            llmProvider?: string;
        }) => Promise<unknown>;
        /** Trigger a render of the current timeline state. */
        triggerRender: () => Promise<unknown>;
    };
    /** Timeline CRDT operations: read current state and insert clips. */
    timeline: {
        /** Fetch the current CRDT timeline snapshot. */
        get: () => Promise<any>;
        /** Insert a new clip onto the timeline. */
        addClip: (clip: {
            trackId?: string;
            clipType?: string;
            name?: string;
            start?: number;
            end?: number;
        }) => Promise<unknown>;
    };
    /** Project listing. */
    projects: {
        list: () => Promise<{
            projects: any[];
        }>;
    };
    /** Authenticated user profile and credit balance. */
    user: {
        /** Fetch the current user's profile. */
        profile: () => Promise<any>;
        /** Fetch the current user's credit balance. */
        credits: () => Promise<{
            credits: number;
        }>;
    };
    /** AI generation: text-to-video, TTS, and media ingestion. */
    ai: {
        /** Generate video from a text prompt. */
        generate: (prompt: string) => Promise<unknown>;
        /** Convert text to speech with optional voice selection. */
        tts: (text: string, voiceId?: string) => Promise<unknown>;
        /** Ingest media from an external URL. */
        ingest: (url: string, source?: string) => Promise<unknown>;
    };
    /** Third-party platform integrations (TikTok, YouTube, Instagram). */
    integrations: {
        /** Connect a social platform via OAuth 2.0. */
        connect: (platform: string, code?: string, redirectUri?: string) => Promise<unknown>;
    };
    /** Admin dashboard (requires admin role). */
    admin: {
        dashboard: () => Promise<any>;
    };
}
export default LazynextClient;
//# sourceMappingURL=index.d.ts.map