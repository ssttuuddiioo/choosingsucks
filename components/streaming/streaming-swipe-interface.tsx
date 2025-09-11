'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { useDrag } from '@use-gesture/react'
import { useRouter } from 'next/navigation'
import { X, Heart, Star, Clock, Calendar, Play } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface StreamingCandidate {
  id: number
  title: string
  original_title: string
  type: 'movie' | 'tv_series'
  year: number
  runtime_minutes?: number
  plot_overview: string
  genre_names: string[]
  user_rating: number
  critic_score?: number
  poster: string
  posterLarge?: string
  backdrop?: string
  trailer?: string
  us_rating?: string
  sources: any[]
  session_id: string
}

interface StreamingSwipeInterfaceProps {
  candidates: StreamingCandidate[]
  onSwipe: (candidateId: number, vote: boolean) => void
}

export default function StreamingSwipeInterface({ candidates, onSwipe }: StreamingSwipeInterfaceProps) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set())
  const [isAnimating, setIsAnimating] = useState(false)
  const [animatingCardId, setAnimatingCardId] = useState<number | null>(null)
  const buttonsRef = useRef<HTMLDivElement | null>(null)
  const [bottomBarHeight, setBottomBarHeight] = useState<number>(0)

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

  // Reset indices whenever the filtered candidates list changes length
  useEffect(() => {
    setCurrentIndex(0)
    setAnimatingCardId(null)
    x.set(0)
  }, [candidates.length])

  // Calculate card candidates
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
      if (candidate?.poster && !preloadedImages.has(candidate.poster)) {
        const img = new Image()
        img.src = candidate.poster
        img.onload = () => {
          setPreloadedImages(prev => new Set(Array.from(prev).concat(candidate.poster)))
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
      
      if (tap || !currentCandidate) return
      
      // Disable swipe during animation
      if (isAnimating) {
        cancel?.()
        return
      }
      
      if (active) {
        x.set(mx)
      } else {
        // Determine if we should swipe based on distance and velocity
        const shouldSwipe = Math.abs(mx) > 100 || Math.abs(vx) > 0.5
        
        if (shouldSwipe) {
          const direction = xDir > 0
          handleSwipeComplete(direction)
        } else {
          // Snap back to center
          x.set(0)
        }
      }
    },
    {
      axis: 'x',
      bounds: { left: -400, right: 400 },
      rubberband: true,
    }
  )

  const formatRuntime = (minutes?: number) => {
    if (!minutes) return null
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}m`
    return `${hours}h ${mins}m`
  }

  // Show exhausted screen when no more candidates
  if (currentIndex >= candidates.length) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-6xl">🤔</div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">No matches found!</h1>
            <p className="text-white/70">
              Nobody agreed on the same show or movie. Let's settle this!
            </p>
          </div>

          {/* Quick RPS Game Options */}
          <div className="space-y-4">
            <p className="text-white/80 font-semibold">Let's decide with a quick game:</p>
            
            <div className="grid grid-cols-3 gap-3">
              <motion.button
                className="aspect-square bg-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white/20 transition-all duration-300 hover:scale-105"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  // TODO: Navigate to RPS game with 'rock' choice
                  console.log('Starting RPS game with Rock')
                }}
              >
                <div className="text-4xl">🪨</div>
                <span className="text-white font-bold text-sm">Rock</span>
              </motion.button>

              <motion.button
                className="aspect-square bg-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white/20 transition-all duration-300 hover:scale-105"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  // TODO: Navigate to RPS game with 'paper' choice
                  console.log('Starting RPS game with Paper')
                }}
              >
                <div className="text-4xl">📄</div>
                <span className="text-white font-bold text-sm">Paper</span>
              </motion.button>

              <motion.button
                className="aspect-square bg-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white/20 transition-all duration-300 hover:scale-105"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  // TODO: Navigate to RPS game with 'scissors' choice
                  console.log('Starting RPS game with Scissors')
                }}
              >
                <div className="text-4xl">✂️</div>
                <span className="text-white font-bold text-sm">Scissors</span>
              </motion.button>
            </div>
          </div>

          {/* Alternative Options */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <button
              onClick={() => router.push('/streaming')}
              className="w-full bg-gradient-electric text-white py-3 rounded-xl font-bold hover:scale-105 transition-transform"
            >
              Try Different Preferences
            </button>
            
            <button
              onClick={() => {
                // TODO: Create a broader swipe session with relaxed filters
                console.log('Creating broader swipe session')
                router.push('/streaming')
              }}
              className="w-full bg-white/20 text-white py-3 rounded-xl font-bold hover:bg-white/30 transition-colors"
            >
              Create Swipe Session Instead
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!hasCandidates) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/70">Shuffling cards...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gradient-primary flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 flex justify-between items-center">
        <button
          onClick={() => router.push('/streaming')}
          className="text-white/70 hover:text-white transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
        <div className="text-white/70 text-sm">
          {currentIndex + 1} of {candidates.length}
        </div>
      </div>

      {/* Cards Container */}
      <div 
        className="flex-1 relative overflow-hidden px-4"
        style={{ 
          paddingBottom: `${bottomBarHeight + 16}px`,
          minHeight: 0
        }}
      >
        <div className="h-full max-w-md mx-auto relative">
          <AnimatePresence mode="wait">
            {/* Background cards for depth */}
            {nextNextCandidate && (
              <StreamingCard
                key={`${nextNextCandidate.id}-bg2`}
                candidate={nextNextCandidate}
                className="absolute inset-0 scale-95 opacity-30"
                style={{ zIndex: 1 }}
              />
            )}
            
            {nextCandidate && (
              <StreamingCard
                key={`${nextCandidate.id}-bg1`}
                candidate={nextCandidate}
                className="absolute inset-0 scale-98 opacity-60"
                style={{ zIndex: 2 }}
              />
            )}

            {/* Current card */}
            {currentCandidate && (
              <motion.div
                key={currentCandidate.id}
                className="absolute inset-0"
                style={{ 
                  x,
                  rotate,
                  opacity,
                  scale,
                  zIndex: 3
                }}
                {...bind() as any}
                animate={animatingCardId === currentCandidate.id ? {
                  x: 0,
                  rotate: 0,
                  opacity: 1,
                  scale: 1,
                } : {}}
                exit={{
                  x: x.get() > 0 ? 400 : -400,
                  opacity: 0,
                  transition: { duration: 0.3 }
                }}
              >
                <StreamingCard candidate={currentCandidate} dragX={x} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Action Buttons - identical to restaurant version */}
      <div
        ref={buttonsRef}
        className="sticky bottom-0 left-0 right-0 z-20 max-w-md mx-auto w-full flex-shrink-0 bg-gradient-primary/95 backdrop-blur p-4 pt-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <div className="flex gap-3">
          <button
            onClick={() => handleButtonSwipe(false)}
            disabled={isAnimating}
            aria-label="Reject this title"
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
            aria-label="Like this title"
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

interface StreamingCardProps {
  candidate: StreamingCandidate
  dragX?: any
  className?: string
  style?: React.CSSProperties
}

function StreamingCard({ candidate, dragX, className, style }: StreamingCardProps) {
  const [imageError, setImageError] = useState(false)

  const formatRuntime = (minutes?: number) => {
    if (!minutes) return null
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}m`
    return `${hours}h ${mins}m`
  }

  // Drag feedback overlays (identical to restaurant version)
  const fallbackX = useMotionValue(0)
  const likeOpacity = useTransform(dragX || fallbackX, [0, 150], [0, 0.8])
  const nopeOpacity = useTransform(dragX || fallbackX, [-150, 0], [0.8, 0])

  return (
    <div className={cn("h-full glass-card overflow-hidden flex flex-col relative", className)} style={style}>
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

      {/* Poster Image */}
      <div 
        className="relative bg-gradient-to-br from-electric-purple/20 to-hot-pink/20"
        style={{ 
          flex: '1 1 0',
          minHeight: '300px',
          maxHeight: 'calc(100% - 200px)'
        }}
      >
        {candidate.poster && !imageError ? (
          <>
            <img
              src={candidate.posterLarge || candidate.poster}
              alt={candidate.title}
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-mesh animate-gradient">
            <div className="text-center">
              <div className="text-8xl font-outfit font-bold text-white/20">
                {candidate.title.charAt(0)}
              </div>
            </div>
          </div>
        )}

        {/* Type Badge */}
        <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-bold">
          {candidate.type === 'tv_series' ? 'TV Series' : 'Movie'}
        </div>

        {/* Rating */}
        {candidate.user_rating && (
          <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            {candidate.user_rating.toFixed(1)}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="flex-shrink-0 p-6 space-y-3 bg-gradient-to-t from-black/90 to-transparent">
        <div>
          <h1 className="text-white text-2xl font-bold leading-tight mb-2">
            {candidate.title}
          </h1>
          
          <div className="flex items-center gap-4 text-white/70 text-sm mb-3">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {candidate.year}
            </div>
            
            {candidate.runtime_minutes && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatRuntime(candidate.runtime_minutes)}
              </div>
            )}

            {candidate.us_rating && (
              <div className="bg-white/20 px-2 py-1 rounded text-xs font-bold">
                {candidate.us_rating}
              </div>
            )}
          </div>

          {/* Genres */}
          {candidate.genre_names.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {candidate.genre_names.slice(0, 3).map((genre) => (
                <span
                  key={genre}
                  className="bg-white/20 text-white px-3 py-1 rounded-full text-sm"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* Plot */}
          {candidate.plot_overview && (
            <p className="text-white/80 text-sm leading-relaxed line-clamp-3">
              {candidate.plot_overview}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
