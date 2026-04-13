'use client'

import { create } from 'zustand'
import type { Currency } from '@/lib/i18n/config'

interface UIState {
  isSidebarOpen: boolean
  isCommandPaletteOpen: boolean
  isLazyMindOpen: boolean
  isNotificationOpen: boolean
  isMobile: boolean
  currency: Currency
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleCommandPalette: () => void
  toggleLazyMind: () => void
  toggleNotification: () => void
  setMobile: (isMobile: boolean) => void
  setCurrency: (currency: Currency) => void
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  isCommandPaletteOpen: false,
  isLazyMindOpen: false,
  isNotificationOpen: false,
  isMobile: false,
  currency: (typeof document !== 'undefined'
    ? (document.cookie.match(/NEXT_CURRENCY=(\w+)/)?.[1] as Currency) ?? 'USD'
    : 'USD') as Currency,
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleCommandPalette: () => set((s) => ({ isCommandPaletteOpen: !s.isCommandPaletteOpen })),
  toggleLazyMind: () => set((s) => ({ isLazyMindOpen: !s.isLazyMindOpen })),
  toggleNotification: () => set((s) => ({ isNotificationOpen: !s.isNotificationOpen })),
  setMobile: (isMobile) => set({ isMobile }),
  setCurrency: (currency) => {
    document.cookie = `NEXT_CURRENCY=${currency}; path=/; max-age=${365 * 24 * 60 * 60}; samesite=lax`
    set({ currency })
  },
}))
