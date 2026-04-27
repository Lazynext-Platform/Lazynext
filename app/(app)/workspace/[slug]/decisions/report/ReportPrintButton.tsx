'use client'

import { ReactNode } from 'react'

// Tiny client wrapper around `window.print()`. The report page itself is
// a server component; this is the only piece that needs to live in the
// client bundle.
export function ReportPrintButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
    >
      {children}
    </button>
  )
}
