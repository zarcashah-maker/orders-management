'use client'

import { OrderStatus } from '@/types'
import { cn } from '@/lib/utils'
import { getOrderStatusLabel } from '@/lib/orders'
import { usePreferences } from '@/lib/i18n'

const statusStyles: Record<OrderStatus, string> = {
  pending:     'bg-amber-50  text-amber-700  border-amber-200',
  sewing:      'bg-cyan-50   text-cyan-700   border-cyan-200',
  in_progress: 'bg-blue-50   text-blue-700   border-blue-200',
  rework:      'bg-orange-50 text-orange-700 border-orange-200',
  review:      'bg-purple-50 text-purple-700 border-purple-200',
  completed:   'bg-green-50  text-green-700  border-green-200',
  cancelled:   'bg-red-50    text-red-600    border-red-200',
}

const statusDots: Record<OrderStatus, string> = {
  pending:     'bg-amber-400',
  sewing:      'bg-cyan-500',
  in_progress: 'bg-blue-500',
  rework:      'bg-orange-500',
  review:      'bg-purple-500',
  completed:   'bg-green-500',
  cancelled:   'bg-red-400',
}

interface StatusBadgeProps {
  status: OrderStatus
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const { locale } = usePreferences()
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        statusStyles[status],
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1'
      )}
    >
      <span className={cn('rounded-full', statusDots[status], size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2')} />
      {getOrderStatusLabel(status, locale)}
    </span>
  )
}
