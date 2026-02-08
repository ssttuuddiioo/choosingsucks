'use client'

import { Filter, Loader2 } from 'lucide-react'
import StarRating from '@/components/homepage/StarRating'

interface MapFilterBarProps {
  starRating: number
  onStarRatingChange: (rating: number) => void
  onReady: () => void
  filterCount: number
  onFilterClick?: () => void
  loading?: boolean
}

export default function MapFilterBar({
  starRating,
  onStarRatingChange,
  onReady,
  filterCount,
  onFilterClick,
  loading,
}: MapFilterBarProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl shadow-sm border border-warm-gray100">
      {/* Filter icon with attention dot */}
      <button onClick={onFilterClick} className="relative p-1.5 rounded-lg hover:bg-warm-gray100 transition-colors">
        <Filter className="w-5 h-5 text-warm-gray500" />
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-coral rounded-full" />
      </button>

      {/* Star rating */}
      <div className="flex-1">
        <StarRating value={starRating} onChange={onStarRatingChange} size={20} showValue={false} />
      </div>

      {/* Ready button */}
      <button
        onClick={onReady}
        disabled={loading}
        className="px-5 py-2 bg-coral text-white text-sm font-semibold rounded-full hover:bg-coral-dark active:scale-95 transition-all disabled:opacity-60"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Help decide'}
      </button>
    </div>
  )
}
