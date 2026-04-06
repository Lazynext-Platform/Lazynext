import { describe, it, expect, beforeEach } from 'vitest'
import { useWorkspaceStore } from '@/stores/workspace.store'

describe('Workspace Store', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ workspace: null })
  })

  it('starts with null workspace', () => {
    expect(useWorkspaceStore.getState().workspace).toBeNull()
  })

  it('sets workspace', () => {
    useWorkspaceStore.getState().setWorkspace({
      id: '1',
      name: 'Test Workspace',
      slug: 'test-workspace',
      plan: 'pro',
      logo: null,
    })

    const ws = useWorkspaceStore.getState().workspace
    expect(ws).not.toBeNull()
    expect(ws!.name).toBe('Test Workspace')
    expect(ws!.plan).toBe('pro')
  })

  it('clears workspace', () => {
    useWorkspaceStore.getState().setWorkspace({
      id: '1',
      name: 'Test',
      slug: 'test',
      plan: 'free',
      logo: null,
    })
    useWorkspaceStore.getState().clear()
    expect(useWorkspaceStore.getState().workspace).toBeNull()
  })
})
