'use client'

import { useState, useEffect } from 'react'
import { Star, DollarSign, Info } from 'lucide-react'
import type { Tables } from '@/types/supabase'
import { cn } from '@/lib/utils/cn'
import { env } from '@/lib/utils/env'

interface RestaurantCardProps {
  candidate: Tables<'candidates'>
  onLearnMore?: () => void
}

export default function RestaurantCard({ candidate, onLearnMore }: RestaurantCardProps) {
  const [imageError, setImageError] = useState(false)
  
  // Reset image error state when candidate changes
  useEffect(() => {
    setImageError(false)
  }, [candidate.id])

  const photoUrl = candidate.photo_ref ? getPhotoUrl(candidate.photo_ref) : null
  
  return (
    <div className="h-full w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
      {/* Image - Takes up remaining space */}
      <div className="relative bg-gradient-to-br from-coral/10 to-warm-bg flex-1 min-h-0">
        {photoUrl && !imageError ? (
          <>
            <img
              src={photoUrl}
              alt={candidate.name}
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-mesh animate-gradient">
            <div className="text-center">
              <div className="text-6xl md:text-8xl font-outfit font-bold text-white/20">
                {candidate.name.charAt(0)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info - Fixed height section at bottom */}
      <div className="flex-shrink-0 p-3 sm:p-4 md:p-6 space-y-2 bg-white relative">
        <h2 className="text-lg sm:text-xl md:text-2xl font-outfit font-bold text-gray-900 line-clamp-2 leading-tight pr-10">
          {candidate.name}
        </h2>
        
        {/* Learn More Button - Bottom right */}
        {onLearnMore && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onLearnMore()
            }}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6 bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-full shadow-md transition-all hover:scale-110 active:scale-95 z-10"
          >
            <Info className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        )}

        <div className="flex items-center gap-2 sm:gap-3 text-sm flex-wrap">
          {candidate.rating && (
            <div className="flex items-center gap-1 bg-gray-200 px-2 md:px-3 py-1 rounded-full">
              <Star className="h-3 w-3 md:h-4 md:w-4 text-yellow-500 fill-current" />
              <span className="font-bold text-gray-900 text-xs md:text-sm">{candidate.rating}</span>
              {candidate.user_ratings_total && (
                <span className="text-gray-600 text-xs">({candidate.user_ratings_total})</span>
              )}
            </div>
          )}

          {candidate.price_level && (
            <div className="flex items-center bg-gray-200 px-2 md:px-3 py-1 rounded-full">
              {Array.from({ length: 4 }).map((_, i) => (
                <DollarSign
                  key={i}
                  className={cn(
                    "h-3 w-3 md:h-4 md:w-4",
                    i < (candidate.price_level || 0)
                      ? "text-green-600"
                      : "text-gray-400"
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {candidate.cuisines && candidate.cuisines.length > 0 && (
          <div className="flex flex-wrap gap-1 md:gap-2">
            {candidate.cuisines.slice(0, 3).map((cuisine: string, i: number) => (
              <span
                key={i}
                className="px-2 md:px-3 py-1 bg-coral/10 text-coral text-xs rounded-full font-semibold whitespace-nowrap"
              >
                {cuisine.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function getPhotoUrl(photoRef: string): string {
  const apiKey = env.google.mapsApiKey
  if (!apiKey) {
    console.warn('Google Maps API key not found for photo loading')
    return ''
  }
  
  // Check if this is a new Places API photo reference (starts with "places/")
  if (photoRef.startsWith('places/')) {
    // New Places API format - use the photo name directly
    return `https://places.googleapis.com/v1/${photoRef}/media?maxWidthPx=800&key=${apiKey}`
  } else {
    // Legacy format - use old API
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${apiKey}`
  }
}

