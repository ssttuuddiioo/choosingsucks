import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { sessionId, candidateId, participantId } = await req.json()

    if (!sessionId || !candidateId || !participantId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔍 Checking for match:', { sessionId, candidateId, participantId })

    // Get session details including match requirements
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('match_requirement, allow_multiple_matches')
      .eq('id', sessionId)
      .single()

    if (sessionError) {
      console.error('Error fetching session:', sessionError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get all participants in this session
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('id')
      .eq('session_id', sessionId)

    if (participantsError) {
      console.error('Error fetching participants:', participantsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch participants' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const totalParticipants = participants.length
    console.log('👥 Total participants in session:', totalParticipants)

    // Check likes for this candidate
    const { data: likes, error: likesError } = await supabase
      .from('swipes')
      .select('participant_id')
      .eq('session_id', sessionId)
      .eq('candidate_id', candidateId)
      .eq('vote', 1) // 1 = like

    if (likesError) {
      console.error('Error fetching likes:', likesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch likes' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const likesCount = likes.length
    console.log('❤️ Likes for this candidate:', { candidateId, likesCount, totalParticipants, matchRequirement: session.match_requirement })

    // Determine if we have a match based on requirements
    const requiredLikes = session.match_requirement === 'majority' 
      ? Math.ceil(totalParticipants / 2)
      : totalParticipants

    const hasMatch = likesCount >= requiredLikes

    // If multiple matches are allowed, don't trigger match until everyone is done
    if (session.allow_multiple_matches && hasMatch) {
      // Check if everyone has finished voting
      const { data: submittedParticipants, error: submittedError } = await supabase
        .from('participants')
        .select('id')
        .eq('session_id', sessionId)
        .not('submitted_at', 'is', null)

      if (submittedError) {
        console.error('Error checking submitted participants:', submittedError)
        return new Response(
          JSON.stringify({ error: 'Failed to check submission status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (submittedParticipants.length < totalParticipants) {
        console.log('🕐 Match found but waiting for all participants to finish voting')
        return new Response(
          JSON.stringify({
            match: false,
            likesCount,
            totalParticipants,
            message: `Match found but waiting for everyone to finish voting (${submittedParticipants.length}/${totalParticipants} done)`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Everyone is done, find all matches
      console.log('🔍 Finding all matches since everyone is done voting')
      // This will be handled by a separate function call when the last person finishes
      return new Response(
        JSON.stringify({
          match: false,
          likesCount,
          totalParticipants,
          message: 'Checking all matches since everyone finished voting'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for immediate match (single match mode or first match in multiple mode)
    if (hasMatch) {
      console.log('🎉 MATCH FOUND!', { candidateId })

      // Get candidate details
      const { data: candidate, error: candidateError } = await supabase
        .from('candidates')
        .select('*')
        .eq('id', candidateId)
        .single()

      if (candidateError) {
        console.error('Error fetching candidate:', candidateError)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch candidate details' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update session status to matched
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          status: 'matched',
          match_place_id: candidate.place_id,
          match_reason: `All ${totalParticipants} participants liked this restaurant`
        })
        .eq('id', sessionId)

      if (updateError) {
        console.error('Error updating session:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Broadcast match found event
      const { error: broadcastError } = await supabase
        .channel(`session:${sessionId}`)
        .send({
          type: 'broadcast',
          event: 'match_found',
          payload: {
            placeId: candidate.place_id,
            candidateId: candidate.id,
            restaurantName: candidate.name
          }
        })

      if (broadcastError) {
        console.error('Error broadcasting match:', broadcastError)
      }

      return new Response(
        JSON.stringify({
          match: true,
          candidate: candidate,
          message: `Match found! All ${totalParticipants} participants liked ${candidate.name}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // No match yet
    return new Response(
      JSON.stringify({
        match: false,
        likesCount,
        totalParticipants,
        message: `${likesCount}/${totalParticipants} participants liked this restaurant`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Match check error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
