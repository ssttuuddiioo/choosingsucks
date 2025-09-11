'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { useDrag } from '@use-gesture/react'
import { useRouter } from 'next/navigation'
import { X, Heart, Star, DollarSign, MapPin, Plus } from 'lucide-react'
import type { Tables } from '@/types/supabase'
import { cn } from '@/lib/utils/cn'
import { env } from '@/lib/utils/env'

interface SwipeInterfaceProps {
  candidates: Tables<'candidates'>[]
  onSwipe: (candidateId: string, vote: boolean) => void
}

export default function SwipeInterface({ candidates, onSwipe }: SwipeInterfaceProps) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set())
  const [isAnimating, setIsAnimating] = useState(false)
  const [animatingCardId, setAnimatingCardId] = useState<string | null>(null)
  const buttonsRef = useRef<HTMLDivElement | null>(null)
  const [bottomBarHeight, setBottomBarHeight] = useState<number>(0)

  // Prevent body scrolling on mobile
  useEffect(() => {
    // Prevent scrolling on the body
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.body.style.height = '100%'
    
    return () => {
      // Restore scrolling when component unmounts
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.height = ''
    }
  }, [])
  
  // Measure bottom action bar to keep card fully visible above it
  useEffect(() => {
    const updateHeights = () => {
      if (buttonsRef.current) {
        setBottomBarHeight(buttonsRef.current.offsetHeight || 0)
      }
    }
    updateHeights()

    window.addEventListener('resize', updateHeights)
    const observer = new ResizeObserver(updateHeights)
    if (buttonsRef.current) observer.observe(buttonsRef.current)

    return () => {
      window.removeEventListener('resize', updateHeights)
      observer.disconnect()
    }
  }, [])

  // Reset indices whenever the filtered candidates list changes length
  useEffect(() => {
    setCurrentIndex(0)
    setAnimatingCardId(null)
    x.set(0)
  }, [candidates.length])

  // Calculate card candidates using single index source
  const hasCandidates = candidates.length > 0
  const safeCurrentIndex = hasCandidates ? Math.min(currentIndex, candidates.length - 1) : 0
  const currentCandidate = hasCandidates ? candidates[safeCurrentIndex] : undefined
  const nextCandidate = hasCandidates ? candidates[safeCurrentIndex + 1] : undefined
  const nextNextCandidate = hasCandidates ? candidates[safeCurrentIndex + 2] : undefined
  
  // Motion values for smooth animations
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-25, 25])
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0])
  const scale = useTransform(x, [-150, 0, 150], [0.95, 1, 0.95])

  // Preload next images based on current index
  useEffect(() => {
    const imagesToPreload = [currentCandidate, nextCandidate, nextNextCandidate].filter(Boolean)
    imagesToPreload.forEach(candidate => {
      if (candidate?.photo_ref && !preloadedImages.has(candidate.photo_ref)) {
        const img = new Image()
        img.src = getPhotoUrl(candidate.photo_ref)
        img.onload = () => {
          setPreloadedImages(prev => new Set(Array.from(prev).concat(candidate.photo_ref!)))
        }
      }
    })
  }, [currentIndex, preloadedImages])

  const handleSwipeComplete = (vote: boolean) => {
    if (!currentCandidate || isAnimating) return
    
    setIsAnimating(true)
    setAnimatingCardId(currentCandidate.id)
    
    // Haptic feedback for mobile devices
    if ('vibrate' in navigator) {
      navigator.vibrate(vote ? [50] : [30, 30, 30])
    }
    
    onSwipe(currentCandidate.id, vote)
    
    // Atomic state update after animation completes
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1)
      setAnimatingCardId(null)
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
    ({ active, movement: [mx], direction: [xDir], velocity: [vx], cancel, tap }) => {
      if (isAnimating) {
        cancel()
        return
      }

      // Update x position during drag
      if (active) {
        x.set(mx)
      } else {
        // More forgiving swipe detection - especially for right swipes
        const absVx = Math.abs(vx)
        const absMx = Math.abs(mx)
        
        // Different thresholds for left vs right to help with "yea" swipes
        const isRightSwipe = mx > 0
        const velocityThreshold = isRightSwipe ? 0.1 : 0.15
        const distanceThreshold = isRightSwipe ? 30 : 40
        
        const trigger = absVx > velocityThreshold || absMx > distanceThreshold
        
        // Debug logging (remove in production)
        console.log('Swipe attempt:', { mx, vx, trigger, isRightSwipe, absVx, absMx })
        
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
      bounds: { left: -400, right: 400 },
      rubberband: true,
      filterTaps: true,
      threshold: 5,
    }
  )

  if (candidates.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 bg-gradient-primary">
        <div className="text-center space-y-6 max-w-md">
          <h2 className="text-4xl font-outfit font-bold gradient-text">
            DONE CHOOSING!
          </h2>
          <p className="text-white/70 text-lg font-medium">
            Now we wait for the other indecisive humans...
          </p>
          
          <button
            onClick={() => router.push('/')}
            className="btn-gradient w-full flex items-center justify-center gap-2 text-lg py-4 mt-8"
          >
            <Plus className="h-5 w-5" />
            Host Your Own Session
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-primary">
      {/* Card Stack - flexible height with proper spacing */}
      <div 
        className="flex-1 relative overflow-hidden p-2 md:p-4"
        style={{ 
          paddingBottom: bottomBarHeight ? bottomBarHeight + 16 : 80
        }}
      >
        {/* Card container - constrained to available space */}
        <div className="h-full relative" style={{ minHeight: '400px' }}>
          <AnimatePresence mode="popLayout">
          {/* Third card (far background) - positioned within available space */}
          {nextNextCandidate && (
            <div
              key={`bg-far-${nextNextCandidate.id}`}
              className="absolute inset-0"
              style={{ 
                zIndex: 1,
                transform: 'scale(0.85) translateY(20px)',
                opacity: 0.4
              }}
            >
              <RestaurantCard candidate={nextNextCandidate} />
            </div>
          )}

          {/* Next card (background) - positioned within available space */}
          {nextCandidate && (
            <div
              key={`bg-next-${nextCandidate.id}`}
              className="absolute inset-0"
              style={{ 
                zIndex: 2,
                transform: 'scale(0.92) translateY(10px)',
                opacity: 0.7
              }}
            >
              <RestaurantCard candidate={nextCandidate} />
            </div>
          )}
          
          {/* Current card - animated within available space */}
          {currentCandidate && (
            <motion.div
              key={`current-${currentCandidate.id}`}
              className="absolute inset-0 cursor-grab active:cursor-grabbing touch-none"
              style={{ 
                x, 
                rotate, 
                opacity: animatingCardId === currentCandidate.id ? opacity : 1,
                scale: animatingCardId === currentCandidate.id ? scale : 1,
                zIndex: 10
              } as any}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ 
                duration: 0.2,
                ease: "easeOut"
              }}
              {...bind() as any}
            >
              <RestaurantCard 
                candidate={currentCandidate} 
                dragX={animatingCardId === currentCandidate.id ? x : undefined} 
              />
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>

      {/* Action Buttons - pinned to bottom and safe-area aware */}
      <div
        ref={buttonsRef}
        className="sticky bottom-0 left-0 right-0 z-20 max-w-md mx-auto w-full flex-shrink-0 bg-gradient-primary/95 backdrop-blur p-4 pt-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        {/* Action Buttons - side by side with arrow styling */}
        <div className="flex gap-3">
          <button
            onClick={() => handleButtonSwipe(false)}
            disabled={isAnimating}
            aria-label="Reject this restaurant"
            className="flex-1 flex items-center justify-center gap-3 py-4 px-6 font-bold text-xl bg-gradient-to-r from-red-500 to-red-600 text-white transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 relative overflow-hidden shadow-lg focus:outline-none focus:ring-4 focus:ring-red-500/50"
            style={{
              borderRadius: '0.5rem 0.75rem 0.75rem 0.5rem',
              clipPath: 'polygon(20px 0, 100% 0, 100% 100%, 20px 100%, 0 50%)'
            }}
          >
            NAH
            <X className="h-6 w-6" />
          </button>
          
          <button
            onClick={() => handleButtonSwipe(true)}
            disabled={isAnimating}
            aria-label="Like this restaurant"
            className="flex-1 bg-gradient-lime text-white font-bold text-xl py-4 px-6 shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 relative overflow-hidden focus:outline-none focus:ring-4 focus:ring-lime-green/50"
            style={{
              borderRadius: '0.75rem 0.5rem 0.5rem 0.75rem',
              clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%)'
            }}
          >
            <Heart className="h-6 w-6 fill-current" />
            YEA
          </button>
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
  const [imageError, setImageError] = useState(false)
  const photoUrl = candidate.photo_ref ? getPhotoUrl(candidate.photo_ref) : null
  
  // Reset image error state when candidate changes
  useEffect(() => {
    setImageError(false)
  }, [candidate.id])
  
  // Debug logging for photo references
  if (candidate.photo_ref && !photoUrl) {
    console.warn('Photo reference found but no URL generated:', candidate.photo_ref)
  }
  
  // Debug: Log photo URL generation
  console.log(`🖼️ ${candidate.name}:`, {
    hasPhotoRef: !!candidate.photo_ref,
    photoRef: candidate.photo_ref,
    photoUrl: photoUrl,
    imageError: imageError
  })

  // Transform drag position to overlay opacity and color
  // Always call hooks - use motionValue(0) as fallback to maintain hook order
  const fallbackX = useMotionValue(0)
  const likeOpacity = useTransform(dragX || fallbackX, [0, 150], [0, 0.8])
  const nopeOpacity = useTransform(dragX || fallbackX, [-150, 0], [0.8, 0])

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

      {/* Image - takes available space but leaves room for info */}
      <div 
        className="relative bg-gradient-to-br from-electric-purple/20 to-hot-pink/20"
        style={{ 
          flex: '1 1 0',
          minHeight: '200px', // Ensure minimum image height
          maxHeight: 'calc(100% - 180px)' // Reserve space for info section
        }}
      >
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
              <div className="text-8xl font-outfit font-bold text-white/20">
                {candidate.name.charAt(0)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info - fixed height to ensure visibility */}
      <div 
        className="flex-shrink-0 p-4 md:p-6 space-y-3 bg-gradient-to-t from-black/95 via-black/80 to-black/60 backdrop-blur-sm"
        style={{ 
          minHeight: '140px', // Ensure minimum space for content
          maxHeight: '180px'  // Prevent info from taking too much space
        }}
      >
        <h2 className="text-xl md:text-2xl font-outfit font-bold text-white line-clamp-2 drop-shadow-lg">
          {candidate.name}
        </h2>

        <div className="flex items-center gap-3 text-sm">
          {/* Rating */}
          {candidate.rating && (
            <div className="flex items-center gap-1 bg-white/10 px-2 md:px-3 py-1 rounded-full">
              <Star className="h-3 w-3 md:h-4 md:w-4 text-yellow-400 fill-current" />
              <span className="font-bold text-white text-xs md:text-sm">{candidate.rating}</span>
              {candidate.user_ratings_total && (
                <span className="text-white/50 text-xs">({candidate.user_ratings_total})</span>
              )}
            </div>
          )}

          {/* Price Level */}
          {candidate.price_level && (
            <div className="flex items-center bg-white/10 px-2 md:px-3 py-1 rounded-full">
              {Array.from({ length: 4 }).map((_, i) => (
                <DollarSign
                  key={i}
                  className={cn(
                    "h-3 w-3 md:h-4 md:w-4",
                    i < (candidate.price_level || 0)
                      ? "text-lime-green"
                      : "text-white/30"
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* Cuisines - limited to prevent overflow */}
        {candidate.cuisines && candidate.cuisines.length > 0 && (
          <div className="flex flex-wrap gap-1 md:gap-2 overflow-hidden" style={{ maxHeight: '60px' }}>
            {candidate.cuisines.slice(0, 3).map((cuisine, i) => (
              <span
                key={i}
                className="px-2 md:px-3 py-1 bg-gradient-electric text-white text-xs rounded-full font-semibold whitespace-nowrap"
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