'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import StreamingSwipeInterface from '@/components/streaming/streaming-swipe-interface'
import GenericRockPaperScissors from '@/components/shared/rock-paper-scissors-template'
import { createBrowserClient } from '@/lib/utils/supabase-client'
import { getClientFingerprint, getParticipantToken, storeParticipantToken } from '@/lib/utils/session'
import type { Tables } from '@/types/supabase'

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
  backdrop: string
  sources: any[]
  session_id: string
}

export default function StreamingSessionPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = params.sessionId as string
  const shareToken = searchParams.get('t')
  
  const [candidates, setCandidates] = useState<StreamingCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<Tables<'sessions'> | null>(null)
  const [participant, setParticipant] = useState<Tables<'participants'> | null>(null)
  const [swipedCandidateIds, setSwipedCandidateIds] = useState<Set<number>>(new Set())
  const [showRockPaperScissors, setShowRockPaperScissors] = useState(false)
  const [rpsGameId, setRpsGameId] = useState<string | null>(null)
  const [pendingMove, setPendingMove] = useState<string | null>(null)

  const supabase = createBrowserClient()

  useEffect(() => {
    initializeSession()
  }, [sessionId])

  const initializeSession = async () => {
    try {
      // Initialize session and participant (similar to restaurant flow)
      const fingerprint = await getClientFingerprint()
      let participantToken = getParticipantToken(sessionId)
      
      // For streaming, we'll create a simple session structure
      // In production, this would be more robust
      if (!session) {
        setSession({
          id: sessionId,
          status: 'active',
          created_at: new Date().toISOString(),
        } as Tables<'sessions'>)
      }
      
      if (!participant) {
        setParticipant({
          id: participantToken || fingerprint,
          session_id: sessionId,
          display_name: 'User',
          is_host: false,
          joined_at: new Date().toISOString(),
        } as Tables<'participants'>)
      }
      
      // Load streaming data
      await fetchSessionData()
      
    } catch (error) {
      console.error('Error initializing session:', error)
      setError('Failed to initialize session')
      setLoading(false)
    }
  }

  const fetchSessionData = async () => {
    try {
      // Check session storage first
      const storedCandidates = sessionStorage.getItem(`streaming-session-${sessionId}`)
      
      if (storedCandidates) {
        const parsedCandidates = JSON.parse(storedCandidates)
        setCandidates(parsedCandidates)
        setLoading(false)
        return
      }
      
      // If no stored data, wait a bit and check again (background loading might still be in progress)
      let retries = 0
      const maxRetries = 10
      const checkInterval = 500 // 500ms intervals
      
      const checkForData = () => {
        const data = sessionStorage.getItem(`streaming-session-${sessionId}`)
        if (data) {
          const parsedCandidates = JSON.parse(data)
          setCandidates(parsedCandidates)
          setLoading(false)
          return
        }
        
        retries++
        if (retries < maxRetries) {
          setTimeout(checkForData, checkInterval)
        } else {
          // After 5 seconds of waiting, show error
          setError('Session expired or not found. Please go back and create a new session.')
          setLoading(false)
        }
      }
      
      // Start checking for data
      setTimeout(checkForData, checkInterval)
      
    } catch (err) {
      console.error('Error fetching session data:', err)
      setError('Failed to load streaming session')
      setLoading(false)
    }
  }

  const handleSwipe = (candidateId: number, vote: boolean) => {
    console.log(`${vote ? 'Liked' : 'Rejected'} title:`, candidateId)
    
    // Track swiped candidates
    setSwipedCandidateIds(prev => new Set(prev).add(candidateId))
    
    // In a full implementation, you'd store votes in database for matching
    // For now, we'll just track locally and trigger RPS when exhausted
  }

  const handleRockPaperScissors = () => {
    setShowRockPaperScissors(true)
  }

  const handleRPSMove = (move: string) => {
    setPendingMove(move)
    setShowRockPaperScissors(true)
  }

  const handleBackFromRPS = () => {
    router.push('/streaming')
  }

  // Calculate remaining candidates
  const remainingCandidates = candidates.filter(c => !swipedCandidateIds.has(c.id))

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/70">Shuffling cards...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-6xl">😕</div>
          <h1 className="text-2xl font-bold text-white">Oops!</h1>
          <p className="text-white/70">{error}</p>
          <button
            onClick={() => router.push('/streaming')}
            className="bg-gradient-electric text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
          >
            <ArrowLeft className="h-4 w-4 inline mr-2" />
            Back to Setup
          </button>
        </div>
      </div>
    )
  }

  if (candidates.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-6xl">🎬</div>
          <h1 className="text-2xl font-bold text-white">No Content Found</h1>
          <p className="text-white/70">
            We couldn't find any content matching your preferences. 
            Try adjusting your filters.
          </p>
          <button
            onClick={() => router.push('/streaming')}
            className="bg-gradient-electric text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
          >
            <ArrowLeft className="h-4 w-4 inline mr-2" />
            Try Different Preferences
          </button>
        </div>
      </div>
    )
  }

  // Show RPS game if triggered
  if (showRockPaperScissors && session && participant) {
    return (
      <GenericRockPaperScissors
        session={session}
        participant={participant}
        category="streaming"
        onBack={handleBackFromRPS}
        initialMove={pendingMove}
        gameId={rpsGameId}
        winnerContent={candidates.filter(c => swipedCandidateIds.has(c.id))} // Liked content
      />
    )
  }

  // Show RPS trigger when exhausted
  if (remainingCandidates.length === 0 && candidates.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-6xl">🤔</div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Session Complete!</h1>
            <p className="text-white/70">
              Ready to decide what to watch? Let's settle this with a game!
            </p>
          </div>

          <button
            onClick={handleRockPaperScissors}
            className="w-full bg-gradient-electric text-white py-4 rounded-xl font-bold hover:scale-105 transition-transform"
          >
            Play Rock Paper Scissors
          </button>
          
          <button
            onClick={() => router.push('/streaming')}
            className="w-full bg-white/20 text-white py-3 rounded-xl font-bold hover:bg-white/30 transition-colors"
          >
            Create New Session
          </button>
        </div>
      </div>
    )
  }

  return (
    <StreamingSwipeInterface 
      candidates={remainingCandidates}
      onSwipe={handleSwipe}
    />
  )
}
