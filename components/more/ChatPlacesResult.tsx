'use client'

import { Check } from 'lucide-react'
import { motion } from 'framer-motion'
import FeaturedCard, { type FeaturedPlace } from './FeaturedCard'
import { cn } from '@/lib/utils/cn'

interface ChatPlacesResultProps {
  content: string
  places: FeaturedPlace[]
  selected: Set<string>
  onToggle: (placeId: string) => void
}

export default function ChatPlacesResult({ content, places, selected, onToggle }: ChatPlacesResultProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2.5"
    >
      {/* Text bubble */}
      <div className="flex justify-start">
        <div className="max-w-[80%] px-4 py-2.5 text-sm leading-relaxed bg-warm-gray100 text-warm-black rounded-2xl rounded-bl-sm">
          {content}
        </div>
      </div>

      {/* Place cards carousel */}
      {places.length > 0 && (
        <>
          <p className="text-[11px] text-warm-gray400 px-1">Tap to select or deselect</p>
          <div className="flex gap-2.5 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
            {places.map((place) => {
              const isSelected = selected.has(place.placeId)
              return (
                <button
                  key={place.placeId}
                  onClick={() => onToggle(place.placeId)}
                  className={cn(
                    'snap-start flex-shrink-0 w-[160px] relative rounded-2xl transition-all text-left',
                    isSelected
                      ? 'ring-2 ring-coral'
                      : 'opacity-50'
                  )}
                >
                  <FeaturedCard place={place} />
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-coral rounded-full flex items-center justify-center shadow-sm">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </motion.div>
  )
}
