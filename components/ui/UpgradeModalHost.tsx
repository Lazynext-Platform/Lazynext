'use client'

import { UpgradeModal } from '@/components/ui/UpgradeModal'
import { useUpgradeModal } from '@/stores/upgrade-modal.store'

/**
 * Mounts the upgrade modal once for the whole app. Gated surfaces call
 * `useUpgradeModal.getState().show('<variant>')` to open it.
 */
export function UpgradeModalHost() {
  const open = useUpgradeModal((s) => s.open)
  const variant = useUpgradeModal((s) => s.variant)
  const close = useUpgradeModal((s) => s.close)
  if (!open) return null
  return <UpgradeModal variant={variant} onClose={close} />
}
