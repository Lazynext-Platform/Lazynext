/**
 * Minimal typed client for the Lazynext public REST API.
 *
 * Zero dependencies (uses global `fetch`). Mirrors the bearer-aware
 * surface documented at /docs/api and /api/v1/openapi.json.
 *
 * Usage:
 *
 *   import { LazynextClient } from '@/lib/sdk/client'
 *   const lzx = new LazynextClient({ apiKey: process.env.LZX_KEY!, workspaceId: '...' })
 *   const decisions = await lzx.decisions.list()
 *
 * Errors are thrown as `LazynextApiError` with a stable machine-readable
 * `code` ('UNAUTHORIZED', 'INSUFFICIENT_SCOPE', 'RATE_LIMITED', 'NOT_FOUND',
 * 'BAD_REQUEST', 'SERVER_ERROR', 'UNKNOWN'). Callers branch on the code,
 * not on the prose message.
 *
 * Pure data layer — safe to import from server components, route
 * handlers, and (with credentials) from edge runtimes.
 */

export interface LazynextClientOptions {
  apiKey: string
  workspaceId: string
  baseUrl?: string
  /** Test seam — defaults to global fetch. */
  fetch?: typeof fetch
}

export interface Decision {
  id: string
  workspace_id: string
  title: string
  description: string | null
  status: 'proposed' | 'accepted' | 'rejected' | 'archived'
  quality_score: number | null
  created_at: string
  updated_at: string
}

export interface CreateDecisionInput {
  title: string
  description?: string
  status?: 'proposed' | 'accepted' | 'rejected'
}

export interface UpdateDecisionInput {
  title?: string
  description?: string
  status?: Decision['status']
}

export type LazynextErrorCode =
  | 'UNAUTHORIZED'
  | 'INSUFFICIENT_SCOPE'
  | 'RATE_LIMITED'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'SERVER_ERROR'
  | 'UNKNOWN'

export class LazynextApiError extends Error {
  readonly code: LazynextErrorCode
  readonly status: number
  readonly requiredScope?: string

  constructor(code: LazynextErrorCode, status: number, message: string, requiredScope?: string) {
    super(message)
    this.name = 'LazynextApiError'
    this.code = code
    this.status = status
    this.requiredScope = requiredScope
  }
}

const DEFAULT_BASE_URL = 'https://lazynext.com/api/v1'

export class LazynextClient {
  private readonly apiKey: string
  private readonly workspaceId: string
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(opts: LazynextClientOptions) {
    if (!opts.apiKey) throw new Error('LazynextClient: apiKey is required')
    if (!opts.workspaceId) throw new Error('LazynextClient: workspaceId is required')
    this.apiKey = opts.apiKey
    this.workspaceId = opts.workspaceId
    this.baseUrl = opts.baseUrl ?? DEFAULT_BASE_URL
    this.fetchImpl = opts.fetch ?? globalThis.fetch.bind(globalThis)
  }

  readonly decisions = {
    list: async (): Promise<Decision[]> => {
      const res = await this.request('GET', `/decisions?workspaceId=${this.workspaceId}`)
      const body = (await res.json()) as { decisions: Decision[] }
      return body.decisions
    },
    get: async (id: string): Promise<Decision> => {
      const res = await this.request('GET', `/decisions/${id}?workspaceId=${this.workspaceId}`)
      return (await res.json()) as Decision
    },
    create: async (input: CreateDecisionInput): Promise<Decision> => {
      const res = await this.request(
        'POST',
        `/decisions?workspaceId=${this.workspaceId}`,
        input
      )
      return (await res.json()) as Decision
    },
    update: async (id: string, input: UpdateDecisionInput): Promise<Decision> => {
      const res = await this.request(
        'PATCH',
        `/decisions/${id}?workspaceId=${this.workspaceId}`,
        input
      )
      return (await res.json()) as Decision
    },
    delete: async (id: string): Promise<void> => {
      await this.request('DELETE', `/decisions/${id}?workspaceId=${this.workspaceId}`)
    },
  }

  private async request(method: string, path: string, body?: unknown): Promise<Response> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) throw await toApiError(res)
    return res
  }
}

async function toApiError(res: Response): Promise<LazynextApiError> {
  let payload: { error?: string; message?: string; requiredScope?: string } = {}
  try {
    payload = (await res.json()) as typeof payload
  } catch {
    // Non-JSON error body — fall through with empty payload.
  }
  const code = mapStatusToCode(res.status, payload.error)
  const message = payload.message ?? payload.error ?? `HTTP ${res.status}`
  return new LazynextApiError(code, res.status, message, payload.requiredScope)
}

function mapStatusToCode(status: number, errorTag?: string): LazynextErrorCode {
  if (errorTag === 'INSUFFICIENT_SCOPE') return 'INSUFFICIENT_SCOPE'
  if (status === 401) return 'UNAUTHORIZED'
  if (status === 403) return 'INSUFFICIENT_SCOPE'
  if (status === 404) return 'NOT_FOUND'
  if (status === 429) return 'RATE_LIMITED'
  if (status >= 500) return 'SERVER_ERROR'
  if (status >= 400) return 'BAD_REQUEST'
  return 'UNKNOWN'
}
