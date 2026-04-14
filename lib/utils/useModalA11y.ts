'use client'

import { useEffect, useRef } from 'react'

/**
 * Focus-traps inside a modal and locks body scroll while active.
 * Attach the returned ref to the modal's inner container (not the backdrop).
 * Pass `enabled = false` to disable when the modal is not visible.
 */
export function useModalA11y<T extends HTMLElement = HTMLDivElement>(enabled = true) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!enabled) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    const el = ref.current
    if (!el) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const focusable = el!.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    el.addEventListener('keydown', handleKeyDown)
    return () => el.removeEventListener('keydown', handleKeyDown)
  }, [enabled])

  return ref
}
