'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { useDrag } from '@use-gesture/react'
import { X, Heart, Star, DollarSign, MapPin } from 'lucide-react'
import type { Tables } from '@/types/supabase'
import { cn } from '@/lib/utils/cn'
import { useSpring, animated } from '@react-spring/web'
import { env } from '@/lib/utils/env'

interface SwipeInterfaceProps {
  candidates: Tables<'candidates'>[]
  onSwipe: (candidateId: string, vote: boolean) => void
}

export default function SwipeInterface({ candidates, onSwipe }: SwipeInterfaceProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set())
  const [isAnimating, setIsAnimating] = useState(false)
  
  const currentCandidate = candidates[currentIndex]
  const nextCandidate = candidates[currentIndex + 1]
  const nextNextCandidate = candidates[currentIndex + 2]
  
  // Motion values for smooth animations
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-25, 25])
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0])
  const scale = useTransform(x, [-150, 0, 150], [0.95, 1, 0.95])

  // Preload next images
  useEffect(() => {
    const imagesToPreload = [nextCandidate, nextNextCandidate].filter(Boolean)
    imagesToPreload.forEach(candidate => {
      if (candidate?.photo_ref && !preloadedImages.has(candidate.photo_ref)) {
        const img = new Image()
        img.src = getPhotoUrl(candidate.photo_ref)
        img.onload = () => {
          setPreloadedImages(prev => new Set(Array.from(prev).concat(candidate.photo_ref!)))
        }
      }
    })
  }, [currentIndex, nextCandidate, nextNextCandidate])

  const handleSwipeComplete = (vote: boolean) => {
    if (!currentCandidate || isAnimating) return
    
    setIsAnimating(true)
    
    // Haptic feedback for mobile devices
    if ('vibrate' in navigator) {
      navigator.vibrate(vote ? [50] : [30, 30, 30])
    }
    
    onSwipe(currentCandidate.id, vote)
    
    // Animate out and then update index
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1)
      x.set(0) // Reset position for next card
      setIsAnimating(false)
    }, 300)
  }

  const handleButtonSwipe = (vote: boolean) => {
    if (!currentCandidate || isAnimating) return
    
    // Animate to final position first (same as gesture swipe)
    x.set(vote ? 400 : -400)
    
    // Then complete the swipe
    handleSwipeComplete(vote)
  }

  const bind = useDrag(
    ({ active, movement: [mx], direction: [xDir], velocity: [vx], cancel }) => {
      if (isAnimating) {
        cancel()
        return
      }

      // Update x position during drag
      if (active) {
        x.set(mx)
      } else {
        // Determine if swipe should trigger
        const trigger = Math.abs(vx) > 0.3 || Math.abs(mx) > 100
        
        if (trigger) {
          const vote = mx > 0
          // Animate to final position
          x.set(mx > 0 ? 400 : -400)
          handleSwipeComplete(vote)
        } else {
          // Snap back to center with spring animation
          x.set(0)
        }
      }
    },
    {
      axis: 'x',
      bounds: { left: -300, right: 300 },
      rubberband: true,
    }
  )

  if (!currentCandidate) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-4xl font-outfit font-bold gradient-text">
            DONE CHOOSING!
          </h2>
          <p className="text-white/70 text-lg font-medium">
            Now we wait for the other indecisive humans...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-gradient-primary">
      {/* Card Stack */}
      <div className="flex-1 relative overflow-hidden min-h-[400px] p-4">
        {/* Third card (far background) - static positioning */}
        {nextNextCandidate && (
          <div
            className="absolute inset-4"
            style={{ 
              zIndex: 1,
              transform: 'scale(0.85) translateY(20px)',
              opacity: 0.4
            }}
          >
            <RestaurantCard candidate={nextNextCandidate} />
          </div>
        )}

        {/* Next card (background) - static positioning */}
        {nextCandidate && (
          <div
            className="absolute inset-4"
            style={{ 
              zIndex: 2,
              transform: 'scale(0.92) translateY(10px)',
              opacity: 0.7
            }}
          >
            <RestaurantCard candidate={nextCandidate} />
          </div>
        )}
        
        {/* Current card - animated */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCandidate.id}
            className="absolute inset-4 cursor-grab active:cursor-grabbing"
            style={{ 
              x, 
              rotate, 
              opacity,
              scale,
              zIndex: 10
            } as any}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30 
            }}
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ 
              scale: 0.8,
              opacity: 0,
              transition: { duration: 0.2 }
            }}
            {...bind() as any}
          >
            <RestaurantCard candidate={currentCandidate} dragX={x} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="p-6 safe-bottom space-y-4 max-w-md mx-auto w-full">
        {/* Action Buttons - side by side with arrow styling */}
        <div className="flex gap-3">
          <button
            onClick={() => handleButtonSwipe(false)}
            disabled={isAnimating}
            className="flex-1 flex items-center justify-center gap-3 py-4 px-6 font-bold text-xl bg-gradient-to-r from-red-500 to-red-600 text-white transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 relative overflow-hidden shadow-lg"
            style={{
              borderRadius: '0.5rem 0.75rem 0.75rem 0.5rem',
              clipPath: 'polygon(20px 0, 100% 0, 100% 100%, 20px 100%, 0 50%)'
            }}
          >
            <X className="h-6 w-6" />
            NAH
          </button>
          
          <button
            onClick={() => handleButtonSwipe(true)}
            disabled={isAnimating}
            className="flex-1 bg-gradient-lime text-white font-bold text-xl py-4 px-6 shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 relative overflow-hidden"
            style={{
              borderRadius: '0.75rem 0.5rem 0.5rem 0.75rem',
              clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%)'
            }}
          >
            <Heart className="h-6 w-6 fill-current" />
            YEAH
          </button>
        </div>
        
        {/* Brand voice messaging - moved below buttons */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-outfit font-bold text-white">
            SWIPE
          </h2>
          <p className="text-xs text-white/30 font-medium">
            Or tap the buttons
          </p>
        </div>
      </div>
    </div>
  )
}

interface RestaurantCardProps {
  candidate: Tables<'candidates'>
  dragX?: any
}

function RestaurantCard({ candidate, dragX }: RestaurantCardProps) {
  const photoUrl = candidate.photo_ref ? getPhotoUrl(candidate.photo_ref) : null
  
  // Debug logging for photo references
  if (candidate.photo_ref && !photoUrl) {
    console.warn('Photo reference found but no URL generated:', candidate.photo_ref)
  }

  // Transform drag position to overlay opacity and color
  const likeOpacity = dragX ? useTransform(dragX, [0, 150], [0, 0.8]) : 0
  const nopeOpacity = dragX ? useTransform(dragX, [-150, 0], [0.8, 0]) : 0

  return (
    <div className="h-full glass-card overflow-hidden flex flex-col relative">
      {/* Drag feedback overlays */}
      {dragX && (
        <>
          {/* Like overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-lime flex items-center justify-center z-10 rounded-2xl"
            style={{ opacity: likeOpacity }}
          >
            <Heart className="h-24 w-24 text-white fill-current animate-pulse" />
          </motion.div>

          {/* Nope overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center z-10 rounded-2xl"
            style={{ opacity: nopeOpacity }}
          >
            <X className="h-24 w-24 text-white animate-pulse" />
          </motion.div>
        </>
      )}

      {/* Image */}
      <div className="flex-1 relative bg-gradient-to-br from-electric-purple/20 to-hot-pink/20">
        {photoUrl ? (
          <>
            <img
              src={photoUrl}
              alt={candidate.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-mesh animate-gradient">
            <div className="text-center">
              <div className="text-8xl font-outfit font-bold text-white/20">
                {candidate.name.charAt(0)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-6 space-y-3 bg-gradient-to-t from-black/90 via-black/60 to-black/40 backdrop-blur-sm">
        <h2 className="text-2xl font-outfit font-bold text-white line-clamp-2 drop-shadow-lg">
          {candidate.name}
        </h2>

        <div className="flex items-center gap-4 text-sm">
          {/* Rating */}
          {candidate.rating && (
            <div className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span className="font-bold text-white">{candidate.rating}</span>
              {candidate.user_ratings_total && (
                <span className="text-white/50">({candidate.user_ratings_total})</span>
              )}
            </div>
          )}

          {/* Price Level */}
          {candidate.price_level && (
            <div className="flex items-center bg-white/10 px-3 py-1 rounded-full">
              {Array.from({ length: 4 }).map((_, i) => (
                <DollarSign
                  key={i}
                  className={cn(
                    "h-4 w-4",
                    i < (candidate.price_level || 0)
                      ? "text-lime-green"
                      : "text-white/30"
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* Cuisines */}
        {candidate.cuisines && candidate.cuisines.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {candidate.cuisines.slice(0, 3).map((cuisine, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-gradient-electric text-white text-xs rounded-full font-semibold"
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