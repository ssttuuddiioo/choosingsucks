'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/utils/supabase-client'
import { getClientFingerprint, getParticipantToken, storeParticipantToken } from '@/lib/utils/session'
import { analytics } from '@/lib/utils/analytics'
import { useRealtime } from '@/lib/hooks/use-realtime'
import type { Tables } from '@/types/supabase'

// Components
import JoinFlow from '@/components/session/join-flow'
import SwipeInterfaceTemplate from '@/components/shared/swipe-interface-template'
import RestaurantCard from '@/components/swipe/restaurant-card'
import StreamingCard from '@/components/streaming/streaming-card'
import BYOCard from '@/components/build-your-own/byo-card'
import SessionStatus from '@/components/session/session-status'
import MatchScreen from '@/components/session/match-screen'
import ExhaustedScreenTemplate from '@/components/shared/exhausted-screen-template'
import InvalidSessionScreen from '@/components/session/invalid-session-screen'
import NoMatchesScreen from '@/components/session/no-matches-screen'
import GenericRockPaperScissors from '@/components/shared/rock-paper-scissors-template'
import SoloResultsScreen from '@/components/shared/solo-results-screen'
import MutualMatchesRPSFlow from '@/components/session/mutual-matches-rps-flow'

type Session = Tables<'sessions'>
type Participant = Tables<'participants'>
type Candidate = Tables<'candidates'>

export default function SessionPage() {
  const params = useParams()
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
  const [isJoining, setIsJoining] = useState(false) // Guard against concurrent joins
  const [rpsGameId, setRpsGameId] = useState<string | null>(null)
  const [pendingMove, setPendingMove] = useState<string | null>(null)
  const [mutualMatches, setMutualMatches] = useState<Candidate[]>([])
  const [showMutualMatchesFlow, setShowMutualMatchesFlow] = useState(false)

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
      } else if (payload.event === 'mutual_matches_found') {
        // Other client detected mutual matches — enter the flow
        const matchedIds: string[] = payload.payload.candidateIds
        if (matchedIds && matchedIds.length >= 2) {
          const matched = candidates.filter(c => matchedIds.includes(c.id))
          if (matched.length >= 2) {
            setMutualMatches(matched)
            setShowMutualMatchesFlow(true)
          }
        }
      }
    },
  })

  // Initialize session
  useEffect(() => {
    initializeSession()
  }, [sessionId])

  // Debug logging for candidate filtering (must be before any conditional returns)
  const remainingCandidates = candidates.filter(c => !swipedCandidateIds.has(c.id))
  useEffect(() => {
    if (participant) { // Only log when participant exists
      console.log('🔄 Candidate filtering:', {
        totalCandidates: candidates.length,
        swipedIds: Array.from(swipedCandidateIds),
        remainingCandidates: remainingCandidates.length,
        sessionId,
        participantId: participant?.id
      })
    }
  }, [candidates, swipedCandidateIds, remainingCandidates.length, sessionId, participant?.id])

  // Auto-join effect for anonymous sessions
  useEffect(() => {
    if (session && !participant && !session.require_names) {
      // Auto-join for anonymous sessions (both hosts and participants)
      handleJoin()
    }
  }, [session, participant])

  async function initializeSession() {
    try {
      // Fetch session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (sessionError || !sessionData) {
        console.error('Session lookup error:', { sessionError, sessionId, hasData: !!sessionData })
        setError('Session not found')
        setLoading(false)
        return
      }

      const session = sessionData as any
      console.log('✅ Session found:', { 
        id: session.id, 
        category: session.category, 
        status: session.status,
        shareToken 
      })

      setSession(session)

      // Check if already joined
      const existingToken = getParticipantToken(sessionId)
      if (existingToken) {
        // Try to find existing participant - handle RLS policy limitations
        try {
          const { data: existingParticipant, error: participantError } = await supabase
            .from('participants')
            .select('*')
            .eq('session_id', sessionId)
            .eq('client_fingerprint', getClientFingerprint())
            .single()

          if (existingParticipant && !participantError) {
            const participant = existingParticipant as any
            setParticipant(participant)
            await loadCandidates()
            await loadSwipeHistory(participant.id)
          } else {
            console.log('No existing participant found or RLS policy blocked query:', participantError)
          }
        } catch (participantLookupError) {
          console.log('Participant lookup failed (likely RLS policy):', participantLookupError)
          // Continue without existing participant - will auto-join for anonymous sessions
        }
      }

      await fetchSessionStatus()
    } catch (err) {
      console.error('Error initializing session:', err)
      setError('Failed to load session')
    } finally {
      setLoading(false)
    }
  }

  async function fetchSessionStatus() {
    const { data } = await (supabase as any)
      .rpc('get_session_status', { p_session_id: sessionId })
      .single()

    if (data) {
      setSessionStatus({
        invitedCount: data.invited_count || 0,
        joinedCount: data.joined_count || 0,
        submittedCount: data.submitted_count || 0,
      })

      // Update session status if changed
      if (data.status !== session?.status) {
        setSession((prev: any) => prev ? { ...prev, status: data.status } : null)
      }
    }
  }

  async function loadCandidates() {
    console.log('🔍 Loading candidates for session:', sessionId)
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    console.log('📊 Candidates query result:', { 
      count: data?.length || 0, 
      error: error?.message,
      sessionId 
    })

    if (data && data.length > 0) {
      const candidates = data as any
      console.log('🍽️ First few restaurants:', candidates.slice(0, 3).map((c: any) => ({
        name: c.name,
        rating: c.rating,
        photo_ref: c.photo_ref ? 'has_photo' : 'no_photo'
      })))
      setCandidates(candidates)
    } else {
      console.warn('⚠️ No candidates found for session:', sessionId)
    }
  }

  async function loadSwipeHistory(participantId: string) {
    const { data } = await supabase
      .from('swipes')
      .select('candidate_id')
      .eq('participant_id', participantId)

    if (data) {
      const swipes = data as any
      setSwipedCandidateIds(new Set(swipes.map((s: any) => s.candidate_id)))
    }
  }

  async function handleJoin(displayName?: string) {
    // Prevent concurrent join attempts
    if (isJoining) {
      console.log('Join already in progress, skipping')
      return
    }

    try {
      setIsJoining(true)
      const fingerprint = getClientFingerprint()

      // First check if this fingerprint already exists in the session
      const { data: existingParticipant } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', sessionId)
        .eq('client_fingerprint', fingerprint)
        .maybeSingle()

      if (existingParticipant) {
        // Already a participant, just set state
        const participant = existingParticipant as any
        console.log('Already a participant, rejoining:', participant.id)
        setParticipant(participant)
        storeParticipantToken(sessionId, participant.id)
        await loadCandidates()
        return
      }

      // Check if session is at capacity (especially for 2-person mode)
      const isMultiPersonEnabled = process.env.NEXT_PUBLIC_ENABLE_MULTI_PERSON === 'true'
      if (!isMultiPersonEnabled && session) {
        // For 2-person mode, check current participant count
        const { data: existingParticipants } = await supabase
          .from('participants')
          .select('id')
          .eq('session_id', sessionId)
        
        if (existingParticipants && existingParticipants.length >= 2) {
          setError('This session is full (2 people maximum)')
          return
        }
      }

      // Create participant
      const newParticipantData: any = {
        session_id: sessionId,
        display_name: displayName || null,
        client_fingerprint: fingerprint,
      }
      
      const { data: newParticipant, error: participantError } = await (supabase as any)
        .from('participants')
        .insert(newParticipantData)
        .select()
        .single()

      if (participantError) throw participantError

      setParticipant(newParticipant)
      storeParticipantToken(sessionId, newParticipant.id)

      // Load candidates
      await loadCandidates()

      // Broadcast join event
      broadcast('participant_update', { type: 'joined' })

      // Track analytics
      analytics.participantJoined(sessionId)
    } catch (err) {
      console.error('Error joining session:', err)
      throw err
    } finally {
      setIsJoining(false)
    }
  }

  async function handleSwipe(candidateId: string, vote: boolean, durationMs?: number) {
    if (!participant) return

    try {
      // Record swipe
      const swipeData: any = {
        session_id: sessionId,
        participant_id: participant.id,
        candidate_id: candidateId,
        vote: vote ? 1 : 0,
        duration_ms: durationMs || null,
      }
      
      const { error: swipeError } = await (supabase as any)
        .from('swipes')
        .insert(swipeData)

      if (swipeError) throw swipeError

      // Update local state
      setSwipedCandidateIds(prev => new Set(Array.from(prev).concat(candidateId)))

      // Track analytics
      const candidate = candidates.find(c => c.id === candidateId)
      if (candidate) {
        analytics.swipe(sessionId, candidate.place_id, vote)
      }

      // Check for match if this was a like (skip in solo mode)
      const isSolo = (session as any)?.invite_count_hint === 1
      if (vote && candidate && !isSolo) {
        console.log('❤️ Checking for match after like:', candidate.name)
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
            // The session status will be updated by the Edge Function
            // and the realtime subscription will trigger the UI update
            return
          }
        } catch (matchError) {
          console.error('Error checking for match:', matchError)
          // Continue with normal flow even if match check fails
        }
      }

      // Check if all candidates have been swiped
      if (swipedCandidateIds.size + 1 >= candidates.length) {
        // Mark participant as submitted
        await (supabase as any)
          .from('participants')
          .update({ submitted_at: new Date().toISOString() })
          .eq('id', participant.id)

        // Refresh session status immediately to reflect the change
        await fetchSessionStatus()

        // Broadcast update
        broadcast('participant_update', { type: 'submitted' })
      }
    } catch (err) {
      console.error('Error recording swipe:', err)
    }
  }

  // Check for no matches when everyone has finished swiping (duo/multi only)
  useEffect(() => {
    const isSoloMode = (session as any)?.invite_count_hint === 1
    if (isSoloMode) return // Solo mode uses SoloResultsScreen instead

    if (session && sessionStatus.joinedCount > 0 &&
        sessionStatus.submittedCount === sessionStatus.joinedCount &&
        session.status === 'active') {
      checkForNoMatches()
    }
  }, [sessionStatus, session])

  async function checkForNoMatches() {
    if (!session) return

    try {
      // Get all participants in this session
      const { data: participants, error: pError } = await (supabase as any)
        .from('participants')
        .select('id')
        .eq('session_id', session.id)

      if (pError || !participants || participants.length === 0) {
        console.error('Error fetching participants:', pError)
        setShowNoMatches(true)
        return
      }

      const totalParticipants = participants.length
      const matchRequirement = (session as any).match_requirement || 'all'
      const requiredLikes = matchRequirement === 'majority'
        ? Math.ceil(totalParticipants / 2)
        : totalParticipants

      // Get all "yes" votes for this session
      const { data: yesVotes, error: vError } = await (supabase as any)
        .from('swipes')
        .select('candidate_id, participant_id')
        .eq('session_id', session.id)
        .eq('vote', 1)

      if (vError) {
        console.error('Error fetching votes:', vError)
        setShowNoMatches(true)
        return
      }

      // Count yes votes per candidate
      const voteCounts: Record<string, Set<string>> = {}
      for (const vote of yesVotes || []) {
        if (!voteCounts[vote.candidate_id]) {
          voteCounts[vote.candidate_id] = new Set()
        }
        voteCounts[vote.candidate_id].add(vote.participant_id)
      }

      // Find candidates that meet the match threshold
      const matchedCandidateIds = Object.entries(voteCounts)
        .filter(([, voters]) => voters.size >= requiredLikes)
        .map(([candidateId]) => candidateId)

      const matched = candidates.filter(c => matchedCandidateIds.includes(c.id))

      if (matched.length === 0) {
        // No matches found
        setShowNoMatches(true)
        broadcast('no_matches_detected', { sessionId: session.id })
      } else if (matched.length === 1) {
        // Single match — update session and show winner
        const winner = matched[0]
        await (supabase as any)
          .from('sessions')
          .update({
            status: 'matched',
            match_place_id: winner.place_id,
            match_reason: `All ${totalParticipants} participants liked this!`,
          })
          .eq('id', session.id)

        setSession((prev: any) => prev ? {
          ...prev,
          status: 'matched',
          match_place_id: winner.place_id,
        } : null)

        broadcast('match_found', {
          placeId: winner.place_id,
          candidateId: winner.id,
          restaurantName: winner.name,
        })
      } else {
        // Multiple mutual matches — enter tiebreaker flow
        setMutualMatches(matched)
        setShowMutualMatchesFlow(true)
        broadcast('mutual_matches_found', {
          sessionId: session.id,
          candidateIds: matched.map(c => c.id),
        })
      }
    } catch (error) {
      console.error('Error checking for matches:', error)
      setShowNoMatches(true)
    }
  }

  // Handler functions for no-matches screen
  function handleStartOver() {
    // Reset swipes and start over
    setSwipedCandidateIds(new Set())
    setShowNoMatches(false)
    // TODO: Reset participant submitted status
  }

  function handleExpandSearch() {
    // TODO: Implement expand search functionality
    console.log('Expand search not implemented yet')
  }

  function handleRockPaperScissors() {
    setShowRockPaperScissors(true)
    setShowNoMatches(false)
  }

  function handleBackFromRPS() {
    setShowRockPaperScissors(false)
    setShowNoMatches(true)
  }

  async function handleRPSMove(move: 'rock' | 'paper' | 'scissors') {
    if (!session || !participant) return

    try {
      // Create or join RPS game
      let gameId = rpsGameId
      
      if (!gameId) {
        // Check for existing game or create new one
        const { data: existingGame } = await supabase
          .from('rps_games')
          .select('id')
          .eq('session_id', session.id)
          .eq('status', 'waiting')
          .single()

        if (existingGame) {
          gameId = (existingGame as any).id
        } else {
          const rpsGameData: any = {
            session_id: session.id,
            status: 'waiting',
            round_number: 1,
          }
          
          const { data: newGame, error } = await (supabase as any)
            .from('rps_games')
            .insert(rpsGameData)
            .select('id')
            .single()

          if (error) throw error
          gameId = (newGame as any).id
        }
        
        setRpsGameId(gameId)
      }

      // Store the move
      const rpsMoveData: any = {
        game_id: gameId,
        participant_id: participant.id,
        round_number: 1,
        move,
      }
      
      await (supabase as any)
        .from('rps_moves')
        .insert(rpsMoveData)

      // Set pending move and switch to RPS screen
      setPendingMove(move)
      setShowRockPaperScissors(true)
      setShowNoMatches(false)

      // Broadcast the move
      broadcast('rps_move_made', {
        gameId,
        participantId: participant.id,
        move,
      })

    } catch (error) {
      console.error('Error making RPS move:', error)
    }
  }

  function handleNewSession() {
    // Navigate to home to create a new session
    window.location.href = '/'
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-warm-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral mx-auto"></div>
          <p className="mt-4 text-warm-gray500">Loading session...</p>
        </div>
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
    return <MatchScreen session={session} candidate={matchedCandidate} />
  }

  // Join flow
  if (!participant) {
    // For anonymous sessions, show loading while auto-joining
    if (session && !session.require_names) {
      return (
        <div className="min-h-screen bg-warm-cream flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral mx-auto"></div>
            <p className="mt-4 text-warm-gray500">Joining session...</p>
          </div>
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

  // remainingCandidates is already calculated above

  // Mutual matches flow (2+ mutual likes)
  if (showMutualMatchesFlow && participant && mutualMatches.length >= 2) {
    return (
      <MutualMatchesRPSFlow
        session={session}
        participant={participant}
        mutualMatches={mutualMatches}
        category={session.category || 'restaurants'}
        onComplete={(chosen) => {
          setSession((prev: any) => prev ? {
            ...prev,
            status: 'matched',
            match_place_id: chosen.place_id,
          } : null)
        }}
      />
    )
  }

  // Rock Paper Scissors game
  if (showRockPaperScissors && participant) {
    return (
      <GenericRockPaperScissors
        session={session}
        participant={participant}
        category="restaurants"
        onBack={handleBackFromRPS}
        initialMove={pendingMove}
        gameId={rpsGameId}
        winnerContent={candidates.filter(c => swipedCandidateIds.has(c.id))} // Liked restaurants
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

  // Solo mode detection
  const isSoloMode = (session as any).invite_count_hint === 1

  // Exhausted state
  if (remainingCandidates.length === 0 && candidates.length > 0) {
    // Solo mode: show liked results instead of waiting screen
    if (isSoloMode && participant) {
      return (
        <SoloResultsScreen
          sessionId={sessionId}
          participantId={participant.id}
          category={session.category || 'restaurants'}
        />
      )
    }

    return (
      <ExhaustedScreenTemplate
        session={session}
        sessionStatus={sessionStatus}
        category="restaurants"
      />
    )
  }

  // Helper function to render the correct card based on category
  const renderCard = (candidate: Candidate, onLearnMore?: () => void) => {
    const category = session.category || candidate.category
    const contentType = candidate.content_type
    
    // Determine which card to render
    if (category === 'build-your-own' || contentType === 'custom_option') {
      return <BYOCard candidate={candidate} onLearnMore={onLearnMore} />
    } else if (category === 'streaming' || contentType?.includes('movie') || contentType?.includes('tv_')) {
      return <StreamingCard candidate={candidate} onLearnMore={onLearnMore} />
    } else {
      return <RestaurantCard candidate={candidate} onLearnMore={onLearnMore} />
    }
  }

  // Swipe interface
  return (
    <div className="h-screen bg-warm-cream flex flex-col">
      <SessionStatus
        session={session}
        sessionStatus={sessionStatus}
        remainingCount={remainingCandidates.length}
      />
      
      <SwipeInterfaceTemplate
        candidates={remainingCandidates}
        onSwipe={handleSwipe}
        renderCard={renderCard}
        categoryName={session.category || "restaurants"}
        contextDescription={(session as any)?.preferences?.contextDescription}
      />
    </div>
  )
}


