import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatCurrencySar(amount: number | string | null | undefined): string {
  const value = Number(amount || 0)
  return `${new Intl.NumberFormat('ar-SA', {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value)} ريال`
}

export function normalizeOptionalUrl(value: string | null | undefined): string {
  const trimmed = (value || '').trim()
  if (!trimmed) return ''

  const hasScheme = /^[a-z][a-z\d+\-.]*:/i.test(trimmed)
  const candidate = hasScheme ? trimmed : `https://${trimmed}`
  const url = new URL(candidate)

  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
    throw new Error('Invalid URL')
  }

  return url.toString()
}

export function generateOrderNumber(): string {
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2)
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 90000) + 10000
  return `ORD-${year}${month}${day}-${random}`
}
