'use client'

import { MapPin } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
    <section className="space-y-2">
      <h2 className="px-5 text-sm font-semibold font-outfit text-warm-gray700">
        Hot and new in the area
      </h2>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex gap-3 px-5 pb-2"
          >
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </motion.div>
        ) : places.length > 0 ? (
          <motion.div
            key="places"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex gap-3 overflow-x-auto px-5 pb-2 snap-x snap-mandatory scrollbar-hide"
          >
            {places.map((place, i) => (
              <motion.div
                key={place.placeId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                className="snap-start flex-shrink-0 w-[180px]"
              >
                <FeaturedCard place={place} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-5"
          >
            <div className="flex items-center gap-2 py-6 justify-center text-warm-gray400 text-sm">
              <MapPin className="w-4 h-4" />
              <span>Move the map to discover nearby spots</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
