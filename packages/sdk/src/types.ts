/**
 * AUTO-GENERATED. Do not edit by hand.
 *
 * Regenerate with: `npm run sdk:generate-types`
 *
 * Source: lib/utils/openapi.ts → buildOpenApiSpec()
 * Generator: openapi-typescript
 */

/* eslint-disable */
export interface paths {
    "/decisions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List decisions in a workspace */
        get: {
            parameters: {
                query: {
                    /** @description UUID of the workspace. Bearer keys are workspace-scoped — the key must belong to this workspace. */
                    workspaceId: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description List of decisions */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            decisions?: components["schemas"]["Decision"][];
                        };
                    };
                };
                /** @description Missing or invalid credentials */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Bearer key does not belong to workspace */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Rate limit exceeded (api bucket: 100/min) */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Create a decision
         * @description Requires `write` scope on the API key.
         */
        post: {
            parameters: {
                query: {
                    /** @description UUID of the workspace. Bearer keys are workspace-scoped — the key must belong to this workspace. */
                    workspaceId: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        title: string;
                        description?: string;
                        /** @enum {string} */
                        status?: "proposed" | "accepted" | "rejected";
                    };
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Decision"];
                    };
                };
                /** @description Missing or invalid credentials */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description INSUFFICIENT_SCOPE — key lacks `write` */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Rate limit exceeded (mutation bucket: 30/min) */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/decisions/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a decision by id */
        get: {
            parameters: {
                query: {
                    /** @description UUID of the workspace. Bearer keys are workspace-scoped — the key must belong to this workspace. */
                    workspaceId: string;
                };
                header?: never;
                path: {
                    /** @description Resource UUID */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description The decision */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Decision"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        /**
         * Delete a decision
         * @description Requires `write` scope.
         */
        delete: {
            parameters: {
                query: {
                    /** @description UUID of the workspace. Bearer keys are workspace-scoped — the key must belong to this workspace. */
                    workspaceId: string;
                };
                header?: never;
                path: {
                    /** @description Resource UUID */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Deleted */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description INSUFFICIENT_SCOPE */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description mutation bucket: 30/min */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Update a decision
         * @description Requires `write` scope.
         */
        patch: {
            parameters: {
                query: {
                    /** @description UUID of the workspace. Bearer keys are workspace-scoped — the key must belong to this workspace. */
                    workspaceId: string;
                };
                header?: never;
                path: {
                    /** @description Resource UUID */
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        title?: string;
                        description?: string;
                        /** @enum {string} */
                        status?: "proposed" | "accepted" | "rejected" | "archived";
                    };
                };
            };
            responses: {
                /** @description Updated */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Decision"];
                    };
                };
                /** @description INSUFFICIENT_SCOPE */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description mutation bucket: 30/min */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/decisions/export-csv": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Export decisions as CSV */
        get: {
            parameters: {
                query: {
                    /** @description UUID of the workspace. Bearer keys are workspace-scoped — the key must belong to this workspace. */
                    workspaceId: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description CSV file */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "text/csv": string;
                    };
                };
                /** @description export bucket: 10/min */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/export": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Export full workspace as JSON */
        get: {
            parameters: {
                query: {
                    /** @description UUID of the workspace. Bearer keys are workspace-scoped — the key must belong to this workspace. */
                    workspaceId: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Workspace JSON snapshot */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description export bucket: 10/min */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/audit-log": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Read workspace audit log */
        get: {
            parameters: {
                query: {
                    /** @description UUID of the workspace. Bearer keys are workspace-scoped — the key must belong to this workspace. */
                    workspaceId: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Audit log entries */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description api bucket: 100/min */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/nodes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List nodes in a workflow */
        get: {
            parameters: {
                query: {
                    /** @description UUID of the workflow. The workflow's workspace must match the bearer key's workspace. */
                    workflowId: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description List of nodes */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: components["schemas"]["Node"][];
                        };
                    };
                };
                /** @description Missing or invalid credentials */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Bearer key does not belong to workspace */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description api bucket: 100/min */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Create a node
         * @description Requires `write` scope.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** Format: uuid */
                        workflowId: string;
                        /** Format: uuid */
                        workspaceId: string;
                        /** @enum {string} */
                        type: "task" | "doc" | "table" | "thread" | "decision" | "automation" | "pulse";
                        title: string;
                        positionX: number;
                        positionY: number;
                        /** @enum {string} */
                        status?: "backlog" | "todo" | "in_progress" | "in_review" | "done" | "cancelled";
                        assignedTo?: string;
                    };
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Node"];
                    };
                };
                /** @description INSUFFICIENT_SCOPE — key lacks `write` */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description mutation bucket: 30/min */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/nodes/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a node */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Resource UUID */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description The node */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Node"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        /**
         * Delete a node
         * @description Requires `write` scope.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Resource UUID */
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Deleted */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description INSUFFICIENT_SCOPE */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description mutation bucket: 30/min */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Update a node
         * @description Requires `write` scope.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Resource UUID */
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        title?: string;
                        positionX?: number;
                        positionY?: number;
                        /** @enum {string} */
                        status?: "backlog" | "todo" | "in_progress" | "in_review" | "done" | "cancelled";
                        assignedTo?: string;
                    };
                };
            };
            responses: {
                /** @description Updated */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Node"];
                    };
                };
                /** @description INSUFFICIENT_SCOPE */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description mutation bucket: 30/min */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/edges": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List edges in a workflow */
        get: {
            parameters: {
                query: {
                    /** @description UUID of the workflow. */
                    workflowId: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description List of edges */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing or invalid credentials */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Bearer key does not belong to workspace */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description api bucket: 100/min */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Create an edge
         * @description Requires `write` scope.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** Format: uuid */
                        workflowId: string;
                        /** Format: uuid */
                        sourceId: string;
                        /** Format: uuid */
                        targetId: string;
                        condition?: Record<string, never>;
                    };
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description INSUFFICIENT_SCOPE */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description mutation bucket: 30/min */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        /**
         * Delete an edge
         * @description Requires `write` scope.
         */
        delete: {
            parameters: {
                query: {
                    /** @description Edge UUID */
                    id: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Deleted */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description INSUFFICIENT_SCOPE */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description mutation bucket: 30/min */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/search": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Search nodes, decisions, and workflows in a workspace */
        get: {
            parameters: {
                query: {
                    /** @description UUID of the workspace. Bearer keys are workspace-scoped — the key must belong to this workspace. */
                    workspaceId: string;
                    /** @description Search term (case-insensitive substring match) */
                    q: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Grouped results: nodes, decisions, workflows */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing or invalid credentials */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Bearer key does not belong to workspace */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description api bucket: 100/min */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/threads/{nodeId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List messages in a node's thread */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Node UUID */
                    nodeId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Thread + messages, or empty if none */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing or invalid credentials */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Bearer key does not belong to workspace */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description api bucket: 100/min */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Add a message to a node's thread
         * @description Requires `write` scope. Creates the thread if absent.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Node UUID */
                    nodeId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        content: string;
                        /** @enum {string} */
                        contentType?: "text" | "markdown";
                    };
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description INSUFFICIENT_SCOPE */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description mutation bucket: 30/min */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/whoami": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Identity introspection
         * @description Returns the resolved identity for the inbound credentials. No scope required — read-only keys can call this to verify themselves.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Resolved identity */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @enum {string} */
                            authType?: "session" | "apiKey";
                            /** Format: uuid */
                            userId?: string;
                            /** Format: uuid */
                            workspaceId?: string;
                            /** Format: uuid */
                            keyId?: string;
                            keyPrefix?: string;
                            keyName?: string;
                            scopes?: ("read" | "write")[];
                        };
                    };
                };
                /** @description Missing or invalid credentials */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description api bucket: 100/min */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        Error: {
            /** @description Stable machine-readable error code */
            error: string;
            /** @description Human-readable explanation */
            message?: string;
            /** @description Set on INSUFFICIENT_SCOPE responses */
            requiredScope?: string;
        };
        Decision: {
            /** Format: uuid */
            id?: string;
            /** Format: uuid */
            workspace_id?: string;
            title?: string;
            description?: string;
            /** @enum {string} */
            status?: "proposed" | "accepted" | "rejected" | "archived";
            quality_score?: number;
            /** Format: date-time */
            created_at?: string;
            /** Format: date-time */
            updated_at?: string;
        };
        Node: {
            /** Format: uuid */
            id?: string;
            /** Format: uuid */
            workspace_id?: string;
            /** Format: uuid */
            workflow_id?: string;
            /** @enum {string} */
            type?: "task" | "doc" | "table" | "thread" | "decision" | "automation" | "pulse";
            title?: string;
            data?: Record<string, never>;
            position_x?: number;
            position_y?: number;
            /** @enum {string} */
            status?: "backlog" | "todo" | "in_progress" | "in_review" | "done" | "cancelled";
            assigned_to?: string;
            /** Format: date-time */
            created_at?: string;
            /** Format: date-time */
            updated_at?: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
