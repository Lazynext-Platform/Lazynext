import { formatDistanceToNow, format } from 'date-fns'

export function timeAgo(date: Date | string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatDate(date: Date | string) {
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatDateTime(date: Date | string) {
  return format(new Date(date), 'MMM d, yyyy h:mm a')
}

export function formatCurrencyINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function qualityLabel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 70) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}
