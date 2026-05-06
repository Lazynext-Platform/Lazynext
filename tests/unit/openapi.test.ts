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
      '/audit-log/export-csv',
      '/decisions',
      '/decisions/export-csv',
      '/decisions/{id}',
      '/edges',
      '/export',
      '/nodes',
      '/nodes/{id}',
      '/search',
      '/threads/{nodeId}',
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
    expect(spec.paths['/audit-log/export-csv'].get.responses['429'].description).toMatch(/export bucket/)
  })

  it('audit-log endpoints expose action + range filters', () => {
    const auditList = spec.paths['/audit-log'].get
    const auditCsv = spec.paths['/audit-log/export-csv'].get
    const listParamNames = (auditList.parameters ?? []).map((p) => p.name)
    const csvParamNames = (auditCsv.parameters ?? []).map((p) => p.name)
    expect(listParamNames).toEqual(expect.arrayContaining(['workspaceId', 'action', 'range', 'before']))
    expect(csvParamNames).toEqual(expect.arrayContaining(['workspaceId', 'action', 'range']))
    const rangeParam = (auditList.parameters ?? []).find((p) => p.name === 'range')!
    expect((rangeParam.schema as { enum?: string[] }).enum).toEqual(['7', '30', '90', '365', 'all'])
  })

  it('mutation endpoints document the mutation bucket', () => {
    expect(spec.paths['/decisions'].post.responses['429'].description).toMatch(/mutation bucket/)
    expect(spec.paths['/decisions/{id}'].patch.responses['429'].description).toMatch(/mutation bucket/)
    expect(spec.paths['/decisions/{id}'].delete.responses['429'].description).toMatch(/mutation bucket/)
    expect(spec.paths['/nodes'].post.responses['429'].description).toMatch(/mutation bucket/)
    expect(spec.paths['/nodes/{id}'].patch.responses['429'].description).toMatch(/mutation bucket/)
    expect(spec.paths['/nodes/{id}'].delete.responses['429'].description).toMatch(/mutation bucket/)
  })

  it('node mutations document INSUFFICIENT_SCOPE on 403', () => {
    expect(spec.paths['/nodes'].post.responses['403'].description).toMatch(/INSUFFICIENT_SCOPE/)
    expect(spec.paths['/nodes/{id}'].patch.responses['403'].description).toMatch(/INSUFFICIENT_SCOPE/)
    expect(spec.paths['/nodes/{id}'].delete.responses['403'].description).toMatch(/INSUFFICIENT_SCOPE/)
  })

  it('every workspace-scoped operation requires workspaceId', () => {
    // /whoami is identity introspection — no workspace param.
    // /nodes scopes via workflowId (GET) or body (POST); /nodes/{id}
    // resolves the workspace via the row.
    const exempt = new Set(['/whoami', '/nodes', '/nodes/{id}', '/edges', '/threads/{nodeId}'])
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
