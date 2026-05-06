'use client'

import { create } from 'zustand'

type UpgradeVariant =
  | 'node-limit'
  | 'ai-limit'
  | 'member-limit'
  | 'decision-limit'
  | 'workspace-limit'
  | 'health-gate'
  | 'automation-gate'
  | 'sso-gate'
  | 'pdf-export-gate'
  | 'full-upgrade'

interface UpgradeModalState {
  open: boolean
  variant: UpgradeVariant
  show: (variant?: UpgradeVariant) => void
  close: () => void
}

/**
 * Global upgrade-modal store. Any gated UI surface can call
 *   useUpgradeModal.getState().show('health-gate')
 * to surface the modal without prop-drilling.
 *
 * Render `<UpgradeModalHost />` once at the app root and it will react
 * to this store.
 */
export const useUpgradeModal = create<UpgradeModalState>((set) => ({
  open: false,
  variant: 'full-upgrade',
  show: (variant = 'full-upgrade') => set({ open: true, variant }),
  close: () => set({ open: false }),
}))
