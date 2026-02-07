'use client'

import { useEffect, useState } from 'react'
import { Star, DollarSign, Navigation, Zap, Tv } from 'lucide-react'
import { motion } from 'framer-motion'
import { createBrowserClient } from '@/lib/utils/supabase-client'
import { env } from '@/lib/utils/env'
import type { Tables } from '@/types/supabase'

const FAST_SWIPE_MS = 1000

interface SoloResultsScreenProps {
  sessionId: string
  participantId: string
  category: string
}

interface LikedCandidate extends Tables<'candidates'> {
  durationMs: number | null
  isFastYes: boolean
}

export default function SoloResultsScreen({ sessionId, participantId, category }: SoloResultsScreenProps) {
  const [topPick, setTopPick] = useState<LikedCandidate | null>(null)
  const [otherPicks, setOtherPicks] = useState<LikedCandidate[]>([])
  const [topPickIsFastYes, setTopPickIsFastYes] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLiked() {
      const supabase = createBrowserClient()

      // Get all swipes where vote = 1 (liked), including duration_ms
      const { data: swipes } = await supabase
        .from('swipes')
        .select('candidate_id, duration_ms')
        .eq('participant_id', participantId)
        .eq('vote', 1)

      if (swipes && swipes.length > 0) {
        const durationMap = new Map<string, number | null>()
        const candidateIds = swipes.map((s: any) => {
          durationMap.set(s.candidate_id, s.duration_ms)
          return s.candidate_id
        })

        const { data: candidates } = await supabase
          .from('candidates')
          .select('*')
          .in('id', candidateIds)

        if (candidates && candidates.length > 0) {
          // Enrich candidates with duration data
          const enriched: LikedCandidate[] = (candidates as any[]).map(c => ({
            ...c,
            durationMs: durationMap.get(c.id) ?? null,
            isFastYes: (durationMap.get(c.id) ?? Infinity) < FAST_SWIPE_MS,
          }))

          const fastYeses = enriched.filter(c => c.isFastYes)

          // Pick top pick
          let pick: LikedCandidate
          let isFast = false
          if (fastYeses.length > 0) {
            // Random from fast yeses
            pick = fastYeses[Math.floor(Math.random() * fastYeses.length)]
            isFast = true
          } else {
            // Highest rated
            pick = [...enriched].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0]
          }

          // Sort remaining: fast yeses first (by speed), then by rating
          const remaining = enriched
            .filter(c => c.id !== pick.id)
            .sort((a, b) => {
              if (a.isFastYes && !b.isFastYes) return -1
              if (!a.isFastYes && b.isFastYes) return 1
              if (a.isFastYes && b.isFastYes) {
                return (a.durationMs || 0) - (b.durationMs || 0)
              }
              return (b.rating || 0) - (a.rating || 0)
            })

          setTopPick(pick)
          setTopPickIsFastYes(isFast)
          setOtherPicks(remaining)
        }
      }

      setLoading(false)
    }

    fetchLiked()
  }, [sessionId, participantId])

  const getPhotoUrl = (photoRef: string): string => {
    const apiKey = env.google.mapsApiKey
    if (!apiKey) return ''
    if (photoRef.startsWith('places/')) {
      return `https://places.googleapis.com/v1/${photoRef}/media?maxWidthPx=400&key=${apiKey}`
    }
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoRef}&key=${apiKey}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-cream flex items-center justify-center" style={{ minHeight: '100dvh' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-coral mx-auto mb-3" />
          <p className="text-warm-gray500">Loading your picks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-warm-cream" style={{ minHeight: '100dvh' }}>
      <div className="max-w-md mx-auto px-4 py-8 pb-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1 className="text-3xl font-outfit font-bold text-warm-black">
            {topPick ? "You've decided!" : 'Tough crowd'}
          </h1>
          {!topPick && (
            <p className="text-warm-gray500 mt-1">
              You didn't like any of them. Classic.
            </p>
          )}
        </motion.div>

        {/* Top Pick Hero Card */}
        {topPick && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-md border-2 border-coral/30 overflow-hidden mb-6"
          >
            {/* Hero image */}
            <div className="w-full h-48 bg-warm-bg relative">
              {topPick.photo_ref ? (
                <img
                  src={getPhotoUrl(topPick.photo_ref)}
                  alt={topPick.name || ''}
                  className="w-full h-full object-cover"
                />
              ) : topPick.image_url ? (
                <img
                  src={topPick.image_url}
                  alt={topPick.name || ''}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-warm-gray300">
                  {category === 'streaming' ? <Tv className="w-12 h-12" /> : <span className="text-5xl font-bold">{(topPick.name || '?').charAt(0)}</span>}
                </div>
              )}
              {/* Badge */}
              <div className="absolute top-3 left-3 bg-coral text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                {topPickIsFastYes ? (
                  <>
                    <Zap className="w-3 h-3 fill-current" />
                    You seemed excited about this one!
                  </>
                ) : (
                  'Our top pick for you'
                )}
              </div>
            </div>

            {/* Info */}
            <div className="p-4">
              <h2 className="text-xl font-bold text-warm-black">{topPick.name}</h2>
              <div className="flex items-center gap-3 mt-1">
                {topPick.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="text-sm font-medium text-warm-gray700">{topPick.rating}</span>
                  </div>
                )}
                {topPick.price_level && (
                  <span className="text-sm text-green-600 font-medium">
                    {'$'.repeat(topPick.price_level)}
                  </span>
                )}
                {(topPick as any).year && (
                  <span className="text-sm text-warm-gray500">{(topPick as any).year}</span>
                )}
              </div>
              {topPick.cuisines && topPick.cuisines.length > 0 && (
                <div className="flex gap-1.5 mt-2">
                  {topPick.cuisines.slice(0, 3).map((c: string, i: number) => (
                    <span key={i} className="text-xs px-2 py-0.5 bg-coral/10 text-coral rounded-full font-medium">
                      {c.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}

              {/* Maps link for restaurants */}
              {(category === 'restaurants' || (topPick.place_id && !topPick.place_id.startsWith('custom_'))) && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(topPick.name || '')}&query_place_id=${topPick.place_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 bg-coral/10 text-coral font-semibold rounded-xl hover:bg-coral/20 transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  Open in Maps
                </a>
              )}
            </div>
          </motion.div>
        )}

        {/* Other picks */}
        {otherPicks.length > 0 && (
          <>
            <p className="text-warm-gray500 text-sm font-medium mb-2 px-1">
              Also liked ({otherPicks.length})
            </p>
            <div className="space-y-2">
              {otherPicks.map((candidate, index) => (
                <motion.div
                  key={candidate.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.06 }}
                  className="bg-white rounded-xl shadow-sm border border-warm-gray100 overflow-hidden flex"
                >
                  {/* Thumbnail */}
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

                  {/* Info */}
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
                        {candidate.price_level && (
                          <span className="text-xs text-green-600 font-medium">
                            {'$'.repeat(candidate.price_level)}
                          </span>
                        )}
                      </div>
                    </div>
                    {candidate.isFastYes && (
                      <Zap className="w-4 h-4 text-coral fill-coral flex-shrink-0 ml-2" />
                    )}
                  </div>

                  {/* Action */}
                  {(category === 'restaurants' || (candidate.place_id && !candidate.place_id.startsWith('custom_'))) ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(candidate.name || '')}&query_place_id=${candidate.place_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-10 text-coral hover:bg-coral/5 transition-colors"
                    >
                      <Navigation className="w-4 h-4" />
                    </a>
                  ) : (
                    <div className="w-2" />
                  )}
                </motion.div>
              ))}
            </div>
          </>
        )}

        {/* Empty state */}
        {!topPick && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-5xl mb-4">😤</p>
            <p className="text-warm-gray500">Try again with different filters?</p>
          </motion.div>
        )}
      </div>

      {/* Bottom CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-warm-cream border-t border-warm-gray100 p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
      >
        <div className="max-w-md mx-auto">
          <button
            onClick={() => window.location.href = '/'}
            className="w-full btn-warm text-lg py-3"
          >
            Start Over
          </button>
        </div>
      </div>
    </div>
  )
}
