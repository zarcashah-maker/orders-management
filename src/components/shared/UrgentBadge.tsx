'use client'

import { AlertTriangle } from 'lucide-react'
import { usePreferences } from '@/lib/i18n'

interface UrgentBadgeProps {
  size?: 'sm' | 'md'
}

export function UrgentBadge({ size = 'md' }: UrgentBadgeProps) {
  const { t } = usePreferences()

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 font-semibold text-red-700 ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <AlertTriangle size={size === 'sm' ? 12 : 14} />
      {t('urgent')}
    </span>
  )
}
