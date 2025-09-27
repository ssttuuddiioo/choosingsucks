'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { useDrag } from '@use-gesture/react'
import { useRouter } from 'next/navigation'
import { X, Heart, Star, Clock, Calendar, Play, Clipboard, Check } from 'lucide-react'
import { PiHandFistLight, PiHandPeaceLight } from 'react-icons/pi'
import { LiaHandPaper } from 'react-icons/lia'
import CardLoader from '@/components/ui/card-loader'
import { cn } from '@/lib/utils/cn'
import type { Tables } from '@/types/supabase'

type Candidate = Tables<'candidates'>

interface StreamingSwipeInterfaceProps {
  candidates: Candidate[]
  onSwipe: (candidateId: string, vote: boolean) => void
}

export default function StreamingSwipeInterface({ candidates, onSwipe }: StreamingSwipeInterfaceProps) {
  const router = useRouter()
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set())
  const [isAnimating, setIsAnimating] = useState(false)
  const [animatingCardId, setAnimatingCardId] = useState<string | null>(null)
  const buttonsRef = useRef<HTMLDivElement | null>(null)
  const [bottomBarHeight, setBottomBarHeight] = useState<number>(0)
  const [copied, setCopied] = useState(false)

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

  // Calculate card candidates (parent is the source of truth)
  const hasCandidates = candidates.length > 0
  const currentCandidate = hasCandidates ? candidates[0] : undefined
  const nextCandidate = hasCandidates ? candidates[1] : undefined
  const nextNextCandidate = hasCandidates ? candidates[2] : undefined
  
  // Motion values for smooth animations
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-25, 25])
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0])
  const scale = useTransform(x, [-150, 0, 150], [0.95, 1, 0.95])

  // Preload next images based on current/next candidates
  useEffect(() => {
    const imagesToPreload = [currentCandidate, nextCandidate, nextNextCandidate].filter(Boolean)
    imagesToPreload.forEach(candidate => {
      const imageUrl = candidate?.poster || candidate?.image_url
      if (imageUrl && !preloadedImages.has(imageUrl)) {
        const img = new Image()
        img.src = imageUrl
        img.onload = () => {
          setPreloadedImages(prev => new Set(Array.from(prev).concat(imageUrl)))
        }
      }
    })
  }, [currentCandidate?.id, nextCandidate?.id, nextNextCandidate?.id, preloadedImages])

  const handleSwipeComplete = (vote: boolean) => {
    if (!currentCandidate || isAnimating) return
    
    // Prevent double-swiping the same card
    if (animatingCardId === currentCandidate.id.toString()) return
    
    setIsAnimating(true)
    setAnimatingCardId(currentCandidate.id.toString())
    
    // Haptic feedback for mobile devices
    if ('vibrate' in navigator) {
      navigator.vibrate(vote ? [50] : [30, 30, 30])
    }
    
    onSwipe(currentCandidate.id.toString(), vote)
    
    // Reset local animation state after exit duration
    setTimeout(() => {
      setAnimatingCardId(null)
      x.set(0) // Reset position for next card
      setIsAnimating(false)
    }, 150) // Reduced from 300ms to 150ms
  }

  const handleButtonSwipe = (vote: boolean) => {
    if (!currentCandidate || isAnimating) return
    
    // Animate to final position first (same as gesture swipe)
    x.set(vote ? 400 : -400)
    
    // Then complete the swipe
    handleSwipeComplete(vote)
  }

  const handleShare = async () => {
    const shareUrl = window.location.href
    
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
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

  // When no more candidates, let parent component handle the exhausted state
  if (candidates.length === 0) {
    return null // Parent will show ExhaustedScreenTemplate
  }

  if (!hasCandidates) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <CardLoader message="Shuffling cards..." />
      </div>
    )
  }

  return (
    <div className="h-screen bg-gradient-primary flex flex-col" style={{ height: '100dvh' }}>
      {/* Header - matching restaurant style */}
      <div className="bg-black/20 backdrop-blur-md border-0 rounded-none px-4 py-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base">Streaming Session</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-gradient-orange text-white px-3 py-2 rounded-full font-bold text-sm">
                {candidates.length}
              </div>
              
              <button
                onClick={handleShare}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all transform hover:scale-110 active:scale-95"
                title="Copy session link"
              >
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.div
                      key="copied"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <Check className="h-5 w-5 text-lime-green" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="clipboard"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <Clipboard className="h-5 w-5 text-white" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
              
            </div>
          </div>
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
                className="absolute inset-0 scale-95 opacity-15"
                style={{ zIndex: 1 }}
              />
            )}
            
            {nextCandidate && (
              <StreamingCard
                key={`${nextCandidate.id}-bg1`}
                candidate={nextCandidate}
                className="absolute inset-0 scale-98 opacity-25"
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
                animate={animatingCardId === currentCandidate.id.toString() ? {
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
  candidate: Candidate
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
    <div className={cn("h-full bg-white overflow-hidden flex flex-col relative rounded-2xl shadow-2xl", className)} style={style}>
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
        {(candidate.poster || candidate.image_url) && !imageError ? (
          <>
            <img
              src={candidate.backdrop || candidate.poster || candidate.image_url || ''}
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
                {(candidate.title || candidate.name || '?').charAt(0)}
              </div>
            </div>
          </div>
        )}

        {/* Type Badge */}
        <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-bold">
          {candidate.content_type === 'tv_series' ? 'TV Series' : 
           candidate.content_type === 'tv_miniseries' ? 'Limited Series' :
           candidate.content_type === 'tv_special' ? 'TV Special' : 'Movie'}
        </div>

        {/* Rating */}
        {candidate.user_rating && (
          <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            {Number(candidate.user_rating).toFixed(1)}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="flex-shrink-0 p-6 space-y-3">
        <div>
          <h1 className="text-gray-900 text-2xl font-bold leading-tight mb-2">
            {candidate.title || candidate.name}
          </h1>
          
          <div className="flex items-center gap-4 text-gray-600 text-sm mb-3">
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
              <div className="bg-gray-200 px-2 py-1 rounded text-xs font-bold text-gray-700">
                {candidate.us_rating}
              </div>
            )}
          </div>

          {/* Genres */}
          {candidate.genre_names && candidate.genre_names.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {candidate.genre_names.slice(0, 3).map((genre: string) => (
                <span
                  key={genre}
                  className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* Plot */}
          {(candidate.plot_overview || candidate.description) && (
            <p className="text-gray-700 text-sm leading-relaxed line-clamp-3">
              {candidate.plot_overview || candidate.description}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
