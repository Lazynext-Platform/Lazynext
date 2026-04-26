'use client'

import { GuidedTour, type TourStep } from '@/components/ui/GuidedTour'
import { useUIStore } from '@/stores/ui.store'

const workspaceTourSteps: TourStep[] = [
  {
    target: null,
    titleKey: 'steps.welcome.title',
    descriptionKey: 'steps.welcome.description',
  },
  {
    target: '[aria-label="Main navigation"]',
    titleKey: 'steps.sidebar.title',
    descriptionKey: 'steps.sidebar.description',
    placement: 'right',
  },
  // Removed the "Switch workspace" step in v1.3.3.6: round 15 converted
  // `WorkspaceSelector` to a display-only div (no `aria-label="Switch
  // workspace"` element exists anymore), and the step description
  // ("Switch between workspaces or create new ones") promised a
  // multi-workspace switcher dropdown that doesn't ship. Better to drop
  // the step than spotlight nothing while telling the user a lie.
  {
    target: 'a[href*="/canvas/"]',
    titleKey: 'steps.canvas.title',
    descriptionKey: 'steps.canvas.description',
    placement: 'right',
  },
  {
    target: 'a[href*="/decisions"]',
    titleKey: 'steps.decisions.title',
    descriptionKey: 'steps.decisions.description',
    placement: 'right',
  },
  {
    target: 'a[href*="/tasks"]',
    titleKey: 'steps.tasks.title',
    descriptionKey: 'steps.tasks.description',
    placement: 'right',
  },
  {
    target: 'a[href*="/pulse"]',
    titleKey: 'steps.pulse.title',
    descriptionKey: 'steps.pulse.description',
    placement: 'right',
  },
  {
    target: 'button[aria-label="Open LazyMind AI assistant"]',
    titleKey: 'steps.lazymind.title',
    descriptionKey: 'steps.lazymind.description',
    placement: 'left',
  },
  {
    target: 'button[aria-label="Open command palette"]',
    titleKey: 'steps.commandPalette.title',
    descriptionKey: 'steps.commandPalette.description',
    placement: 'bottom',
  },
  {
    target: null,
    titleKey: 'steps.finish.title',
    descriptionKey: 'steps.finish.description',
  },
]

export function WorkspaceTour() {
  const isTourActive = useUIStore((s) => s.isTourActive)
  const completeTour = useUIStore((s) => s.completeTour)
  const setTourActive = useUIStore((s) => s.setTourActive)

  if (!isTourActive) return null

  return (
    <GuidedTour
      steps={workspaceTourSteps}
      onComplete={completeTour}
      onSkip={() => setTourActive(false)}
    />
  )
}
