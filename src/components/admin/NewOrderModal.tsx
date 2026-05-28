'use client'

import { Factory } from '@/types'
import { AddOrderForm } from '@/components/admin/AddOrderForm'

interface Props {
  factories: Factory[]
  onClose: () => void
  onCreated: () => void
}

export function NewOrderModal({ factories, onClose, onCreated }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 hidden items-center justify-center bg-black/50 p-4 backdrop-blur-sm lg:flex"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-slide-up">
        <AddOrderForm
          factories={factories}
          onCancel={onClose}
          onCreated={onCreated}
          variant="modal"
        />
      </div>
    </div>
  )
}
