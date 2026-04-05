'use client'

import { create } from 'zustand'

interface UIState {
  isSidebarOpen: boolean
  isCommandPaletteOpen: boolean
  isLazyMindOpen: boolean
  isNotificationOpen: boolean
  isMobile: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleCommandPalette: () => void
  toggleLazyMind: () => void
  toggleNotification: () => void
  setMobile: (isMobile: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  isCommandPaletteOpen: false,
  isLazyMindOpen: false,
  isNotificationOpen: false,
  isMobile: false,
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleCommandPalette: () => set((s) => ({ isCommandPaletteOpen: !s.isCommandPaletteOpen })),
  toggleLazyMind: () => set((s) => ({ isLazyMindOpen: !s.isLazyMindOpen })),
  toggleNotification: () => set((s) => ({ isNotificationOpen: !s.isNotificationOpen })),
  setMobile: (isMobile) => set({ isMobile }),
}))
