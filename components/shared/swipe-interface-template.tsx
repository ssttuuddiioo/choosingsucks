'use client'

import React, { useState, useRef, useMemo, useEffect } from 'react'
import TinderCard from 'react-tinder-card'
import { X, Heart } from 'lucide-react'
import type { Tables } from '@/types/supabase'
import LearnMoreModal from './learn-more-modal'
import CardLoader from '@/components/ui/card-loader'

interface SwipeInterfaceTemplateProps {
  candidates: Tables<'candidates'>[]
  onSwipe: (candidateId: string, vote: boolean, durationMs: number) => void
  renderCard: (candidate: Tables<'candidates'>, onLearnMore?: () => void) => React.ReactNode
  categoryName: string
  contextDescription?: string
}

export default function SwipeInterfaceTemplate({ 
  candidates, 
  onSwipe, 
  renderCard,
  categoryName,
  contextDescription
}: SwipeInterfaceTemplateProps) {
  const [currentIndex, setCurrentIndex] = useState(candidates.length - 1)
  const [isAnimating, setIsAnimating] = useState(false)
  const buttonsRef = useRef<HTMLDivElement | null>(null)
  const [bottomBarHeight, setBottomBarHeight] = useState<number>(0)
  const [showLearnMore, setShowLearnMore] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<Tables<'candidates'> | null>(null)
  const cardShownAtRef = useRef<number>(Date.now())

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

  // Reset card shown timer when current card changes
  useEffect(() => {
    cardShownAtRef.current = Date.now()
  }, [currentIndex])

  const handleSwipe = async (direction: string, candidateId: string, index: number) => {
    if (isAnimating) return
    
    setIsAnimating(true)
    const vote = direction === 'right'

    // Haptic feedback for mobile devices
    if ('vibrate' in navigator) {
      navigator.vibrate(vote ? [50] : [30, 30, 30])
    }

    // Call the onSwipe callback (handles DB insert and match checking)
    const durationMs = Date.now() - cardShownAtRef.current
    onSwipe(candidateId, vote, durationMs)

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
      <div className="h-screen flex flex-col items-center justify-center p-6 bg-warm-cream">
        <CardLoader message="Finding great choices..." />
      </div>
    )
  }

  return (
    <div className="h-full flex-1 flex flex-col bg-warm-cream relative overflow-hidden">
      {/* Card Stack - Fills available space */}
      <div 
        className="flex-1 flex items-center justify-center relative min-h-0"
        style={{ paddingBottom: `${bottomBarHeight}px` }}
      >
        <div className="relative w-full h-full max-w-md mx-auto px-3 sm:px-4 py-2 sm:py-4">
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
                  className="w-full h-full relative"
                  style={{
                    opacity: index === currentIndex ? 1 : 0.5,
                    scale: index === currentIndex ? 1 : 0.95,
                    zIndex: index === currentIndex ? 10 : index === currentIndex - 1 ? 5 : 0,
                    transition: 'opacity 0.3s, scale 0.3s',
                  }}
                >
                  {renderCard(
                    candidate,
                    index === currentIndex ? () => {
                      setSelectedCandidate(candidate)
                      setShowLearnMore(true)
                    } : undefined
                  )}
                </div>
              </TinderCard>
            )
          })}
        </div>
      </div>

      {/* Action Buttons - Fixed at bottom with safe area */}
      <div
        ref={buttonsRef}
        className="sticky bottom-0 left-0 right-0 z-20 max-w-md mx-auto w-full flex-shrink-0 bg-warm-cream/95 backdrop-blur p-4 pt-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <div className="flex gap-3">
          <button
            onClick={() => swipe('left')}
            disabled={isAnimating}
            aria-label="Reject this option"
            className="flex-1 flex items-center justify-center gap-3 py-4 px-6 font-bold text-xl bg-warm-gray200 text-warm-gray700 rounded-2xl transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 shadow-sm focus:outline-none"
          >
            <X className="h-6 w-6" />
            NAH
          </button>
          
          <button
            onClick={() => swipe('right')}
            disabled={isAnimating}
            aria-label="Like this option"
            className="flex-1 bg-coral text-white font-bold text-xl py-4 px-6 rounded-2xl shadow-md transform transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 focus:outline-none"
          >
            YEA
            <Heart className="h-6 w-6 fill-current" />
          </button>
        </div>
      </div>

      {/* Learn More Modal */}
      {selectedCandidate && (
        <LearnMoreModal
          candidate={selectedCandidate}
          category={categoryName as 'restaurants' | 'streaming' | 'build-your-own'}
          isOpen={showLearnMore}
          onClose={() => {
            setShowLearnMore(false)
            setSelectedCandidate(null)
          }}
          contextDescription={contextDescription}
        />
      )}
    </div>
  )
}

