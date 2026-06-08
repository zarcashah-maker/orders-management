'use client'

import { ExecutionType } from '@/types'
import { cn } from '@/lib/utils'
import { getExecutionTypeLabel } from '@/lib/orders'
import { usePreferences } from '@/lib/i18n'

interface ExecutionTypeBadgeProps {
  executionType: ExecutionType | null | undefined
  size?: 'sm' | 'md'
}

export function ExecutionTypeBadge({ executionType, size = 'md' }: ExecutionTypeBadgeProps) {
  const { locale } = usePreferences()
  const style = executionType === 'printing'
    ? 'border-sky-200 bg-sky-50 text-sky-700'
    : executionType === 'embroidery'
      ? 'border-violet-200 bg-violet-50 text-violet-700'
      : 'border-stone-200 bg-stone-50 text-stone-500'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-semibold',
        style,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      )}
    >
      {getExecutionTypeLabel(executionType, locale)}
    </span>
  )
}
