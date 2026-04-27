import { describe, it, expect } from 'vitest'
import { buildOpenApiSpec } from '@/lib/utils/openapi'

describe('buildOpenApiSpec', () => {
  const spec = buildOpenApiSpec()

  it('declares OpenAPI 3.1', () => {
    expect(spec.openapi).toBe('3.1.0')
  })

  it('has bearer + api-key security schemes', () => {
    expect(spec.components.securitySchemes.bearerAuth).toMatchObject({
      type: 'http',
      scheme: 'bearer',
    })
    expect(spec.components.securitySchemes.apiKeyAuth).toMatchObject({
      type: 'apiKey',
      in: 'header',
      name: 'X-Api-Key',
    })
  })

  it('lists every bearer-aware endpoint', () => {
    expect(Object.keys(spec.paths).sort()).toEqual([
      '/audit-log',
      '/decisions',
      '/decisions/export-csv',
      '/decisions/{id}',
      '/export',
      '/whoami',
    ])
  })

  it('decisions POST/PATCH/DELETE document INSUFFICIENT_SCOPE on 403', () => {
    expect(spec.paths['/decisions'].post.responses['403'].description).toMatch(/INSUFFICIENT_SCOPE/)
    expect(spec.paths['/decisions/{id}'].patch.responses['403'].description).toMatch(/INSUFFICIENT_SCOPE/)
    expect(spec.paths['/decisions/{id}'].delete.responses['403'].description).toMatch(/INSUFFICIENT_SCOPE/)
  })

  it('export endpoints document the export bucket', () => {
    expect(spec.paths['/decisions/export-csv'].get.responses['429'].description).toMatch(/export bucket/)
    expect(spec.paths['/export'].get.responses['429'].description).toMatch(/export bucket/)
  })

  it('mutation endpoints document the mutation bucket', () => {
    expect(spec.paths['/decisions'].post.responses['429'].description).toMatch(/mutation bucket/)
    expect(spec.paths['/decisions/{id}'].patch.responses['429'].description).toMatch(/mutation bucket/)
    expect(spec.paths['/decisions/{id}'].delete.responses['429'].description).toMatch(/mutation bucket/)
  })

  it('every workspace-scoped operation requires workspaceId', () => {
    // /whoami is identity introspection — no workspace param.
    const exempt = new Set(['/whoami'])
    for (const [path, methods] of Object.entries(spec.paths)) {
      if (exempt.has(path)) continue
      for (const [method, op] of Object.entries(methods)) {
        const hasWorkspace = (op.parameters ?? []).some(
          (p) => p.name === 'workspaceId' && p.in === 'query'
        )
        expect(hasWorkspace, `${method.toUpperCase()} ${path}`).toBe(true)
      }
    }
  })
})
