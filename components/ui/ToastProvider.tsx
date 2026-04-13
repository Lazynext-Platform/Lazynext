'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, GitBranch, Undo2, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'decision' | 'undo'

interface Toast {
  id: string
  type: ToastType
  title: string
  description: string
  action?: { label: string; onClick: () => void }
  duration?: number
}

interface ToastContextType {
  toast: (t: Omit<Toast, 'id'>) => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

export const useToast = () => useContext(ToastContext)

const typeConfig: Record<ToastType, { icon: typeof CheckCircle; iconBg: string; borderColor: string; progressColor: string }> = {
  success: { icon: CheckCircle, iconBg: 'bg-emerald-500', borderColor: 'border-slate-700', progressColor: 'bg-emerald-500' },
  error: { icon: XCircle, iconBg: 'bg-red-500', borderColor: 'border-red-500/30', progressColor: 'bg-red-500' },
  warning: { icon: AlertTriangle, iconBg: 'bg-amber-500', borderColor: 'border-amber-500/20', progressColor: 'bg-amber-500' },
  info: { icon: Info, iconBg: 'bg-blue-500', borderColor: 'border-slate-700', progressColor: 'bg-blue-500' },
  decision: { icon: GitBranch, iconBg: 'bg-orange-500', borderColor: 'border-slate-700', progressColor: 'bg-orange-500' },
  undo: { icon: Undo2, iconBg: 'bg-slate-600', borderColor: 'border-slate-700', progressColor: 'bg-slate-500' },
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const config = typeConfig[toast.type]
  const duration = toast.duration || (toast.type === 'undo' ? 8000 : 5000)

  useEffect(() => {
    if (toast.type === 'error') return // Error toasts don't auto-dismiss
    const timer = setTimeout(() => onDismiss(toast.id), duration)
    return () => clearTimeout(timer)
  }, [toast.id, toast.type, duration, onDismiss])

  return (
    <div className={cn(
      'relative w-96 overflow-hidden rounded-xl border bg-slate-900 shadow-2xl animate-slide-in-right',
      config.borderColor
    )}>
      <div className="flex items-start gap-3 p-4">
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', config.iconBg)}>
          <config.icon className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-200">{toast.title}</p>
          <p className="mt-0.5 text-xs text-slate-400">{toast.description}</p>
          {toast.action && (
            <button
              onClick={() => { toast.action?.onClick(); onDismiss(toast.id); }}
              className="mt-2 text-xs font-medium text-brand hover:text-brand-hover transition-colors"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="shrink-0 rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {/* Progress bar */}
      {toast.type !== 'error' && (
        <div className="h-0.5 w-full bg-slate-800">
          <div
            className={cn('h-full', config.progressColor)}
            style={{ animation: `shrink ${duration}ms linear forwards` }}
          />
        </div>
      )}
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    setToasts((prev) => [...prev, { ...t, id: crypto.randomUUID() }])
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-50 space-y-3">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </ToastContext.Provider>
  )
}
