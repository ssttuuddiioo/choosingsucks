'use client'

import React, { useState, useRef, useMemo, useEffect } from 'react'
import TinderCard from 'react-tinder-card'
import { X, Heart } from 'lucide-react'
import type { Tables } from '@/types/supabase'

interface SwipeInterfaceTemplateProps {
  candidates: Tables<'candidates'>[]
  onSwipe: (candidateId: string, vote: boolean) => void
  renderCard: (candidate: Tables<'candidates'>) => React.ReactNode
  categoryName: string
}

export default function SwipeInterfaceTemplate({ 
  candidates, 
  onSwipe, 
  renderCard,
  categoryName 
}: SwipeInterfaceTemplateProps) {
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
      childRefs[currentIndex].current?.swipe(direction)
      // handleSwipe will be called by TinderCard's onSwipe callback
    }
  }

  if (candidates.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 bg-gradient-primary">
        <div className="text-center space-y-4">
          <div className="text-6xl">🤔</div>
          <h2 className="text-2xl font-bold text-white">Loading options...</h2>
          <p className="text-white/70">Hang tight while we find great choices</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex-1 flex flex-col bg-gradient-primary relative">
      {/* Card Stack */}
      <div 
        className="flex-1 flex items-center justify-center relative"
        style={{ paddingBottom: `${bottomBarHeight + 16}px` }}
      >
        <div className="relative w-full h-full max-w-md mx-auto px-4">
          {candidates.map((candidate, index) => {
            const isVisible = index >= currentIndex - 1 && index <= currentIndex
            
            return (
              <TinderCard
                ref={childRefs[index]}
                key={candidate.id}
                onSwipe={(direction) => handleSwipe(direction, candidate.id, index)}
                preventSwipe={['up', 'down']}
                swipeRequirementType="position"
                swipeThreshold={80}
                className={`absolute inset-0 ${!isVisible ? 'pointer-events-none' : ''}`}
              >
                <div 
                  className="w-full h-full"
                  style={{
                    opacity: index === currentIndex ? 1 : 0.5,
                    scale: index === currentIndex ? 1 : 0.95,
                    zIndex: index === currentIndex ? 10 : index === currentIndex - 1 ? 5 : 0,
                    transition: 'opacity 0.3s, scale 0.3s',
                  }}
                >
                  {renderCard(candidate)}
                </div>
              </TinderCard>
            )
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div
        ref={buttonsRef}
        className="flex-shrink-0 flex items-center justify-center gap-6 p-6 pb-8 bg-gradient-primary/95 backdrop-blur border-t border-white/10 relative z-20"
        style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={() => swipe('left')}
          disabled={isAnimating}
          className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all active:scale-90 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-xl border border-white/20"
        >
          <X className="h-8 w-8 text-red-400" />
        </button>
        
        <button
          onClick={() => swipe('right')}
          disabled={isAnimating}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-hot-pink to-electric-purple hover:scale-110 transition-all active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl"
        >
          <Heart className="h-10 w-10 text-white fill-current" />
        </button>
      </div>
    </div>
  )
}

