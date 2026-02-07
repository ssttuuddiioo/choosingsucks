'use client'

import { useState } from 'react'
import { Star, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { env } from '@/lib/utils/env'

export interface FeaturedPlace {
  placeId: string
  name: string
  rating: number | null
  priceLevel: number | null
  photoRef: string | null
  lat: number
  lng: number
}

interface FeaturedCardProps {
  place: FeaturedPlace
  className?: string
}

export default function FeaturedCard({ place, className }: FeaturedCardProps) {
  const [imgError, setImgError] = useState(false)

  const photoUrl =
    place.photoRef && env.google.mapsApiKey
      ? `https://places.googleapis.com/v1/${place.photoRef}/media?maxWidthPx=400&key=${env.google.mapsApiKey}`
      : null

  return (
    <div
      className={cn(
        'rounded-2xl overflow-hidden shadow-md bg-white text-left flex flex-col',
        className
      )}
    >
      {/* Photo or gradient fallback */}
      {photoUrl && !imgError ? (
        <img
          src={photoUrl}
          alt={place.name}
          className="h-28 w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="h-28 w-full bg-gradient-to-br from-coral/30 to-warm-gray200" />
      )}

      {/* Info */}
      <div className="p-3 space-y-1.5">
        <h3 className="text-sm font-semibold text-warm-black line-clamp-1">{place.name}</h3>

        <div className="flex items-center gap-2 text-[11px] text-warm-gray500">
          {place.rating && (
            <span className="flex items-center gap-0.5">
              <Star className="w-3 h-3 text-coral fill-coral" />
              {place.rating.toFixed(1)}
            </span>
          )}
          {place.priceLevel != null && place.priceLevel > 0 && (
            <span className="flex items-center">
              {Array.from({ length: place.priceLevel }).map((_, i) => (
                <DollarSign key={i} className="w-3 h-3 text-warm-gray400" />
              ))}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
