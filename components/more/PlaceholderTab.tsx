'use client'

import { cn } from '@/lib/utils/cn'

interface PlaceholderTabProps {
  title: string
  description?: string
  icon: React.ReactNode
}

export default function PlaceholderTab({ title, description, icon }: PlaceholderTabProps) {
  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-warm-gray100 rounded-2xl flex items-center justify-center mx-auto">
          {icon}
        </div>
        <h2 className="text-lg font-bold font-outfit text-warm-black">{title}</h2>
        <p className="text-warm-gray500 text-sm">{description || 'Coming soon'}</p>
      </div>
    </div>
  )
}
