/**
 * Re-export shim for the public SDK.
 *
 * Canonical source lives at `packages/sdk/src/client.ts` so it can be
 * published as `@lazynext/sdk`. This file exists to keep internal
 * imports `@/lib/sdk/client` working without churn.
 *
 * Do not add new code here. New SDK code goes in `packages/sdk/src/`.
 */
export * from '../../packages/sdk/src/client'
