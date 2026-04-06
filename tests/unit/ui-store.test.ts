import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '@/stores/ui.store'

describe('UI Store', () => {
  beforeEach(() => {
    // Reset store to initial state
    useUIStore.setState({
      isSidebarOpen: true,
      isCommandPaletteOpen: false,
      isLazyMindOpen: false,
      isNotificationOpen: false,
      isMobile: false,
    })
  })

  it('has correct initial state', () => {
    const state = useUIStore.getState()
    expect(state.isSidebarOpen).toBe(true)
    expect(state.isCommandPaletteOpen).toBe(false)
    expect(state.isLazyMindOpen).toBe(false)
    expect(state.isNotificationOpen).toBe(false)
    expect(state.isMobile).toBe(false)
  })

  it('toggles sidebar', () => {
    useUIStore.getState().toggleSidebar()
    expect(useUIStore.getState().isSidebarOpen).toBe(false)
    useUIStore.getState().toggleSidebar()
    expect(useUIStore.getState().isSidebarOpen).toBe(true)
  })

  it('sets sidebar open state directly', () => {
    useUIStore.getState().setSidebarOpen(false)
    expect(useUIStore.getState().isSidebarOpen).toBe(false)
  })

  it('toggles command palette', () => {
    useUIStore.getState().toggleCommandPalette()
    expect(useUIStore.getState().isCommandPaletteOpen).toBe(true)
  })

  it('toggles LazyMind', () => {
    useUIStore.getState().toggleLazyMind()
    expect(useUIStore.getState().isLazyMindOpen).toBe(true)
  })

  it('toggles notifications', () => {
    useUIStore.getState().toggleNotification()
    expect(useUIStore.getState().isNotificationOpen).toBe(true)
  })

  it('sets mobile mode', () => {
    useUIStore.getState().setMobile(true)
    expect(useUIStore.getState().isMobile).toBe(true)
  })
})
