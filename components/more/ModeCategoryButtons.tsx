'use client'

import { Utensils, Tv, Clapperboard, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const MODES = [
  { id: 'restaurant', label: 'Restaurant', icon: Utensils },
  { id: 'shows', label: 'Shows', icon: Tv },
  { id: 'movies', label: 'Movies', icon: Clapperboard },
  { id: 'byo', label: 'BYO', icon: Wrench },
]

interface ModeCategoryButtonsProps {
  activeMode: string
  onModeChange: (mode: string) => void
}

export default function ModeCategoryButtons({ activeMode, onModeChange }: ModeCategoryButtonsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
      {MODES.map((mode) => {
        const Icon = mode.icon
        const isActive = activeMode === mode.id

        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors border',
              isActive
                ? 'bg-coral text-white border-coral'
                : 'bg-warm-gray100 text-warm-gray700 border-warm-gray200 hover:border-warm-gray300'
            )}
          >
            <Icon className="w-4 h-4" />
            {mode.label}
          </button>
        )
      })}
    </div>
  )
}
