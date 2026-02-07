'use client'

import { Filter } from 'lucide-react'
import StarRating from '@/components/homepage/StarRating'

interface MapFilterBarProps {
  starRating: number
  onStarRatingChange: (rating: number) => void
  onReady: () => void
  filterCount: number
}

export default function MapFilterBar({
  starRating,
  onStarRatingChange,
  onReady,
  filterCount,
}: MapFilterBarProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-sm border border-warm-gray100">
      {/* Filter icon with badge */}
      <button className="relative p-1.5 rounded-lg hover:bg-warm-gray100 transition-colors">
        <Filter className="w-5 h-5 text-warm-gray500" />
        {filterCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-coral text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {filterCount}
          </span>
        )}
      </button>

      {/* Star rating */}
      <div className="flex-1">
        <StarRating value={starRating} onChange={onStarRatingChange} size={20} showValue={false} />
      </div>

      {/* Ready button */}
      <button
        onClick={onReady}
        className="px-5 py-2 bg-coral text-white text-sm font-semibold rounded-full hover:bg-coral-dark active:scale-95 transition-all"
      >
        Ready
      </button>
    </div>
  )
}
