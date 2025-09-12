'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import StreamingSwipeInterface from '@/components/streaming/streaming-swipe-interface'
import GenericRockPaperScissors from '@/components/shared/rock-paper-scissors-template'
import ExhaustedScreenTemplate from '@/components/shared/exhausted-screen-template'
import CardLoader from '@/components/ui/card-loader'
import InvalidSessionScreen from '@/components/session/invalid-session-screen'
import NoMatchesScreen from '@/components/session/no-matches-screen'
import JoinFlow from '@/components/session/join-flow'
import { createBrowserClient } from '@/lib/utils/supabase-client'
import { getClientFingerprint, getParticipantToken, storeParticipantToken } from '@/lib/utils/session'
import { useRealtime } from '@/lib/hooks/use-realtime'
import { analytics } from '@/lib/utils/analytics'
import type { Tables } from '@/types/supabase'

type Session = Tables<'sessions'>
type Participant = Tables<'participants'>
type Candidate = Tables<'candidates'>

export default function StreamingSessionPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = params.sessionId as string
  const shareToken = searchParams.get('t')

  // State
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [session, setSession] = useState<Session | null>(null)
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [swipedCandidateIds, setSwipedCandidateIds] = useState<Set<string>>(new Set())
  const [sessionStatus, setSessionStatus] = useState({
    invitedCount: 0,
    joinedCount: 0,
    submittedCount: 0,
  })
  const [showNoMatches, setShowNoMatches] = useState(false)
  const [showRockPaperScissors, setShowRockPaperScissors] = useState(false)
  const [rpsGameId, setRpsGameId] = useState<string | null>(null)
  const [pendingMove, setPendingMove] = useState<string | null>(null)

  const supabase = createBrowserClient()

  // Realtime subscription
  const { broadcast } = useRealtime({
    channel: `session:${sessionId}`,
    onMessage: (payload) => {
      if (payload.event === 'participant_update') {
        fetchSessionStatus()
      } else if (payload.event === 'match_found') {
        setSession(prev => prev ? {
          ...prev,
          status: 'matched',
          match_place_id: payload.payload.placeId,
        } : null)
      } else if (payload.event === 'no_matches_detected') {
        setShowNoMatches(true)
      }
    },
  })

  // Initialize session
  useEffect(() => {
    initializeSession()
  }, [sessionId])

  // Auto-join anonymous sessions
  useEffect(() => {
    if (session && !participant && !session.require_names && !loading) {
      handleJoin() // Auto-join without name
    }
  }, [session, participant, loading])

  const initializeSession = async () => {
    try {
      const fingerprint = await getClientFingerprint()
      let participantToken = getParticipantToken(sessionId)

      // Fetch session from database
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (sessionError || !sessionData) {
        setError('Session not found or expired')
        setLoading(false)
        return
      }

      setSession(sessionData)

      // Check if participant exists
      if (participantToken) {
        const { data: participantData } = await supabase
          .from('participants')
          .select('*')
          .eq('session_id', sessionId)
          .eq('client_fingerprint', fingerprint)
          .single()

        if (participantData) {
          setParticipant(participantData)
          
          // Load existing swipes
          const { data: swipes } = await supabase
            .from('swipes')
            .select('candidate_id')
            .eq('participant_id', participantData.id)

          if (swipes) {
            setSwipedCandidateIds(new Set(swipes.map(s => s.candidate_id)))
          }
        }
      }

      // Fetch streaming candidates
      await fetchCandidates()
      await fetchSessionStatus()
      
      setLoading(false)
    } catch (err) {
      console.error('Error initializing session:', err)
      setError('Failed to initialize session')
      setLoading(false)
    }
  }

  const fetchCandidates = async () => {
    try {
      const { data: candidateData, error: candidateError } = await supabase
        .from('candidates')
        .select('*')
        .eq('session_id', sessionId)
        .in('content_type', ['movie', 'tv_series'])
        .order('user_rating', { ascending: false })

      if (candidateError) {
        console.error('Error fetching candidates:', candidateError)
        setError('Failed to load streaming content')
        return
      }

      setCandidates(candidateData || [])
    } catch (err) {
      console.error('Error fetching candidates:', err)
      setError('Failed to load streaming content')
    }
  }

  const fetchSessionStatus = async () => {
    try {
      const { data: statusData, error: statusError } = await supabase
        .rpc('get_session_status', { p_session_id: sessionId })

      if (statusError) {
        console.error('Error fetching session status:', statusError)
        return
      }

      if (statusData && statusData.length > 0) {
        const status = statusData[0]
        setSessionStatus({
          invitedCount: status.invited_count || 2,
          joinedCount: status.joined_count || 0,
          submittedCount: status.submitted_count || 0,
        })
      }
    } catch (err) {
      console.error('Error fetching session status:', err)
    }
  }

  const handleSwipe = async (candidateId: string, vote: boolean) => {
    if (!participant) return

    try {
      // Record swipe in database
      const { error: swipeError } = await supabase
        .from('swipes')
        .insert({
          session_id: sessionId,
          participant_id: participant.id,
          candidate_id: candidateId,
          vote: vote ? 1 : 0,
        })

      if (swipeError) throw swipeError

      // Update local state
      setSwipedCandidateIds(prev => new Set(Array.from(prev).concat(candidateId)))

      // Track analytics
      const candidate = candidates.find(c => c.id === candidateId)
      if (candidate) {
        analytics.swipe(sessionId, candidate.place_id, vote)
      }

      // Check for match if this was a like
      if (vote && candidate) {
        console.log('❤️ Checking for match after like:', candidate.title || candidate.name)
        try {
          const matchResponse = await fetch('/api/check-match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              candidateId: candidateId,
              participantId: participant.id
            })
          })
          
          const matchResult = await matchResponse.json()
          console.log('🎯 Match check result:', matchResult)
          
          if (matchResult.match) {
            console.log('🎉 MATCH FOUND! Session will update via realtime')
            return
          }
        } catch (matchError) {
          console.error('Error checking for match:', matchError)
        }
      }

      // Check if all candidates have been swiped
      if (swipedCandidateIds.size + 1 >= candidates.length) {
        // Mark participant as submitted
        await supabase
          .from('participants')
          .update({ submitted_at: new Date().toISOString() })
          .eq('id', participant.id)

        // Refresh session status immediately
        await fetchSessionStatus()

        // Broadcast update
        broadcast('participant_update', { type: 'submitted' })
      }
    } catch (err) {
      console.error('Error recording swipe:', err)
    }
  }

  // Handle joining the session
  const handleJoin = async (displayName?: string) => {
    try {
      const fingerprint = await getClientFingerprint()
      const participantToken = generateParticipantToken()

      const { data: participantData, error: participantError } = await supabase
        .from('participants')
        .insert({
          session_id: sessionId,
          display_name: displayName || 'Anonymous',
          client_fingerprint: fingerprint,
          is_host: false,
        })
        .select()
        .single()

      if (participantError) throw participantError

      setParticipant(participantData)
      storeParticipantToken(sessionId, participantToken)

      // Refresh session status
      await fetchSessionStatus()
      broadcast('participant_update', { type: 'joined' })
    } catch (err) {
      console.error('Error joining session:', err)
      setError('Failed to join session')
    }
  }

  // Check for no matches when everyone has finished swiping
  useEffect(() => {
    if (session && sessionStatus.joinedCount > 0 && 
        sessionStatus.submittedCount === sessionStatus.joinedCount &&
        session.status === 'active') {
      checkForNoMatches()
    }
  }, [sessionStatus, session])

  const checkForNoMatches = async () => {
    if (!session) return

    try {
      // Check if there are any unanimous matches
      const { data: matches } = await supabase
        .rpc('find_session_matches', { p_session_id: session.id })

      if (!matches || matches.length === 0) {
        // No matches found, show no-matches screen
        setShowNoMatches(true)
        broadcast('no_matches_detected', { sessionId: session.id })
      }
    } catch (error) {
      console.error('Error checking for matches:', error)
      setShowNoMatches(true)
    }
  }

  // Handler functions for no-matches screen
  const handleStartOver = () => {
    setSwipedCandidateIds(new Set())
    setShowNoMatches(false)
  }

  const handleExpandSearch = () => {
    console.log('Expand search not implemented yet')
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

  const handleNewSession = () => {
    router.push('/streaming')
  }

  // Helper function to generate participant token
  const generateParticipantToken = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }

  // Debug logging for candidate filtering (must be before any conditional returns)
  const remainingCandidates = candidates.filter(c => !swipedCandidateIds.has(c.id))
  useEffect(() => {
    if (participant) {
      console.log(`🎬 Streaming session status: ${swipedCandidateIds.size}/${candidates.length} swiped, ${remainingCandidates.length} remaining`)
    }
  }, [swipedCandidateIds.size, candidates.length, remainingCandidates.length, participant])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <CardLoader message="Loading session..." />
      </div>
    )
  }

  // Error state
  if (error || !session) {
    return <InvalidSessionScreen message={error || 'Session not found'} />
  }

  // Match state
  if (session.status === 'matched' && session.match_place_id) {
    const matchedCandidate = candidates.find(c => c.place_id === session.match_place_id)
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-6xl">🎉</div>
          <h1 className="text-3xl font-bold text-white">It's a Match!</h1>
          {matchedCandidate && (
            <div className="bg-white/10 rounded-2xl p-6 space-y-4">
              {matchedCandidate.poster && (
                <img 
                  src={matchedCandidate.poster} 
                  alt={matchedCandidate.title || matchedCandidate.name}
                  className="w-32 h-48 object-cover rounded-lg mx-auto"
                />
              )}
              <h2 className="text-xl font-bold text-white">
                {matchedCandidate.title || matchedCandidate.name}
              </h2>
              {matchedCandidate.year && (
                <p className="text-white/70">({matchedCandidate.year})</p>
              )}
            </div>
          )}
          <button
            onClick={() => router.push('/streaming')}
            className="bg-gradient-electric text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
          >
            Start New Session
          </button>
        </div>
      </div>
    )
  }

  // Join flow
  if (!participant) {
    // For anonymous sessions, show loading while auto-joining
    if (session && !session.require_names) {
      return (
        <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
          <CardLoader message="Joining session..." />
        </div>
      )
    }
    
    // For named sessions, show the join flow
    return (
      <JoinFlow
        session={session}
        onJoin={handleJoin}
      />
    )
  }

  // No matches screen
  if (showNoMatches) {
    return (
      <NoMatchesScreen
        session={session}
        participant={participant}
        onStartOver={handleStartOver}
        onExpandSearch={handleExpandSearch}
        onRockPaperScissors={handleRockPaperScissors}
        onRPSMove={handleRPSMove}
        onNewSession={handleNewSession}
      />
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

  // Exhausted state - show template exhausted screen like restaurant version
  if (remainingCandidates.length === 0 && candidates.length > 0 && session) {
    return (
      <ExhaustedScreenTemplate
        session={session}
        sessionStatus={sessionStatus}
        category="streaming"
      />
    )
  }

  return (
    <StreamingSwipeInterface 
      candidates={remainingCandidates}
      onSwipe={handleSwipe}
    />
  )
}

