/**
 * OpenAPI 3.1 spec builder for Lazynext's public REST surface.
 *
 * Hand-written — not generated. Every endpoint listed here is bearer-aware
 * and currently implemented. As we wire more routes to bearer auth, add a
 * row in `paths` and (if needed) a schema in `components.schemas`.
 *
 * Kept as a pure builder so unit tests can call it without a request.
 */

import packageJson from '../../package.json'

const PACKAGE_VERSION: string = packageJson.version

export interface OpenApiSpec {
  openapi: '3.1.0'
  info: {
    title: string
    version: string
    description: string
    license: { name: string; url: string }
  }
  servers: Array<{ url: string; description: string }>
  security: Array<Record<string, string[]>>
  paths: Record<string, Record<string, OpenApiOperation>>
  components: {
    securitySchemes: Record<string, OpenApiSecurityScheme>
    schemas: Record<string, OpenApiSchema>
  }
}

interface OpenApiOperation {
  summary: string
  description?: string
  tags: string[]
  security?: Array<Record<string, string[]>>
  parameters?: OpenApiParameter[]
  requestBody?: OpenApiRequestBody
  responses: Record<string, OpenApiResponse>
}

interface OpenApiParameter {
  name: string
  in: 'query' | 'path' | 'header'
  required?: boolean
  description?: string
  schema: OpenApiSchema
}

interface OpenApiRequestBody {
  required: boolean
  content: Record<string, { schema: OpenApiSchema }>
}

interface OpenApiResponse {
  description: string
  content?: Record<string, { schema: OpenApiSchema }>
}

interface OpenApiSecurityScheme {
  type: 'http' | 'apiKey'
  scheme?: 'bearer'
  bearerFormat?: string
  in?: 'header'
  name?: string
  description?: string
}

type OpenApiSchema =
  | { type: 'string'; format?: string; enum?: readonly string[]; description?: string }
  | { type: 'integer'; format?: string; description?: string }
  | { type: 'number'; description?: string }
  | { type: 'boolean'; description?: string }
  | { type: 'array'; items: OpenApiSchema; description?: string }
  | {
      type: 'object'
      properties?: Record<string, OpenApiSchema>
      required?: string[]
      description?: string
    }
  | { $ref: string }

export function buildOpenApiSpec(): OpenApiSpec {
  const errorSchema: OpenApiSchema = {
    type: 'object',
    required: ['error'],
    properties: {
      error: { type: 'string', description: 'Stable machine-readable error code' },
      message: { type: 'string', description: 'Human-readable explanation' },
      requiredScope: {
        type: 'string',
        description: 'Set on INSUFFICIENT_SCOPE responses',
      },
    },
  }

  const decisionSchema: OpenApiSchema = {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      workspace_id: { type: 'string', format: 'uuid' },
      title: { type: 'string' },
      description: { type: 'string' },
      status: { type: 'string', enum: ['proposed', 'accepted', 'rejected', 'archived'] },
      quality_score: { type: 'number' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
    },
  }

  const nodeSchema: OpenApiSchema = {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      workspace_id: { type: 'string', format: 'uuid' },
      workflow_id: { type: 'string', format: 'uuid' },
      type: {
        type: 'string',
        enum: ['task', 'doc', 'table', 'thread', 'decision', 'automation', 'pulse'],
      },
      title: { type: 'string' },
      data: { type: 'object' },
      position_x: { type: 'integer' },
      position_y: { type: 'integer' },
      status: {
        type: 'string',
        enum: ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'],
      },
      assigned_to: { type: 'string' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
    },
  }

  const workspaceIdParam: OpenApiParameter = {
    name: 'workspaceId',
    in: 'query',
    required: true,
    description: 'UUID of the workspace. Bearer keys are workspace-scoped — the key must belong to this workspace.',
    schema: { type: 'string', format: 'uuid' },
  }

  const idPathParam: OpenApiParameter = {
    name: 'id',
    in: 'path',
    required: true,
    description: 'Resource UUID',
    schema: { type: 'string', format: 'uuid' },
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'Lazynext API',
      version: PACKAGE_VERSION,
      description:
        'Public REST API for Lazynext. Bearer-token auth, per-key scopes (read | write), workspace-scoped. See https://lazynext.com/docs/api for the prose reference.',
      license: { name: 'Proprietary', url: 'https://lazynext.com/terms' },
    },
    servers: [{ url: 'https://lazynext.com/api/v1', description: 'Production' }],
    security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'lzx_<43 base64url chars>',
          description: 'Authorization: Bearer lzx_…',
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Api-Key',
          description: 'Same key as bearer; alternate header.',
        },
      },
      schemas: {
        Error: errorSchema,
        Decision: decisionSchema,
        Node: nodeSchema,
      },
    },
    paths: {
      '/decisions': {
        get: {
          summary: 'List decisions in a workspace',
          tags: ['Decisions'],
          parameters: [workspaceIdParam],
          responses: {
            '200': {
              description: 'List of decisions',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      decisions: { type: 'array', items: { $ref: '#/components/schemas/Decision' } },
                    },
                  },
                },
              },
            },
            '401': errorResponse('Missing or invalid credentials'),
            '403': errorResponse('Bearer key does not belong to workspace'),
            '429': errorResponse('Rate limit exceeded (api bucket: 100/min)'),
          },
        },
        post: {
          summary: 'Create a decision',
          description: 'Requires `write` scope on the API key.',
          tags: ['Decisions'],
          parameters: [workspaceIdParam],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title'],
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    status: { type: 'string', enum: ['proposed', 'accepted', 'rejected'] },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Created',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Decision' } } },
            },
            '401': errorResponse('Missing or invalid credentials'),
            '403': errorResponse('INSUFFICIENT_SCOPE — key lacks `write`'),
            '429': errorResponse('Rate limit exceeded (mutation bucket: 30/min)'),
          },
        },
      },
      '/decisions/{id}': {
        get: {
          summary: 'Get a decision by id',
          tags: ['Decisions'],
          parameters: [idPathParam, workspaceIdParam],
          responses: {
            '200': {
              description: 'The decision',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Decision' } } },
            },
            '404': errorResponse('Not found'),
          },
        },
        patch: {
          summary: 'Update a decision',
          description: 'Requires `write` scope.',
          tags: ['Decisions'],
          parameters: [idPathParam, workspaceIdParam],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    status: { type: 'string', enum: ['proposed', 'accepted', 'rejected', 'archived'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Updated',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Decision' } } },
            },
            '403': errorResponse('INSUFFICIENT_SCOPE'),
            '429': errorResponse('mutation bucket: 30/min'),
          },
        },
        delete: {
          summary: 'Delete a decision',
          description: 'Requires `write` scope.',
          tags: ['Decisions'],
          parameters: [idPathParam, workspaceIdParam],
          responses: {
            '204': { description: 'Deleted' },
            '403': errorResponse('INSUFFICIENT_SCOPE'),
            '429': errorResponse('mutation bucket: 30/min'),
          },
        },
      },
      '/decisions/export-csv': {
        get: {
          summary: 'Export decisions as CSV',
          tags: ['Decisions', 'Export'],
          parameters: [workspaceIdParam],
          responses: {
            '200': {
              description: 'CSV file',
              content: { 'text/csv': { schema: { type: 'string' } } },
            },
            '429': errorResponse('export bucket: 10/min'),
          },
        },
      },
      '/export': {
        get: {
          summary: 'Export full workspace as JSON',
          tags: ['Export'],
          parameters: [workspaceIdParam],
          responses: {
            '200': { description: 'Workspace JSON snapshot' },
            '429': errorResponse('export bucket: 10/min'),
          },
        },
      },
      '/audit-log': {
        get: {
          summary: 'Read workspace audit log',
          description:
            'Plan-gated to Business+. Cursor-paginated via `before` (the `created_at` of the last row from the previous page). Optional `action` filter and `range` window.',
          tags: ['Audit'],
          parameters: [
            workspaceIdParam,
            {
              name: 'before',
              in: 'query',
              required: false,
              description: 'ISO timestamp — return rows older than this. Use the last row\'s `created_at` from the previous page.',
              schema: { type: 'string', format: 'date-time' },
            },
            {
              name: 'action',
              in: 'query',
              required: false,
              description: 'Filter to a single audit action.',
              schema: {
                type: 'string',
                enum: [
                  'workspace.update',
                  'workspace.delete',
                  'decision.create',
                  'decision.update',
                  'decision.delete',
                  'node.create',
                  'node.update',
                  'node.delete',
                  'member.invite',
                  'member.remove',
                  'member.role_update',
                  'api_key.create',
                  'api_key.rotate',
                  'api_key.revoke',
                  'ai.workflow.generated',
                  'ai.workflow.accepted',
                  'ai.workflow.refined',
                ],
              },
            },
            {
              name: 'range',
              in: 'query',
              required: false,
              description: 'Restrict to entries within the last N days. `all` (default) returns the full window.',
              schema: { type: 'string', enum: ['7', '30', '90', '365', 'all'] },
            },
          ],
          responses: {
            '200': { description: 'Audit log entries' },
            '403': errorResponse('Plan does not include audit-log access'),
            '429': errorResponse('api bucket: 100/min'),
          },
        },
      },
      '/audit-log/export-csv': {
        get: {
          summary: 'Export workspace audit log as CSV',
          description:
            'Plan-gated to Business+. Capped at 5000 rows. Filename embeds the active `range` so SOC-2 evidence packs are self-describing.',
          tags: ['Audit', 'Export'],
          parameters: [
            workspaceIdParam,
            {
              name: 'action',
              in: 'query',
              required: false,
              description: 'Filter to a single audit action (same enum as `/audit-log`).',
              schema: { type: 'string' },
            },
            {
              name: 'range',
              in: 'query',
              required: false,
              description: 'Restrict to the last N days. `all` (default) exports up to the 5000-row cap.',
              schema: { type: 'string', enum: ['7', '30', '90', '365', 'all'] },
            },
          ],
          responses: {
            '200': {
              description: 'CSV file',
              content: { 'text/csv': { schema: { type: 'string' } } },
            },
            '403': errorResponse('Plan does not include audit-log access'),
            '429': errorResponse('export bucket: 10/min'),
          },
        },
      },
      '/nodes': {
        get: {
          summary: 'List nodes in a workflow',
          tags: ['Nodes'],
          parameters: [
            {
              name: 'workflowId',
              in: 'query',
              required: true,
              description: 'UUID of the workflow. The workflow\'s workspace must match the bearer key\'s workspace.',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            '200': {
              description: 'List of nodes',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Node' } },
                    },
                  },
                },
              },
            },
            '401': errorResponse('Missing or invalid credentials'),
            '403': errorResponse('Bearer key does not belong to workspace'),
            '429': errorResponse('api bucket: 100/min'),
          },
        },
        post: {
          summary: 'Create a node',
          description: 'Requires `write` scope.',
          tags: ['Nodes'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['workflowId', 'workspaceId', 'type', 'title', 'positionX', 'positionY'],
                  properties: {
                    workflowId: { type: 'string', format: 'uuid' },
                    workspaceId: { type: 'string', format: 'uuid' },
                    type: {
                      type: 'string',
                      enum: ['task', 'doc', 'table', 'thread', 'decision', 'automation', 'pulse'],
                    },
                    title: { type: 'string' },
                    positionX: { type: 'integer' },
                    positionY: { type: 'integer' },
                    status: {
                      type: 'string',
                      enum: ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'],
                    },
                    assignedTo: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Created',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Node' } } },
            },
            '403': errorResponse('INSUFFICIENT_SCOPE — key lacks `write`'),
            '429': errorResponse('mutation bucket: 30/min'),
          },
        },
      },
      '/nodes/{id}': {
        get: {
          summary: 'Get a node',
          tags: ['Nodes'],
          parameters: [idPathParam],
          responses: {
            '200': {
              description: 'The node',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Node' } } },
            },
            '404': errorResponse('Not found'),
          },
        },
        patch: {
          summary: 'Update a node',
          description: 'Requires `write` scope.',
          tags: ['Nodes'],
          parameters: [idPathParam],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    positionX: { type: 'integer' },
                    positionY: { type: 'integer' },
                    status: {
                      type: 'string',
                      enum: ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'],
                    },
                    assignedTo: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Updated',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Node' } } },
            },
            '403': errorResponse('INSUFFICIENT_SCOPE'),
            '429': errorResponse('mutation bucket: 30/min'),
          },
        },
        delete: {
          summary: 'Delete a node',
          description: 'Requires `write` scope.',
          tags: ['Nodes'],
          parameters: [idPathParam],
          responses: {
            '200': { description: 'Deleted' },
            '403': errorResponse('INSUFFICIENT_SCOPE'),
            '429': errorResponse('mutation bucket: 30/min'),
          },
        },
      },
      '/edges': {
        get: {
          summary: 'List edges in a workflow',
          tags: ['Edges'],
          parameters: [
            {
              name: 'workflowId',
              in: 'query',
              required: true,
              description: 'UUID of the workflow.',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            '200': { description: 'List of edges' },
            '401': errorResponse('Missing or invalid credentials'),
            '403': errorResponse('Bearer key does not belong to workspace'),
            '429': errorResponse('api bucket: 100/min'),
          },
        },
        post: {
          summary: 'Create an edge',
          description: 'Requires `write` scope.',
          tags: ['Edges'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['workflowId', 'sourceId', 'targetId'],
                  properties: {
                    workflowId: { type: 'string', format: 'uuid' },
                    sourceId: { type: 'string', format: 'uuid' },
                    targetId: { type: 'string', format: 'uuid' },
                    condition: { type: 'object' },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Created' },
            '403': errorResponse('INSUFFICIENT_SCOPE'),
            '429': errorResponse('mutation bucket: 30/min'),
          },
        },
        delete: {
          summary: 'Delete an edge',
          description: 'Requires `write` scope.',
          tags: ['Edges'],
          parameters: [
            {
              name: 'id',
              in: 'query',
              required: true,
              description: 'Edge UUID',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            '200': { description: 'Deleted' },
            '403': errorResponse('INSUFFICIENT_SCOPE'),
            '429': errorResponse('mutation bucket: 30/min'),
          },
        },
      },
      '/search': {
        get: {
          summary: 'Search nodes, decisions, and workflows in a workspace',
          tags: ['Search'],
          parameters: [
            workspaceIdParam,
            {
              name: 'q',
              in: 'query',
              required: true,
              description: 'Search term (case-insensitive substring match)',
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': { description: 'Grouped results: nodes, decisions, workflows' },
            '401': errorResponse('Missing or invalid credentials'),
            '403': errorResponse('Bearer key does not belong to workspace'),
            '429': errorResponse('api bucket: 100/min'),
          },
        },
      },
      '/threads/{nodeId}': {
        get: {
          summary: 'List messages in a node\'s thread',
          tags: ['Threads'],
          parameters: [
            {
              name: 'nodeId',
              in: 'path',
              required: true,
              description: 'Node UUID',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            '200': { description: 'Thread + messages, or empty if none' },
            '401': errorResponse('Missing or invalid credentials'),
            '403': errorResponse('Bearer key does not belong to workspace'),
            '429': errorResponse('api bucket: 100/min'),
          },
        },
        post: {
          summary: 'Add a message to a node\'s thread',
          description: 'Requires `write` scope. Creates the thread if absent.',
          tags: ['Threads'],
          parameters: [
            {
              name: 'nodeId',
              in: 'path',
              required: true,
              description: 'Node UUID',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['content'],
                  properties: {
                    content: { type: 'string' },
                    contentType: { type: 'string', enum: ['text', 'markdown'] },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Created' },
            '403': errorResponse('INSUFFICIENT_SCOPE'),
            '429': errorResponse('mutation bucket: 30/min'),
          },
        },
      },
      '/whoami': {
        get: {
          summary: 'Identity introspection',
          description:
            'Returns the resolved identity for the inbound credentials. No scope required — read-only keys can call this to verify themselves.',
          tags: ['Auth'],
          responses: {
            '200': {
              description: 'Resolved identity',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      authType: { type: 'string', enum: ['session', 'apiKey'] },
                      userId: { type: 'string', format: 'uuid' },
                      workspaceId: { type: 'string', format: 'uuid' },
                      keyId: { type: 'string', format: 'uuid' },
                      keyPrefix: { type: 'string' },
                      keyName: { type: 'string' },
                      scopes: { type: 'array', items: { type: 'string', enum: ['read', 'write'] } },
                    },
                  },
                },
              },
            },
            '401': errorResponse('Missing or invalid credentials'),
            '429': errorResponse('api bucket: 100/min'),
          },
        },
      },
    },
  }
}

function errorResponse(description: string): OpenApiResponse {
  return {
    description,
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  }
}
