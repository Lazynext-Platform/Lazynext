export { LazynextClient, LazynextApiError } from './client'
export type {
  LazynextClientOptions,
  Decision,
  CreateDecisionInput,
  UpdateDecisionInput,
  WhoamiResponse,
  LazynextErrorCode,
} from './client'

// Auto-generated OpenAPI types. Re-exported as a namespace so the
// curated hand-typed surface above remains the default import path,
// while consumers who need wire-shape coverage of every endpoint
// (response envelopes, error codes, etc.) can opt-in:
//   import type { paths, components } from '@lazynext/sdk'
export type { paths, components, operations } from './types'
