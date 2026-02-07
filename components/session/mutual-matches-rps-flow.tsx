'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Navigation, Tv, Trophy, Sparkles } from 'lucide-react'
import GenericRockPaperScissors from '@/components/shared/rock-paper-scissors-template'
import { useRealtime } from '@/lib/hooks/use-realtime'
import { createBrowserClient } from '@/lib/utils/supabase-client'
import { env } from '@/lib/utils/env'
import type { Tables } from '@/types/supabase'
import Lottie from 'lottie-react'
import confettiAnimation from '@/lib/animations/confetti.json'

type Phase = 'show-matches' | 'rps' | 'winner-picks' | 'final-reveal'

interface MutualMatchesRPSFlowProps {
  session: Tables<'sessions'>
  participant: Tables<'participants'>
  mutualMatches: Tables<'candidates'>[]
  category: string
  onComplete: (chosen: Tables<'candidates'>) => void
}

export default function MutualMatchesRPSFlow({
  session,
  participant,
  mutualMatches,
  category,
  onComplete,
}: MutualMatchesRPSFlowProps) {
  const [phase, setPhase] = useState<Phase>('show-matches')
  const [readyForRps, setReadyForRps] = useState(false)
  const [otherReady, setOtherReady] = useState(false)
  const [winnerId, setWinnerId] = useState<string | null>(null)
  const [chosenCandidate, setChosenCandidate] = useState<Tables<'candidates'> | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  const supabase = createBrowserClient()

  const handleMessage = useCallback((payload: any) => {
    if (payload.event === 'ready_for_rps') {
      if (payload.payload.participantId !== participant.id) {
        setOtherReady(true)
      }
    } else if (payload.event === 'winner_chose') {
      const chosen = mutualMatches.find(m => m.id === payload.payload.candidateId)
      if (chosen) {
        setChosenCandidate(chosen)
        setPhase('final-reveal')
      }
    }
  }, [participant.id, mutualMatches])

  const { broadcast } = useRealtime({
    channel: `mutual:${session.id}`,
    onMessage: handleMessage,
  })

  // Transition to RPS when both are ready
  useEffect(() => {
    if (readyForRps && otherReady) {
      setPhase('rps')
    }
  }, [readyForRps, otherReady])

  // Fire confetti on final reveal
  useEffect(() => {
    if (phase === 'final-reveal') {
      setShowConfetti(true)
      const timer = setTimeout(() => setShowConfetti(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [phase])

  const handleReady = () => {
    setReadyForRps(true)
    broadcast('ready_for_rps', { participantId: participant.id })
  }

  const handleGameFinished = (id: string) => {
    setWinnerId(id)
    setPhase('winner-picks')
  }

  const handleWinnerChoice = async (candidate: Tables<'candidates'>) => {
    setChosenCandidate(candidate)
    setPhase('final-reveal')

    // Update session match
    await (supabase as any)
      .from('sessions')
      .update({
        status: 'matched',
        match_place_id: candidate.place_id,
      })
      .eq('id', session.id)

    broadcast('winner_chose', { candidateId: candidate.id })
    onComplete(candidate)
  }

  const getPhotoUrl = (photoRef: string): string => {
    const apiKey = env.google.mapsApiKey
    if (!apiKey) return ''
    if (photoRef.startsWith('places/')) {
      return `https://places.googleapis.com/v1/${photoRef}/media?maxWidthPx=400&key=${apiKey}`
    }
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoRef}&key=${apiKey}`
  }

  const isWinner = winnerId === participant.id

  // Phase: Show mutual matches
  if (phase === 'show-matches') {
    return (
      <div className="min-h-screen bg-warm-cream" style={{ minHeight: '100dvh' }}>
        <div className="max-w-md mx-auto px-4 py-8 pb-24">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <Sparkles className="w-10 h-10 text-coral mx-auto mb-2" />
            <h1 className="text-2xl font-outfit font-bold text-warm-black">
              You both liked these!
            </h1>
            <p className="text-warm-gray500 mt-1">
              {mutualMatches.length} mutual match{mutualMatches.length !== 1 ? 'es' : ''}
            </p>
          </motion.div>

          <div className="space-y-3">
            {mutualMatches.map((candidate, index) => (
              <motion.div
                key={candidate.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className="bg-white rounded-xl shadow-sm border border-warm-gray100 overflow-hidden flex"
              >
                <div className="w-16 h-16 flex-shrink-0 bg-warm-bg">
                  {candidate.photo_ref ? (
                    <img
                      src={getPhotoUrl(candidate.photo_ref)}
                      alt={candidate.name || ''}
                      className="w-full h-full object-cover"
                    />
                  ) : candidate.image_url ? (
                    <img
                      src={candidate.image_url}
                      alt={candidate.name || ''}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-warm-gray300">
                      {category === 'streaming' ? <Tv className="w-4 h-4" /> : <span className="text-lg font-bold">{(candidate.name || '?').charAt(0)}</span>}
                    </div>
                  )}
                </div>
                <div className="flex-1 p-2.5 min-w-0 flex items-center">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-warm-black text-sm leading-tight truncate">
                      {candidate.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {candidate.rating && (
                        <div className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          <span className="text-xs text-warm-gray700">{candidate.rating}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div
          className="fixed bottom-0 left-0 right-0 bg-warm-cream border-t border-warm-gray100 p-4"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
        >
          <div className="max-w-md mx-auto">
            <button
              onClick={handleReady}
              disabled={readyForRps}
              className="w-full btn-warm text-lg py-3 disabled:opacity-50"
            >
              {readyForRps && !otherReady
                ? 'Waiting for the other person...'
                : "Let's settle this!"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Phase: RPS game
  if (phase === 'rps') {
    return (
      <GenericRockPaperScissors
        session={session}
        participant={participant}
        category={category as any}
        onGameFinished={handleGameFinished}
        hideFinishScreen
      />
    )
  }

  // Phase: Winner picks
  if (phase === 'winner-picks') {
    if (isWinner) {
      return (
        <div className="min-h-screen bg-warm-cream" style={{ minHeight: '100dvh' }}>
          <div className="max-w-md mx-auto px-4 py-8">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-6"
            >
              <Trophy className="w-10 h-10 text-yellow-400 mx-auto mb-2" />
              <h1 className="text-2xl font-outfit font-bold text-warm-black">
                You won!
              </h1>
              <p className="text-warm-gray500 mt-1">
                Pick where you're going
              </p>
            </motion.div>

            <div className="space-y-3">
              {mutualMatches.map((candidate, index) => (
                <motion.button
                  key={candidate.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  onClick={() => handleWinnerChoice(candidate)}
                  className="w-full bg-white rounded-xl shadow-sm border border-warm-gray100 overflow-hidden flex hover:border-coral/40 hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <div className="w-20 h-20 flex-shrink-0 bg-warm-bg">
                    {candidate.photo_ref ? (
                      <img
                        src={getPhotoUrl(candidate.photo_ref)}
                        alt={candidate.name || ''}
                        className="w-full h-full object-cover"
                      />
                    ) : candidate.image_url ? (
                      <img
                        src={candidate.image_url}
                        alt={candidate.name || ''}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-warm-gray300">
                        {category === 'streaming' ? <Tv className="w-6 h-6" /> : <span className="text-2xl font-bold">{(candidate.name || '?').charAt(0)}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-3 min-w-0 text-left">
                    <h3 className="font-semibold text-warm-black text-base leading-tight truncate">
                      {candidate.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {candidate.rating && (
                        <div className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          <span className="text-xs text-warm-gray700">{candidate.rating}</span>
                        </div>
                      )}
                      {candidate.price_level && (
                        <span className="text-xs text-green-600 font-medium">
                          {'$'.repeat(candidate.price_level)}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      )
    }

    // Loser waits
    return (
      <div className="min-h-screen bg-warm-cream flex items-center justify-center" style={{ minHeight: '100dvh' }}>
        <div className="text-center px-6">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-coral mx-auto mb-4" />
          <h1 className="text-xl font-outfit font-bold text-warm-black mb-1">
            They won this round
          </h1>
          <p className="text-warm-gray500">
            Waiting for them to pick...
          </p>
        </div>
      </div>
    )
  }

  // Phase: Final reveal
  if (phase === 'final-reveal' && chosenCandidate) {
    return (
      <div className="min-h-screen bg-warm-cream flex items-center justify-center relative" style={{ minHeight: '100dvh' }}>
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50">
            <Lottie animationData={confettiAnimation} loop={false} />
          </div>
        )}
        <div className="max-w-md mx-auto px-4 w-full">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <h1 className="text-3xl font-outfit font-bold text-warm-black mb-6">
              It's decided!
            </h1>

            <div className="bg-white rounded-2xl shadow-md border-2 border-coral/30 overflow-hidden mb-6">
              <div className="w-full h-48 bg-warm-bg">
                {chosenCandidate.photo_ref ? (
                  <img
                    src={getPhotoUrl(chosenCandidate.photo_ref)}
                    alt={chosenCandidate.name || ''}
                    className="w-full h-full object-cover"
                  />
                ) : chosenCandidate.image_url ? (
                  <img
                    src={chosenCandidate.image_url}
                    alt={chosenCandidate.name || ''}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-warm-gray300">
                    {category === 'streaming' ? <Tv className="w-12 h-12" /> : <span className="text-5xl font-bold">{(chosenCandidate.name || '?').charAt(0)}</span>}
                  </div>
                )}
              </div>
              <div className="p-4">
                <h2 className="text-xl font-bold text-warm-black">{chosenCandidate.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  {chosenCandidate.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-medium text-warm-gray700">{chosenCandidate.rating}</span>
                    </div>
                  )}
                  {chosenCandidate.price_level && (
                    <span className="text-sm text-green-600 font-medium">
                      {'$'.repeat(chosenCandidate.price_level)}
                    </span>
                  )}
                </div>
                {chosenCandidate.cuisines && chosenCandidate.cuisines.length > 0 && (
                  <div className="flex gap-1.5 mt-2">
                    {chosenCandidate.cuisines.slice(0, 3).map((c: string, i: number) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-coral/10 text-coral rounded-full font-medium">
                        {c.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              {(category === 'restaurants' || (chosenCandidate.place_id && !chosenCandidate.place_id?.startsWith('custom_'))) && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(chosenCandidate.name || '')}&query_place_id=${chosenCandidate.place_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 btn-warm text-lg"
                >
                  <Navigation className="w-5 h-5" />
                  Open in Maps
                </a>
              )}
              <button
                onClick={() => window.location.href = '/'}
                className="w-full py-3 bg-warm-gray100 text-warm-gray700 font-bold rounded-xl hover:bg-warm-gray200 transition-colors"
              >
                Start Over
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return null
}
