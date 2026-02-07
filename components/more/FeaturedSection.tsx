'use client'

import { MapPin } from 'lucide-react'
import FeaturedCard, { type FeaturedPlace } from './FeaturedCard'

interface FeaturedSectionProps {
  places: FeaturedPlace[]
  loading: boolean
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden shadow-md bg-white flex-shrink-0 w-[180px] snap-start">
      <div className="h-28 w-full bg-warm-gray100 animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-3/4 bg-warm-gray100 rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-warm-gray100 rounded animate-pulse" />
      </div>
    </div>
  )
}

export default function FeaturedSection({ places, loading }: FeaturedSectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="px-5 text-sm font-semibold font-outfit text-warm-gray700">
        Hot and new in the area
      </h2>

      {loading ? (
        <div className="flex gap-3 px-5 pb-2">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : places.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto px-5 pb-2 snap-x snap-mandatory scrollbar-hide">
          {places.map((place) => (
            <FeaturedCard
              key={place.placeId}
              place={place}
              className="snap-start flex-shrink-0 w-[180px]"
            />
          ))}
        </div>
      ) : (
        <div className="px-5">
          <div className="flex items-center gap-2 py-6 justify-center text-warm-gray400 text-sm">
            <MapPin className="w-4 h-4" />
            <span>Move the map to discover nearby spots</span>
          </div>
        </div>
      )}
    </section>
  )
}
