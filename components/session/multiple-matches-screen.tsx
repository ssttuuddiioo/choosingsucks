'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Star, DollarSign, Navigation, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Tables } from '@/types/supabase'
import { cn } from '@/lib/utils/cn'
import dynamic from 'next/dynamic'

// Dynamically import confetti
const Confetti = dynamic(() => import('react-confetti'), { ssr: false })

interface MultipleMatchesScreenProps {
  session: Tables<'sessions'>
  matches: Tables<'candidates'>[]
}

export default function MultipleMatchesScreen({ session, matches }: MultipleMatchesScreenProps) {
  const [showConfetti, setShowConfetti] = useState(true)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    // Get window size for confetti
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
    updateSize()
    window.addEventListener('resize', updateSize)

    // Stop confetti after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000)

    return () => {
      window.removeEventListener('resize', updateSize)
      clearTimeout(timer)
    }
  }, [])

  const getGoogleMapsUrl = (candidate: Tables<'candidates'>) => 
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(candidate.name)}&query_place_id=${candidate.place_id}`
  
  const getDirectionsUrl = (candidate: Tables<'candidates'>) => 
    `https://www.google.com/maps/dir/?api=1&destination=${candidate.lat},${candidate.lng}&destination_place_id=${candidate.place_id}`

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={300}
          gravity={0.1}
        />
      )}

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Success Message */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="text-center space-y-2"
        >
          <div className="text-6xl">🎉</div>
          <h1 className="text-3xl font-bold text-gray-900">
            {matches.length} Great Options!
          </h1>
          <p className="text-lg text-gray-600">
            Your group agreed on these {matches.length} restaurants
          </p>
        </motion.div>

        {/* Matches List */}
        <div className="space-y-4">
          {matches.map((candidate, index) => (
            <motion.div
              key={candidate.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="bg-white rounded-2xl shadow-lg overflow-hidden"
            >
              <div className="flex">
                {/* Image */}
                {candidate.photo_ref && (
                  <div className="w-24 h-24 bg-gray-100 relative flex-shrink-0">
                    <img
                      src={`https://places.googleapis.com/v1/${candidate.photo_ref}/media?maxWidthPx=400&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                      alt={candidate.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Details */}
                <div className="flex-1 p-4 space-y-2">
                  <div>
                    <h3 className="font-bold text-gray-900">{candidate.name}</h3>
                    
                    <div className="flex items-center gap-3 text-sm mt-1">
                      {/* Rating */}
                      {candidate.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          <span className="font-medium">{candidate.rating}</span>
                          {candidate.user_ratings_total && (
                            <span className="text-gray-500">({candidate.user_ratings_total})</span>
                          )}
                        </div>
                      )}

                      {/* Price Level */}
                      {candidate.price_level && (
                        <div className="flex items-center">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <DollarSign
                              key={i}
                              className={cn(
                                "h-3 w-3",
                                i < (candidate.price_level || 0)
                                  ? "text-gray-900"
                                  : "text-gray-300"
                              )}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => window.open(getGoogleMapsUrl(candidate), '_blank')}
                      size="sm"
                      variant="outline"
                      className="flex-1"
                    >
                      <MapPin className="mr-1 h-3 w-3" />
                      View
                    </Button>
                    <Button
                      onClick={() => window.open(getDirectionsUrl(candidate), '_blank')}
                      size="sm"
                      className="flex-1"
                    >
                      <Navigation className="mr-1 h-3 w-3" />
                      Go
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Share Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 + matches.length * 0.1 }}
          className="bg-white rounded-lg shadow-sm border p-6 text-center space-y-3"
        >
          <p className="text-gray-600">
            {matches.length === 1 
              ? "Perfect! You found the one."
              : `${matches.length} options to choose from. The hardest part is over!`
            }
          </p>
          <Button
            onClick={() => {
              const restaurantNames = matches.map(m => m.name).join(', ')
              const text = `We narrowed it down to: ${restaurantNames}! 🎉\n\nView details: ${window.location.href}`
              if (navigator.share) {
                navigator.share({ text })
              } else {
                navigator.clipboard.writeText(text)
              }
            }}
            variant="outline"
            className="mx-auto"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Share Results
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
