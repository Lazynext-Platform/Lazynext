/**
 * TypeScript type definitions for the Lazynext API Gateway responses.
 *
 * These types correspond to the OpenAPI 3.1 specification defined in
 * {@link file://docs/openapi.yaml}. Every interface here represents the
 * JSON shape returned by a documented API endpoint.
 *
 * All authenticated endpoints require a Bearer JWT (HS256) obtained via
 * Better Auth — see the securitySchemes section of the OpenAPI spec.
 *
 * @module api-client/types
 */
/**
 * Response from `GET /health`.
 *
 * Unauthenticated liveness probe used by orchestrators (K8s, Docker Compose)
 * and load balancers to determine service readiness.
 *
 * @see OpenAPI tag: System
 */
export interface HealthResponse {
    /** Health status indicator. Always `"ok"` when the service is reachable. */
    status: string;
    /** Canonical service name (`"api-gateway"`). */
    service: string;
}
/**
 * A single clip on a timeline track.
 *
 * Returned as a nested element inside {@link TimelineTrack}.
 */
export interface TimelineClip {
    /** Unique clip identifier (UUID v4). */
    id: string;
    /** Clip media type: `"video"`, `"audio"`, `"image"`, `"text"`, or `"effect"`. */
    clip_type: string;
    /** Human-readable clip label. */
    name: string;
    /** Start time in seconds from timeline origin. */
    start: number;
    /** End time in seconds from timeline origin. */
    end: number;
    /**
     * Optional keyframe animation map keyed by property path.
     * Each value is an opaque animation descriptor consumed by the compositor.
     */
    animations?: Record<string, unknown>;
}
/**
 * A single track (horizontal lane) on the timeline.
 *
 * Tracks are stacked vertically within a {@link TimelineState}.
 */
export interface TimelineTrack {
    /** Unique track identifier (UUID v4). */
    id: string;
    /**
     * Track kind determining compositing order and accepted clip types.
     * Common values: `"video"`, `"audio"`, `"text"`, `"effect"`.
     */
    kind: string;
    /** Ordered array of clips on this track. */
    clips: TimelineClip[];
}
/**
 * Full CRDT timeline state returned by `GET /api/v1/timeline`.
 *
 * This is the canonical representation of the editor timeline. Every
 * mutation (add / move / delete clip) converges through the CRDT mesh
 * and results in an updated snapshot returned by this endpoint.
 *
 * @see OpenAPI tag: Timeline
 */
export interface TimelineState {
    /** Unique timeline identifier (UUID v4). Corresponds to the active project. */
    id: string;
    /** User-facing project / timeline name. */
    name: string;
    /** Timeline frame rate in frames per second (e.g. `24`, `30`, `60`). */
    framerate: number;
    /** Canvas width in pixels. */
    width: number;
    /** Canvas height in pixels. */
    height: number;
    /**
     * Background color as an RGBA tuple.
     * Each channel is a floating-point value in the range `[0, 1]`.
     */
    bg_color: [number, number, number, number];
    /** Array of tracks composing the timeline. */
    tracks: TimelineTrack[];
}
/**
 * Request body for `POST /api/v1/timeline` — add a clip to the timeline.
 *
 * Either `track_id` (existing track) or `track_kind` (auto-create track)
 * must be supplied.
 */
export interface AddClipRequest {
    /** ID of an existing track to place the clip on. */
    track_id?: string;
    /** Track kind to auto-create a new track if `track_id` is not specified. */
    track_kind?: string;
    /** Optional UUID for the new clip (server-assigned when omitted). */
    clip_id?: string;
    /** Clip type (`"video"`, `"audio"`, `"image"`, `"text"`, `"effect"`). */
    clip_type?: string;
    /** Human-readable clip name. */
    name?: string;
    /** Start time in seconds. */
    start?: number;
    /** End time in seconds. */
    end?: number;
}
/**
 * Metadata for a single project returned by `GET /api/v1/projects`.
 *
 * @see OpenAPI tag: Projects
 */
export interface ProjectInfo {
    /** Unique project identifier (UUID v4). */
    id: string;
    /** User-facing project name. */
    name: string;
    /** Optional rich-text or plain-text project description. */
    description?: string;
    /** URL to a cached thumbnail image for the project card. */
    thumbnail_url?: string;
    /** Default canvas width in pixels. */
    width: number;
    /** Default canvas height in pixels. */
    height: number;
    /** Default timeline frame rate in frames per second. */
    framerate: number;
    /** Whether the project has been moved to the archive. */
    is_archived: boolean;
    /** ISO-8601 timestamp of project creation. */
    created_at: string;
    /** ISO-8601 timestamp of the most recent project mutation. */
    updated_at: string;
}
/**
 * Wrapper for the project list endpoint response.
 */
export interface ProjectListResponse {
    /** Always `true` when the request succeeds. */
    success: boolean;
    /** Array of projects belonging to the authenticated user. */
    projects: ProjectInfo[];
}
/**
 * Nested profile payload inside {@link UserProfile}.
 */
export interface ProfileDetail {
    /** Unique user identifier (UUID v4). */
    id: string;
    /** Display name. */
    name: string;
    /** Registered email address. */
    email: string;
    /** RBAC role: `"user"`, `"admin"`, or `"super_admin"`. */
    role: string;
    /** Subscription tier: `"free"`, `"pro"`, or `"enterprise"`. */
    tier: string;
    /** Pre-computed initials derived from the display name. */
    initials: string;
    /** Remaining AI generation credits. */
    ai_credits: number;
}
/**
 * Response from `GET /api/v1/user/profile`.
 *
 * Returns the authenticated user's identity, role, tier, and remaining
 * AI credits in a single call.
 *
 * @see OpenAPI tag: User
 */
export interface UserProfile {
    /** Always `true` when the request succeeds. */
    success: boolean;
    /** User profile detail. */
    profile: ProfileDetail;
}
/**
 * Response from `GET /api/v1/user/credits`.
 *
 * Lightweight endpoint for polling AI credit balance without fetching
 * the full profile.
 *
 * @see OpenAPI tag: User
 */
export interface UserCredits {
    /** Always `true` when the request succeeds. */
    success: boolean;
    /** Current AI credit balance (integer). */
    credits: number;
}
/**
 * Request body for `POST /api/v1/autonomous_edit`.
 *
 * Describes an AI-powered editing intent in natural language.
 */
export interface AutonomousEditRequest {
    /** Natural-language description of the desired edit. */
    prompt: string;
    /** When `true` (default), the agent proposes a plan before applying changes. */
    require_plan_approval?: boolean;
    /** Optional list of source file URLs to scope the edit. */
    source_files?: string[];
    /** LLM provider to use for intent parsing. */
    llm_provider?: "gemini";
}
/**
 * Response from `POST /api/v1/ai/generate`.
 *
 * Confirms that an AI video generation job has been queued. The actual
 * generation runs asynchronously on the generative-studio service;
 * progress can be tracked via server-sent events or polling.
 *
 * @see OpenAPI tag: AI
 */
export interface AiGenerateResponse {
    /** Always `true` when the job is accepted. */
    success: boolean;
    /** Human-readable status message (e.g. `"Generation queued"`). */
    message: string;
}
/**
 * Response from `POST /api/v1/ai/tts`.
 *
 * Confirms that text-to-speech synthesis has completed and the
 * resulting audio clip has been placed on the active timeline.
 *
 * @see OpenAPI tag: AI
 */
export interface AiTtsResponse {
    /** Always `true` when TTS synthesis succeeded. */
    success: boolean;
    /** Human-readable status message (e.g. `"TTS added to timeline"`). */
    message: string;
}
/**
 * Response from `POST /api/v1/ai/ingest`.
 *
 * Confirms that a media ingestion job has been queued. The media at
 * the supplied URL will be fetched, transcoded if necessary, and
 * placed on the timeline.
 *
 * @see OpenAPI tag: AI
 */
export interface AiIngestResponse {
    /** Always `true` when the ingestion job is accepted. */
    success: boolean;
    /** Human-readable status message (e.g. `"Ingestion queued"`). */
    message: string;
    /** The URL that was submitted for ingestion (echoed back). */
    queued_url?: string;
    /** Opaque ingestion result metadata, if available immediately. */
    ingest_result?: Record<string, unknown>;
}
/**
 * Response from `POST /api/v1/render` — trigger a render job.
 */
export interface RenderTriggerResponse {
    /** `true` if the render job was successfully triggered. */
    triggered: boolean;
}
/**
 * Request body for `POST /api/v1/user/integrations/connect`.
 *
 * Initiates OAuth authorization-code flow for a social-media platform.
 */
export interface IntegrationConnectRequest {
    /** Social-media platform to connect. */
    platform: "youtube" | "tiktok" | "instagram" | "vimeo";
    /** OAuth authorization code (step 2 of the code flow). */
    code?: string;
    /** OAuth redirect URI registered with the platform's developer console. */
    redirect_uri?: string;
}
/**
 * Response from `POST /api/v1/user/integrations/connect`.
 *
 * When called without a `code`, returns an `auth_url` the user must
 * visit to authorize the application. When called with a valid `code`,
 * returns an `access_token` confirming the integration is live.
 *
 * @see OpenAPI tag: Integrations
 */
export interface IntegrationConnectResponse {
    /** Always `true` when the request is processed successfully. */
    success: boolean;
    /** Human-readable status message. */
    message: string;
    /** Echoed platform identifier. */
    platform?: string;
    /**
     * OAuth authorization URL the user must visit to grant permissions.
     * Only present when no authorization code is supplied in the request.
     */
    auth_url?: string;
    /** Opaque state parameter for CSRF protection during the OAuth flow. */
    state?: string;
    /**
     * Short-lived access token for the connected platform.
     * Only present after a successful code exchange.
     */
    access_token?: string;
    /** Token lifetime in seconds, if an `access_token` is returned. */
    expires_in?: number;
    /** Additional context about the integration state. */
    note?: string;
}
/**
 * Key metrics payload inside {@link AdminDashboard}.
 */
export interface AdminMetrics {
    /** Total number of registered users across all tiers. */
    totalUsers: number;
    /** Count of currently active paid subscriptions. */
    activeSubscriptions: number;
    /**
     * Monthly recurring revenue in USD cents.
     * Divide by 100 to obtain a dollar amount.
     */
    monthlyRecurringRevenue: number;
}
/**
 * Response from `GET /api/v1/admin/dashboard`.
 *
 * Requires the `admin` or `super_admin` role. Returns high-level
 * platform metrics for the admin overview page.
 *
 * @see OpenAPI tag: Admin
 */
export interface AdminDashboard {
    /** Always `true` when the requesting user holds an admin role. */
    success: boolean;
    /** Aggregated platform metrics. */
    metrics: AdminMetrics;
}
/**
 * A render job entity returned by render-related endpoints.
 *
 * Render jobs are created via `POST /api/v1/render` and progress can
 * be streamed via SSE from the render-service (port 8003).
 *
 * @see OpenAPI tag: Render
 */
export interface RenderJob {
    /** Unique render job identifier (UUID v4). */
    id: string;
    /** Project identifier this render job belongs to. */
    projectId: string;
    /**
     * Current job status.
     * - `"queued"` — Waiting for a render worker.
     * - `"rendering"` — Actively encoding frames.
     * - `"completed"` — Output file is ready.
     * - `"failed"` — The job encountered an unrecoverable error.
     */
    status: "queued" | "rendering" | "completed" | "failed";
    /** Render progress as an integer percentage (0–100). */
    progress: number;
    /** Output container format (e.g. `"mp4"`, `"mov"`, `"prores"`, `"dcp"`). */
    format: string;
    /** ISO-8601 timestamp of job creation. */
    createdAt: string;
    /** Snapshot of the timeline state at the time the render was triggered. */
    timelineData?: TimelineState;
}
/**
 * Response from `POST /api/v1/render` confirming a job was created.
 */
export interface RenderJobResponse {
    /** Always `true` when the job was accepted. */
    success: boolean;
    /** The newly created render job's unique identifier. */
    jobId: string;
}
/**
 * Response from a render job status endpoint (SSE or polling).
 */
export interface RenderJobStatusResponse {
    /** Always `true` when the status was retrieved. */
    success: boolean;
    /** The full render job entity with current progress. */
    job: RenderJob;
    /** Shorthand for the job's current status string. */
    state: string;
}
/**
 * Result of publishing a render to a social-media platform.
 *
 * Returned as part of the multi-platform publish flow. Each platform
 * produces one {@link PublishResult} entry.
 */
export interface PublishResult {
    /** Target platform identifier (`"youtube"`, `"tiktok"`, etc.). */
    platform: string;
    /** Whether the publish operation completed without errors. */
    success: boolean;
    /** Public URL of the published post, when available. */
    postUrl?: string;
    /** Platform-assigned post identifier, when available. */
    postId?: string;
    /** Human-readable error description if the publish failed. */
    error?: string;
}
/**
 * Request body for the social-publish endpoint.
 */
export interface PublishRequest {
    /** URL of the rendered video asset to publish. */
    video_url: string;
    /** Target platform (`"youtube"`, `"tiktok"`, `"instagram"`, `"vimeo"`). */
    platform: string;
    /** Optional post description / caption. */
    description?: string;
    /** Optional post title (used by YouTube, Vimeo). */
    title?: string;
    /** Optional list of content tags. */
    tags?: string[];
    /** Optional list of hashtags appended to the description. */
    hashtags?: string[];
}
/**
 * Error returned when the request rate exceeds the configured limit.
 *
 * HTTP status: `429 Too Many Requests`. The client should wait
 * `retry_after_seconds` before retrying.
 *
 * @see OpenAPI components/schemas/RateLimitError
 */
export interface RateLimitError {
    /** Discriminant value, always `"rate_limit_exceeded"`. */
    error: "rate_limit_exceeded";
    /** Human-readable description of the rate limit that was hit. */
    message: string;
    /** Number of seconds the client must wait before the next request. */
    retry_after_seconds: number;
}
/**
 * Error returned when the CSRF token is missing, expired, or mismatched.
 *
 * HTTP status: `403 Forbidden`.
 */
export interface CsrfError {
    /** Discriminant value, always `"csrf_validation_failed"`. */
    error: "csrf_validation_failed";
    /** Human-readable description of the validation failure. */
    message: string;
}
/**
 * Generic API error envelope.
 *
 * Returned for unhandled server errors (5xx) and known error conditions
 * that do not have a dedicated error shape.
 *
 * @see OpenAPI components/schemas/Error
 */
export interface ApiError {
    /** Always `false` for error responses. */
    success: false;
    /** Machine-readable error code or message. */
    error: string;
}
//# sourceMappingURL=types.d.ts.map