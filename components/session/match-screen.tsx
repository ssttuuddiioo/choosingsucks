import { Star, MapPin, DollarSign, ExternalLink, Navigation, Plus } from 'lucide-react'
import type { Tables } from '@/types/supabase'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Lottie from 'lottie-react'
import confettiAnimation from '@/lib/animations/confetti.json'
import { cn } from '@/lib/utils/cn'
import { env } from '@/lib/utils/env'

interface MatchScreenProps {
  session: Tables<'sessions'>
  candidate?: Tables<'candidates'>
}

export default function MatchScreen({ session, candidate }: MatchScreenProps) {
  const router = useRouter()
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    // Hide confetti after 3 seconds
    const timer = setTimeout(() => setShowConfetti(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  if (!candidate) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white/70">Loading match details...</p>
        </div>
      </div>
    )
  }

  const getPhotoUrl = (photoRef: string): string => {
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

  const photoUrl = candidate.photo_ref ? getPhotoUrl(candidate.photo_ref) : null

  return (
    <div className="min-h-screen bg-gradient-primary md:flex md:items-center md:justify-center md:p-4 relative overflow-hidden">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-50">
          <Lottie 
            animationData={confettiAnimation}
            loop={false}
            className="w-full h-full"
          />
        </div>
      )}

      <motion.div 
        initial={{ scale: 0.8, opacity: 0, rotateY: 180 }}
        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 100, 
          damping: 15,
          duration: 0.8 
        }}
        className="md:bg-white/95 md:backdrop-blur-xl md:rounded-2xl md:shadow-2xl md:max-w-md w-full overflow-hidden min-h-screen md:min-h-0 flex flex-col"
      >
        {/* Success Header */}
        <div className="bg-gradient-lime p-6 text-center">
          <motion.h1 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-outfit font-bold text-white"
          >
            Unanimous decision!
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-white/90 mt-2"
          >
            {session.match_requirement === 'all' 
              ? "Unanimous decision achieved" 
              : "Majority has spoken"}
          </motion.p>
        </div>

        {/* Restaurant Image */}
        {photoUrl && (
          <div className="relative h-48 bg-gradient-mesh animate-gradient">
            <img
              src={photoUrl}
              alt={candidate.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}

        {/* Restaurant Details */}
        <div className="flex-1 p-6 space-y-4 flex flex-col">
          <div>
            <h2 className="text-2xl font-outfit font-bold text-gray-900">
              {candidate.name}
            </h2>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-2">
            {candidate.rating && (
              <div className="flex items-center gap-1 bg-gray-100 px-3 py-2 rounded-lg">
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                <span className="font-bold text-gray-900">{candidate.rating}</span>
                {candidate.user_ratings_total && (
                  <span className="text-gray-600 text-sm">({candidate.user_ratings_total})</span>
                )}
              </div>
            )}

            {candidate.price_level && (
              <div className="flex items-center bg-gray-100 px-3 py-2 rounded-lg">
                {Array.from({ length: 4 }).map((_, i) => (
                  <DollarSign
                    key={i}
                    className={cn(
                      "h-4 w-4",
                      i < (candidate.price_level || 0)
                        ? "text-green-600"
                        : "text-gray-400"
                    )}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Cuisines */}
          {candidate.cuisines && candidate.cuisines.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {candidate.cuisines.map((cuisine, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-gradient-electric text-white text-xs rounded-full font-semibold"
                >
                  {cuisine.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-auto space-y-3 pt-4">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(candidate.name)}&query_place_id=${candidate.place_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gradient-lime w-full flex items-center justify-center gap-2 text-lg"
            >
              <Navigation className="h-5 w-5" />
              Finally, let's eat
            </a>

            {candidate.url && (
              <a
                href={candidate.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-900 transition-all"
              >
                <ExternalLink className="h-4 w-4" />
                View on Google
              </a>
            )}

            {/* Subtle New Session Button */}
            <button
              onClick={() => router.push('/')}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 text-gray-600 hover:text-gray-800 transition-all text-sm"
            >
              <Plus className="h-4 w-4" />
              Start a new swipe session
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}