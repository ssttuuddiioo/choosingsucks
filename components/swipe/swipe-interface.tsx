'use client'

import React, { useState, useRef, useMemo, useEffect } from 'react'
import TinderCard from 'react-tinder-card'
import { useRouter } from 'next/navigation'
import { X, Heart, Star, DollarSign, Plus } from 'lucide-react'
import type { Tables } from '@/types/supabase'
import { cn } from '@/lib/utils/cn'
import { env } from '@/lib/utils/env'

interface SwipeInterfaceProps {
  candidates: Tables<'candidates'>[]
  onSwipe: (candidateId: string, vote: boolean) => void
}

export default function SwipeInterface({ candidates, onSwipe }: SwipeInterfaceProps) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(candidates.length - 1)
  const [isAnimating, setIsAnimating] = useState(false)
  const buttonsRef = useRef<HTMLDivElement | null>(null)
  const [bottomBarHeight, setBottomBarHeight] = useState<number>(0)

  // Create refs for programmatic swiping (button clicks)
  const childRefs = useMemo(
    () => Array(candidates.length).fill(0).map(() => React.createRef<any>()),
    [candidates.length]
  )

  // Prevent body scrolling on mobile
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.body.style.height = '100%'
    
    return () => {
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

  // Update currentIndex when candidates change
  useEffect(() => {
    setCurrentIndex(candidates.length - 1)
  }, [candidates.length])

  const handleSwipe = async (direction: string, candidateId: string, index: number) => {
    if (isAnimating) return
    
    setIsAnimating(true)
    const vote = direction === 'right'

    // Haptic feedback for mobile devices
    if ('vibrate' in navigator) {
      navigator.vibrate(vote ? [50] : [30, 30, 30])
    }

    // Call the onSwipe callback (handles DB insert and match checking)
    onSwipe(candidateId, vote)

    setCurrentIndex(index - 1)
    
    // Reset animation lock
    setTimeout(() => {
      setIsAnimating(false)
    }, 300)
  }

  const swipe = (direction: 'left' | 'right') => {
    if (currentIndex >= 0 && currentIndex < candidates.length && !isAnimating) {
      const candidate = candidates[currentIndex]
      childRefs[currentIndex].current?.swipe(direction)
      // handleSwipe will be called by TinderCard's onSwipe callback
    }
  }

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
      {/* Card Stack */}
      <div 
        className="flex-1 relative overflow-hidden p-2 md:p-4"
        style={{ 
          paddingBottom: bottomBarHeight ? bottomBarHeight + 16 : 80
        }}
      >
        <div className="h-full relative max-w-md mx-auto" style={{ minHeight: '400px' }}>
          {candidates.map((candidate, index) => (
            <TinderCard
              ref={childRefs[index]}
              key={candidate.id}
              onSwipe={(dir) => handleSwipe(dir, candidate.id, index)}
              preventSwipe={['up', 'down']}
              swipeRequirementType="position"
              swipeThreshold={150}
              className="absolute inset-0"
            >
              <div 
                className="h-full w-full"
                style={{
                  zIndex: candidates.length - index,
                  transform: index === currentIndex 
                    ? 'scale(1) translateY(0)' 
                    : index === currentIndex - 1
                    ? 'scale(0.92) translateY(10px)'
                    : index === currentIndex - 2
                    ? 'scale(0.85) translateY(20px)'
                    : 'scale(0.85) translateY(20px)',
                  opacity: index === currentIndex 
                    ? 1 
                    : index === currentIndex - 1
                    ? 0.25
                    : index === currentIndex - 2
                    ? 0.12
                    : 0,
                  filter: index === currentIndex 
                    ? 'none' 
                    : index === currentIndex - 1
                    ? 'blur(1px)'
                    : 'blur(2px)',
                  transition: 'transform 0.2s ease-out, opacity 0.2s ease-out, filter 0.2s ease-out',
                  pointerEvents: index === currentIndex ? 'auto' : 'none',
                }}
              >
                <CandidateCard candidate={candidate} />
              </div>
            </TinderCard>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div
        ref={buttonsRef}
        className="sticky bottom-0 left-0 right-0 z-20 max-w-md mx-auto w-full flex-shrink-0 bg-gradient-primary/95 backdrop-blur p-4 pt-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <div className="flex gap-3">
          <button
            onClick={() => swipe('left')}
            disabled={isAnimating || currentIndex < 0}
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
            onClick={() => swipe('right')}
            disabled={isAnimating || currentIndex < 0}
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

interface CandidateCardProps {
  candidate: Tables<'candidates'>
}

function CandidateCard({ candidate }: CandidateCardProps) {
  const [imageError, setImageError] = useState(false)
  
  // Reset image error state when candidate changes
  useEffect(() => {
    setImageError(false)
  }, [candidate.id])

  // Determine content type and render accordingly
  if (candidate.category === 'build-your-own' || candidate.content_type === 'custom_option') {
    return <CustomOptionCard candidate={candidate} />
  } else if (candidate.category === 'streaming') {
    return <StreamingCard candidate={candidate} />
  } else {
    // Default to restaurant card
    return <RestaurantCard candidate={candidate} imageError={imageError} setImageError={setImageError} />
  }
}

// Custom Option Card for Build Your Own
function CustomOptionCard({ candidate }: { candidate: Tables<'candidates'> }) {
  return (
    <div className="h-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
      {/* Main content area */}
      <div className="flex-1 relative bg-gradient-mesh animate-gradient flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-3xl md:text-4xl font-outfit font-bold text-white/90 leading-tight">
            {candidate.name}
          </div>
        </div>
      </div>

      {/* Info section */}
      <div className="flex-shrink-0 p-4 md:p-6 space-y-3" style={{ minHeight: '140px', maxHeight: '180px' }}>
        {candidate.description && (
          <p className="text-sm text-gray-600 line-clamp-4 leading-relaxed">
            {candidate.description}
          </p>
        )}
      </div>
    </div>
  )
}

// Streaming Card
function StreamingCard({ candidate }: { candidate: Tables<'candidates'> }) {
  const [imageError, setImageError] = useState(false)
  const posterUrl = candidate.poster || candidate.image_url
  
  return (
    <div className="h-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
      {/* Poster/Image */}
      <div className="relative bg-gradient-to-br from-electric-purple/20 to-hot-pink/20" style={{ flex: '1 1 0', minHeight: '200px', maxHeight: 'calc(100% - 180px)' }}>
        {posterUrl && !imageError ? (
          <>
            <img
              src={posterUrl}
              alt={candidate.title || candidate.name}
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-mesh animate-gradient">
            <div className="text-center">
              <div className="text-8xl font-outfit font-bold text-white/20">
                {(candidate.title || candidate.name)?.charAt(0)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-shrink-0 p-4 md:p-6 space-y-3" style={{ minHeight: '140px', maxHeight: '180px' }}>
        <h2 className="text-xl md:text-2xl font-outfit font-bold text-gray-900 line-clamp-2">
          {candidate.title || candidate.name}
        </h2>

        <div className="flex items-center gap-3 text-sm">
          {candidate.year && (
            <div className="bg-gray-200 px-2 md:px-3 py-1 rounded-full">
              <span className="font-bold text-gray-900 text-xs md:text-sm">{candidate.year}</span>
            </div>
          )}
          
          {candidate.user_rating && (
            <div className="flex items-center gap-1 bg-gray-200 px-2 md:px-3 py-1 rounded-full">
              <Star className="h-3 w-3 md:h-4 md:w-4 text-yellow-500 fill-current" />
              <span className="font-bold text-gray-900 text-xs md:text-sm">{candidate.user_rating}</span>
            </div>
          )}
        </div>

        {candidate.genre_names && candidate.genre_names.length > 0 && (
          <div className="flex flex-wrap gap-1 md:gap-2 overflow-hidden" style={{ maxHeight: '60px' }}>
            {candidate.genre_names.slice(0, 3).map((genre, i) => (
              <span
                key={i}
                className="px-2 md:px-3 py-1 bg-gradient-electric text-white text-xs rounded-full font-semibold whitespace-nowrap"
              >
                {genre}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Restaurant Card
function RestaurantCard({ candidate, imageError, setImageError }: {
  candidate: Tables<'candidates'>
  imageError: boolean
  setImageError: (error: boolean) => void
}) {
  const photoUrl = candidate.photo_ref ? getPhotoUrl(candidate.photo_ref) : null
  
  return (
    <div className="h-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
      {/* Image */}
      <div className="relative bg-gradient-to-br from-electric-purple/20 to-hot-pink/20" style={{ flex: '1 1 0', minHeight: '200px', maxHeight: 'calc(100% - 180px)' }}>
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

      {/* Info */}
      <div className="flex-shrink-0 p-4 md:p-6 space-y-3" style={{ minHeight: '140px', maxHeight: '180px' }}>
        <h2 className="text-xl md:text-2xl font-outfit font-bold text-gray-900 line-clamp-2">
          {candidate.name}
        </h2>

        <div className="flex items-center gap-3 text-sm">
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