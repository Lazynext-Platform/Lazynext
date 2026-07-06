/**
 * Lazynext API Client SDK
 *
 * TypeScript client for the Lazynext API Gateway (port 8005).
 * Provides typed methods with JWT authentication and rate limit handling.
 */
export interface ClientConfig {
    baseUrl?: string;
    token?: string;
    onTokenExpired?: () => Promise<string>;
}
export declare class LazynextClient {
    private baseUrl;
    private token;
    private onTokenExpired?;
    constructor(config?: ClientConfig);
    setToken(token: string): void;
    private request;
    health: {
        check: () => Promise<{
            status: string;
        }>;
    };
    editor: {
        autonomousEdit: (prompt: string, opts?: {
            requirePlanApproval?: boolean;
            llmProvider?: string;
        }) => Promise<unknown>;
        triggerRender: () => Promise<unknown>;
    };
    timeline: {
        get: () => Promise<any>;
        addClip: (clip: {
            trackId?: string;
            clipType?: string;
            name?: string;
            start?: number;
            end?: number;
        }) => Promise<unknown>;
    };
    projects: {
        list: () => Promise<{
            projects: any[];
        }>;
    };
    user: {
        profile: () => Promise<any>;
        credits: () => Promise<{
            credits: number;
        }>;
    };
    ai: {
        generate: (prompt: string) => Promise<unknown>;
        tts: (text: string, voiceId?: string) => Promise<unknown>;
        ingest: (url: string, source?: string) => Promise<unknown>;
    };
    integrations: {
        connect: (platform: string, code?: string, redirectUri?: string) => Promise<unknown>;
    };
    admin: {
        dashboard: () => Promise<any>;
    };
}
export default LazynextClient;
//# sourceMappingURL=index.d.ts.map