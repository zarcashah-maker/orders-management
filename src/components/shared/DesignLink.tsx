'use client'

import { ExternalLink } from 'lucide-react'
import { normalizeOptionalUrl } from '@/lib/utils'
import { usePreferences } from '@/lib/i18n'

interface DesignLinkProps {
  url: string | null | undefined
  emptyMode?: 'hidden' | 'text'
}

export function DesignLink({ url, emptyMode = 'text' }: DesignLinkProps) {
  const { t } = usePreferences()
  let safeUrl = ''

  try {
    safeUrl = normalizeOptionalUrl(url)
  } catch {
    safeUrl = ''
  }

  if (!safeUrl) {
    if (emptyMode === 'hidden') return null
    return <span className="text-sm text-stone-400">{t('notAdded')}</span>
  }

  return (
    <a
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100"
    >
      <ExternalLink size={15} />
      {t('openDesignLink')}
    </a>
  )
}
