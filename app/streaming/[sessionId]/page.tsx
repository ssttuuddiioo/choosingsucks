'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import SwipeInterfaceTemplate from '@/components/shared/swipe-interface-template'
import StreamingCard from '@/components/streaming/streaming-card'
import StreamingMatchScreen from '@/components/streaming/streaming-match-screen'
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
  const [swipeQueue, setSwipeQueue] = useState<Array<{candidateId: string, vote: boolean, durationMs?: number}>>([])
  const [isProcessingSwipes, setIsProcessingSwipes] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)

  const supabase = createBrowserClient()

  // Realtime subscription
  const { broadcast } = useRealtime({
    channel: `session:${sessionId}`,
    onMessage: (payload) => {
      if (payload.event === 'participant_update') {
        fetchSessionStatus()
      } else if (payload.event === 'match_found') {
        setSession((prev: any) => prev ? {
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

  // Process swipe queue in batches with adaptive throttling
  useEffect(() => {
    if (swipeQueue.length > 0 && !isProcessingSwipes && participant) {
      // Adaptive throttling: immediate for single swipes, batched for rapid swiping
      const delay = swipeQueue.length >= 3 ? 300 : 100 // Faster processing for rapid swipes
      
      const timer = setTimeout(() => {
        processSwipeQueue()
      }, delay)
      
      return () => clearTimeout(timer)
    }
  }, [swipeQueue, isProcessingSwipes, participant])

  const processSwipeQueue = async () => {
    if (isProcessingSwipes || swipeQueue.length === 0 || !participant) return
    
    setIsProcessingSwipes(true)
    
    try {
      // Process all queued swipes in a single batch
      const swipesToProcess = [...swipeQueue]
      setSwipeQueue([]) // Clear queue immediately for next batch
      
      console.log(`🔄 Processing ${swipesToProcess.length} queued "no" votes in batch`)
      
      // Only process "no" votes in batches (yes votes are handled immediately)
      const noVotes = swipesToProcess.filter(s => !s.vote)
      
      if (noVotes.length > 0) {
        // Insert "no" votes in a single database call
        const swipeRecords = noVotes.map(swipe => ({
          session_id: sessionId,
          participant_id: participant.id,
          candidate_id: swipe.candidateId,
          vote: 0,
          duration_ms: swipe.durationMs || null,
        }))

        const { error: swipeError } = await (supabase as any)
          .from('swipes')
          .insert(swipeRecords)

        if (swipeError) {
          console.error('Error batch inserting no votes:', swipeError)
          // Re-queue failed swipes
          setSwipeQueue(prev => [...noVotes, ...prev])
          return
        }
      }

      // Check if all candidates have been swiped
      const totalSwiped = swipedCandidateIds.size + swipesToProcess.length
      if (totalSwiped >= candidates.length) {
        // Mark participant as submitted
        await (supabase as any)
          .from('participants')
          .update({ submitted_at: new Date().toISOString() })
          .eq('id', participant.id)

        // Refresh session status
        await fetchSessionStatus()
        broadcast('participant_update', { type: 'submitted' })
      }
      
    } catch (err) {
      console.error('Error processing swipe queue:', err)
    } finally {
      setIsProcessingSwipes(false)
    }
  }

  const initializeSession = async () => {
    try {
      console.log('🔍 Initializing streaming session:', sessionId)
      const fingerprint = await getClientFingerprint()
      let participantToken = getParticipantToken(sessionId)

      // Fetch session from database with detailed logging
      console.log('📡 Fetching session from database...')
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      const sessionRow = sessionData as any
      console.log('📊 Session query result:', { 
        sessionData: sessionRow ? { id: sessionRow.id, status: sessionRow.status, category: sessionRow.category } : null,
        error: sessionError 
      })

      if (sessionError) {
        console.error('❌ Session fetch error:', sessionError)
        
        // If session not found (PGRST116), it might be a new session still being created
        if (sessionError.code === 'PGRST116') {
          console.log('🔄 Session not found, might be new session. Retrying in 2 seconds...')
          
          // Keep loading state during retry
          setLoading(true)
          setIsRetrying(true)
          
          // Retry after a short delay for new sessions
          setTimeout(async () => {
            console.log('🔄 Retrying session fetch...')
            try {
              const { data: retrySessionData, error: retryError } = await supabase
                .from('sessions')
                .select('*')
                .eq('id', sessionId)
                .single()
              
              if (retryError || !retrySessionData) {
                console.error('❌ Retry failed:', retryError)
                setError('Session not found or expired')
                setLoading(false)
                return
              }
              
              const retrySession = retrySessionData as any
              console.log('✅ Retry successful! Session found:', retrySession.id)
              setSession(retrySession)
              
              // Continue with initialization
              await fetchCandidates()
              await fetchSessionStatus()
              setLoading(false)
              setIsRetrying(false)
            } catch (err) {
              console.error('❌ Retry exception:', err)
              setError('Session not found or expired')
              setLoading(false)
              setIsRetrying(false)
            }
          }, 2000)
          
          return // Don't set error immediately, wait for retry
        }
        
        setError(`Session fetch failed: ${sessionError.message} (Code: ${sessionError.code})`)
        setLoading(false)
        return
      }

      if (!sessionData) {
        console.error('❌ No session data returned')
        setError('Session not found in database')
        setLoading(false)
        return
      }

      const sessionObj = sessionData as any
      console.log('✅ Session data loaded successfully:', sessionObj.id, sessionObj.status)
      setSession(sessionObj)

      // Check if participant exists
      if (participantToken) {
        console.log('🔍 Checking for existing participant with token:', participantToken)
        const { data: participantData } = await supabase
          .from('participants')
          .select('*')
          .eq('session_id', sessionId)
          .eq('client_fingerprint', fingerprint)
          .single()

        const existingParticipant = participantData as any
        if (existingParticipant) {
          console.log('✅ Found existing participant:', existingParticipant.id, existingParticipant.display_name)
          setParticipant(existingParticipant)
          
          // Load existing swipes
          const { data: swipes } = await supabase
            .from('swipes')
            .select('candidate_id')
            .eq('participant_id', existingParticipant.id)

          if (swipes) {
            const swipeRecords = swipes as any
            console.log(`📊 Loaded ${swipeRecords.length} existing swipes for participant`)
            setSwipedCandidateIds(new Set(swipeRecords.map((s: any) => s.candidate_id)))
          }
        } else {
          console.log('ℹ️ No existing participant found, will need to join')
        }
      }

      // Fetch streaming candidates
      await fetchCandidates()
      await fetchSessionStatus()
      
      console.log('🎉 Session initialization complete!')
      setLoading(false)
    } catch (err) {
      console.error('❌ Session initialization failed:', err)
      setError(`Failed to initialize session: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setLoading(false)
    }
  }

  const fetchCandidates = async () => {
    try {
      console.log('📡 Fetching streaming candidates for session:', sessionId)
      const { data: candidateData, error: candidateError } = await supabase
        .from('candidates')
        .select('*')
        .eq('session_id', sessionId)
        .in('content_type', ['movie', 'tv_series', 'tv_miniseries', 'tv_special'])
        .order('user_rating', { ascending: false })

      const candidates = candidateData as any
      console.log('📊 Candidates query result:', { 
        count: candidates?.length || 0,
        error: candidateError,
        sampleTitles: candidates?.slice(0, 3).map((c: any) => c.title || c.name)
      })

      if (candidateError) {
        console.error('❌ Candidates fetch error:', candidateError)
        setError(`Failed to load streaming content: ${candidateError.message}`)
        return
      }

      setCandidates(candidates || [])
      console.log(`✅ Loaded ${candidates?.length || 0} streaming candidates`)
    } catch (err) {
      console.error('❌ Candidates fetch exception:', err)
      setError('Failed to load streaming content')
    }
  }

  const fetchSessionStatus = async () => {
    try {
      const { data: statusData, error: statusError } = await (supabase as any)
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

  const handleSwipe = async (candidateId: string, vote: boolean, durationMs?: number) => {
    if (!participant) return

    // 1. IMMEDIATE: Optimistic UI update - cards move instantly
    setSwipedCandidateIds(prev => new Set(Array.from(prev).concat(candidateId)))
    
    // 2. IMMEDIATE: Check for match if this was a "yes" vote (critical path)
    if (vote) {
      const candidate = candidates.find(c => c.id === candidateId)
      if (candidate) {
        console.log('❤️ Checking for immediate match:', candidate.title || candidate.name)
        
        // Record the swipe immediately for match detection
        try {
          const swipeInsert: any = {
            session_id: sessionId,
            participant_id: participant.id,
            candidate_id: candidateId,
            vote: 1,
            duration_ms: durationMs || null,
          }
          
          const { error: swipeError } = await (supabase as any)
            .from('swipes')
            .insert(swipeInsert)

          if (!swipeError) {
            // Check for match immediately
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
            if (matchResult.match) {
              console.log('🎯 IMMEDIATE MATCH FOUND!', candidate.title || candidate.name)
              return // Stop here, match found
            }
          }
        } catch (error) {
          console.error('Error in immediate match check:', error)
          // Fall back to queue system
          setSwipeQueue(prev => [...prev, { candidateId, vote, durationMs }])
        }
      }
    } else {
      // 3. BATCHED: Queue "no" votes for batch processing (non-critical)
      setSwipeQueue(prev => [...prev, { candidateId, vote, durationMs }])
    }
    
    // Track analytics immediately (lightweight)
    const candidate = candidates.find(c => c.id === candidateId)
    if (candidate) {
      analytics.swipe(sessionId, candidate.place_id, vote)
    }
  }

  // Handle joining the session
  const handleJoin = async (displayName?: string) => {
    try {
      const fingerprint = await getClientFingerprint()
      const participantToken = generateParticipantToken()

      const participantInsert: any = {
        session_id: sessionId,
        display_name: displayName || 'Anonymous',
        client_fingerprint: fingerprint,
        is_host: false,
      }
      
      const { data: participantData, error: participantError } = await (supabase as any)
        .from('participants')
        .insert(participantInsert)
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
      // Note: RPC calls need 'as any' due to Supabase client limitations with custom function types
      const { data: matches } = await (supabase as any)
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
      
      // Debug exhausted state detection
      if (remainingCandidates.length === 0 && candidates.length > 0) {
        console.log('🏁 All candidates swiped! Should show exhausted screen')
      }
    }
  }, [swipedCandidateIds.size, candidates.length, remainingCandidates.length, participant])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <CardLoader message={isRetrying ? "Session loading, please wait..." : "Loading session..."} />
      </div>
    )
  }

  // Error state with detailed logging
  if (error || !session) {
    console.log('🚨 Showing invalid session screen:', { 
      error, 
      hasSession: !!session,
      sessionId,
      loading,
      candidateCount: candidates.length
    })
    return <InvalidSessionScreen message={error || 'Session not found'} />
  }

  // Match state - use dedicated match screen component
  if (session.status === 'matched' && session.match_place_id) {
    const matchedCandidate = candidates.find(c => c.place_id === session.match_place_id)
    return <StreamingMatchScreen session={session} candidate={matchedCandidate} />
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
    <SwipeInterfaceTemplate 
      candidates={remainingCandidates}
      onSwipe={handleSwipe}
      renderCard={(candidate, onLearnMore) => (
        <StreamingCard candidate={candidate} onLearnMore={onLearnMore} />
      )}
      categoryName="streaming"
    />
  )
}

