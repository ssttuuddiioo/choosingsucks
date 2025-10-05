'use client'

import { Info } from 'lucide-react'
import type { Tables } from '@/types/supabase'

interface BYOCardProps {
  candidate: Tables<'candidates'>
  onLearnMore?: () => void
}

export default function BYOCard({ candidate, onLearnMore }: BYOCardProps) {
  // Only show Learn More for AI-generated or AI-extracted options
  const showLearnMore = onLearnMore && 
    candidate.metadata && 
    (candidate.metadata as any).source_type !== 'manual'
  return (
    <div className="h-full w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
      {/* Main content area with gradient */}
      <div className="relative bg-gradient-mesh animate-gradient flex-1 min-h-0 flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-3xl md:text-4xl font-outfit font-bold text-white leading-tight drop-shadow-lg">
            {candidate.name}
          </div>
        </div>
      </div>

      {/* Info - Fixed height section at bottom */}
      <div className="flex-shrink-0 p-3 sm:p-4 md:p-6 space-y-2 bg-white relative">
        {/* Description */}
        {candidate.description && (
          <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed pr-10">
            {candidate.description}
          </p>
        )}
        
        {/* Learn More Button - Bottom right */}
        {showLearnMore && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onLearnMore!()
            }}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6 bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-full shadow-md transition-all hover:scale-110 active:scale-95 z-10"
          >
            <Info className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        )}
      </div>
    </div>
  )
}

