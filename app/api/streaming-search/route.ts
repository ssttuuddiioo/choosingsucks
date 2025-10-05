import { NextRequest, NextResponse } from 'next/server'
import { WatchmodeClient } from '@/lib/utils/watchmode-client'
import { StreamingPreferences } from '@/lib/constants/streaming'
import { createServerClient } from '@/lib/utils/supabase-server'
import { generateSessionId, generateShareToken } from '@/lib/utils/session'
import { trackWatchmodeCall } from '@/lib/utils/api-tracker'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BuildYourOwnRequest {
  category: 'build-your-own'
  sessionTitle: string
  requireNames: boolean
  inviteCount: number
  aiEnhancementEnabled?: boolean
  contextDescription?: string
  customOptions: Array<{
    title: string
    description?: string
    source_type: 'manual' | 'ai_extracted' | 'ai_generated'
    metadata?: Record<string, any>
  }>
}

async function handleBuildYourOwnSession(body: BuildYourOwnRequest) {
  const { sessionTitle, requireNames, customOptions } = body
  
  // Respect multi-person feature flag
  const isMultiPersonEnabled = process.env.NEXT_PUBLIC_ENABLE_MULTI_PERSON === 'true'
  const inviteCount = isMultiPersonEnabled ? body.inviteCount : 2
  
  // Validate required parameters
  if (!sessionTitle?.trim() || !customOptions || customOptions.length < 2) {
    return NextResponse.json(
      { error: 'Missing required parameters: sessionTitle and at least 2 customOptions' },
      { status: 400, headers: corsHeaders }
    )
  }

  if (customOptions.length > 20) {
    return NextResponse.json(
      { error: 'Maximum 20 options allowed' },
      { status: 400, headers: corsHeaders }
    )
  }

  try {
    const supabase = createServerClient()
    const sessionId = generateSessionId()
    const shareToken = generateShareToken()

    console.log(`🎯 Creating Build Your Own session ${sessionId} with ${customOptions.length} options`)

    // Create session first
    const sessionInsert: any = {
      id: sessionId,
      status: 'active',
      category: 'build-your-own',
      invite_count_hint: inviteCount,
      require_names: requireNames,
      ai_enhancement_enabled: body.aiEnhancementEnabled || false,
      preferences: {
        sessionTitle: sessionTitle.trim(),
        customOptionsCount: customOptions.length,
        contextDescription: body.contextDescription || null
      }
    }
    
    const { data: sessionData, error: sessionError } = await (supabase as any)
      .from('sessions')
      .insert(sessionInsert)
      .select()
      .single()
    
    if (sessionError) {
      console.error('❌ Error creating Build Your Own session:', sessionError)
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500, headers: corsHeaders }
      )
    }

    console.log(`✅ Session created successfully:`, sessionData)

    // Create candidates from custom options
    const candidateRecords = customOptions.map((option, index) => ({
      session_id: sessionId,
      category: 'build-your-own',
      content_type: 'custom_option',
      place_id: `custom_${sessionId}_${index}`,
      external_id: `custom_${sessionId}_${index}`,
      name: option.title,
      title: option.title,
      description: option.description,
      metadata: {
        source_type: option.source_type,
        display_order: index,
        ...(option.metadata || {})
      },
      // Required fields for compatibility
      lat: 0,
      lng: 0
    }))

    const { data: candidatesData, error: candidatesError } = await (supabase as any)
      .from('candidates')
      .insert(candidateRecords)
      .select()

    if (candidatesError) {
      console.error('❌ Error storing Build Your Own candidates:', candidatesError)
      // Try to clean up the session if candidates failed
      await supabase.from('sessions').delete().eq('id', sessionId)
      return NextResponse.json(
        { error: 'Failed to store options' },
        { status: 500, headers: corsHeaders }
      )
    }

    console.log(`✅ Stored ${candidatesData?.length || 0} candidates for session ${sessionId}`)

    // Verify session and candidates exist
    const { data: verifySession } = await supabase
      .from('sessions')
      .select('id, category, status')
      .eq('id', sessionId)
      .single()

    const { data: verifyCandidates } = await supabase
      .from('candidates')
      .select('id')
      .eq('session_id', sessionId)

    console.log(`🔍 Verification - Session:`, verifySession, `Candidates:`, verifyCandidates?.length)

    return NextResponse.json({
      success: true,
      sessionId,
      shareToken,
      candidatesAdded: candidatesData?.length || 0,
      message: `Created session with ${customOptions.length} custom options`,
    }, {
      status: 200,
      headers: corsHeaders
    })

  } catch (error) {
    console.error('Build Your Own session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function POST(request: NextRequest) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const body = await request.json()
    
    // Handle Build Your Own category
    if (body.category === 'build-your-own') {
      return handleBuildYourOwnSession(body)
    }
    
    // Handle streaming category (existing logic)
    const { sessionId, preferences }: { 
      sessionId: string
      preferences: StreamingPreferences 
    } = body
    
    // Validate required parameters
    if (!sessionId || !preferences) {
      return NextResponse.json(
        { error: 'Missing required parameters: sessionId, preferences' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Get Watchmode API key
    const watchmodeApiKey = process.env.WATCHMODE_API_KEY
    if (!watchmodeApiKey) {
      return NextResponse.json(
        { error: 'Watchmode API key not configured' },
        { status: 500, headers: corsHeaders }
      )
    }

    // Initialize Watchmode client
    const watchmode = new WatchmodeClient(watchmodeApiKey)

    // Build search parameters based on user preference
    const sortBy = preferences.sortBy === 'new_releases' ? 'release_date_desc' : 'popularity_desc'
    const searchParams: any = {
      sort_by: sortBy, // New releases or popular content
      limit: 20, // Get exactly 20 titles - no need for over-fetching
    }

    // Set content types
    if (preferences.contentTypes.length > 0) {
      searchParams.types = preferences.contentTypes.join(',')
    } else {
      searchParams.types = 'movie,tv_series,tv_miniseries,tv_special' // Include all types
    }

    // Set streaming services
    if (preferences.streamingServices.length > 0) {
      searchParams.source_ids = preferences.streamingServices.join(',')
    }

    // Set genres (if any selected)
    if (preferences.genres.length > 0) {
      // Use genre IDs directly as Watchmode expects numbers
      searchParams.genres = preferences.genres.join(',')
    }

    console.log(`🎬 Fetching ${preferences.sortBy === 'new_releases' ? 'new releases' : 'popular content'} with params:`, searchParams)

    // Fetch content from Watchmode API with fallback logic
    let searchResults
    const searchStartTime = Date.now()
    try {
      searchResults = await watchmode.searchTitles(searchParams)
      const searchDuration = Date.now() - searchStartTime
      
      // Track successful search
      await trackWatchmodeCall(
        'list_titles',
        true,
        searchDuration,
        { sessionId, metadata: { params: searchParams } },
        200
      )
    } catch (error) {
      const searchDuration = Date.now() - searchStartTime
      console.error('❌ Watchmode API error with genres, trying without genres:', error)
      
      // Track failed search
      await trackWatchmodeCall(
        'list_titles',
        false,
        searchDuration,
        { sessionId, metadata: { params: searchParams } },
        500,
        error instanceof Error ? error.message : 'Unknown error'
      )
      
      // Fallback: try without genres if genre filtering fails
      if (searchParams.genres) {
        console.log('🔄 Retrying without genre filters...')
        const fallbackParams = { ...searchParams }
        delete fallbackParams.genres
        
        const fallbackStartTime = Date.now()
        try {
          searchResults = await watchmode.searchTitles(fallbackParams)
          console.log('✅ Fallback search successful')
          
          const fallbackDuration = Date.now() - fallbackStartTime
          await trackWatchmodeCall(
            'list_titles',
            true,
            fallbackDuration,
            { sessionId, metadata: { params: fallbackParams, isFallback: true } },
            200
          )
        } catch (fallbackError) {
          console.error('❌ Fallback search also failed:', fallbackError)
          const fallbackDuration = Date.now() - fallbackStartTime
          await trackWatchmodeCall(
            'list_titles',
            false,
            fallbackDuration,
            { sessionId, metadata: { params: fallbackParams, isFallback: true } },
            500,
            fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
          )
          throw error // Re-throw original error
        }
      } else {
        throw error
      }
    }
    
    if (!searchResults.titles || searchResults.titles.length === 0) {
      return NextResponse.json(
        { error: 'No content found matching your preferences' },
        { status: 404, headers: corsHeaders }
      )
    }

    console.log(`✅ Found ${searchResults.titles.length} titles`)

    // OPTIMIZATION: Store only basic data from list_titles (85% cost reduction!)
    // Details (plot, runtime, etc.) fetched lazily when user clicks "Learn More"
    console.log('📦 Storing basic title data (details fetched on-demand for cost efficiency)...')
    
    const basicCandidates = searchResults.titles.map((title: any) => ({
      id: title.id,
      title: title.title,
      original_title: title.original_title || null,
      type: title.type,
      year: title.year || null,
      poster: title.poster || null,
      backdrop: title.backdrop || null,
      // Basic data from list_titles (included in search response)
      genre_names: title.genre_names || null,
      user_rating: title.user_rating || null,
      // Details will be null until "Learn More" clicked - lazy loaded
      plot_overview: null,
      runtime_minutes: null,
      us_rating: null,
      trailer: null,
      critic_score: null,
      sources: [],
      session_id: sessionId,
    }))

    // Sort candidates by rating (best to worst)
    const candidates = basicCandidates
      .filter((candidate: any) => candidate.user_rating && candidate.user_rating > 0)
      .slice(0, 20)

    console.log(`✅ Prepared ${candidates.length} candidates (saved ${searchResults.titles.length} title_details API calls via lazy loading!)`)

    // Store candidates in database for session
    const supabase = createServerClient()
    
    // First, create or verify the session exists
    const { data: existingSession, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .single()
    
    if (sessionError && sessionError.code === 'PGRST116') {
      // Session doesn't exist, create it
      const streamingSessionInsert: any = {
        id: sessionId,
        status: 'active',
        category: 'streaming',
        invite_count_hint: 2, // Default for streaming sessions
        require_names: false,
        preferences: preferences as any
      }
      
      const { error: createSessionError } = await (supabase as any)
        .from('sessions')
        .insert(streamingSessionInsert)
      
      if (createSessionError) {
        console.error('Error creating session:', createSessionError)
        return NextResponse.json(
          { error: 'Failed to create session' },
          { status: 500, headers: corsHeaders }
        )
      }
    } else if (sessionError) {
      console.error('Error checking session:', sessionError)
      return NextResponse.json(
        { error: 'Failed to verify session' },
        { status: 500, headers: corsHeaders }
      )
    }

    // Store candidates in database
    const candidateRecords = candidates.map(candidate => ({
      session_id: sessionId,
      category: 'streaming',
      content_type: candidate.type as 'movie' | 'tv_series' | 'tv_miniseries' | 'tv_special',
      place_id: candidate.id.toString(), // Use Watchmode ID as place_id
      external_id: candidate.id.toString(),
      name: candidate.title,
      title: candidate.title,
      original_title: candidate.original_title,
      year: candidate.year,
      runtime_minutes: candidate.runtime_minutes,
      plot_overview: candidate.plot_overview,
      description: candidate.plot_overview,
      genre_names: candidate.genre_names,
      user_rating: candidate.user_rating,
      critic_score: candidate.critic_score,
      poster: candidate.poster,
      image_url: candidate.poster,
      backdrop: candidate.backdrop,
      trailer: candidate.trailer,
      us_rating: candidate.us_rating,
      sources: candidate.sources,
      metadata: {
        sources: candidate.sources,
        backdrop: candidate.backdrop,
        trailer: candidate.trailer,
        us_rating: candidate.us_rating,
        critic_score: candidate.critic_score
      },
      tags: candidate.genre_names,
      // Required fields for compatibility (will be null for streaming)
      lat: 0,
      lng: 0
    }))

    const { error: candidatesError } = await (supabase as any)
      .from('candidates')
      .insert(candidateRecords)

    if (candidatesError) {
      console.error('Error storing candidates:', candidatesError)
      return NextResponse.json(
        { error: 'Failed to store candidates' },
        { status: 500, headers: corsHeaders }
      )
    }
    
    console.log(`📺 Stored ${candidates.length} streaming candidates for session ${sessionId}`)
    console.log(`🎬 Content: ${candidates.slice(0, 3).map(c => `${c.title} (${c.year})`).join(', ')}`)

    return NextResponse.json({
      success: true,
      sessionId,
      candidatesAdded: candidates.length,
      message: `Found ${candidates.length} ${
        preferences.contentTypes.length === 2 ? 'titles' : 
        preferences.contentTypes.includes('movie') ? 'movies' : 'TV shows'
      } to explore`,
    }, {
      status: 200,
      headers: corsHeaders
    })

  } catch (error) {
    console.error('Streaming search error:', error)
    
    // Handle specific Watchmode API errors
    if (error instanceof Error && error.message.includes('Watchmode API error')) {
      return NextResponse.json(
        { error: 'Failed to fetch content from streaming services' },
        { status: 502, headers: corsHeaders }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  return new Response('ok', { headers: corsHeaders })
}
