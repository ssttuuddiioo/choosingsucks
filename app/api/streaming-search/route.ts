import { NextRequest, NextResponse } from 'next/server'
import { StreamingPreferences } from '@/lib/constants/streaming'
import { createServerClient } from '@/lib/utils/supabase-server'
import { generateSessionId, generateShareToken } from '@/lib/utils/session'

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

// Placeholder streaming content for development
const PLACEHOLDER_TITLES = [
  { id: 1001, title: 'The Grand Adventure', type: 'movie', year: 2024, genre_names: ['Action', 'Adventure'], user_rating: 8.2, poster: 'https://placehold.co/300x450/1a1a2e/e94560?text=Grand+Adventure', backdrop: null },
  { id: 1002, title: 'Midnight Mysteries', type: 'tv_series', year: 2024, genre_names: ['Mystery', 'Thriller'], user_rating: 8.7, poster: 'https://placehold.co/300x450/16213e/0f3460?text=Midnight+Mysteries', backdrop: null },
  { id: 1003, title: 'Love in Paris', type: 'movie', year: 2023, genre_names: ['Romance', 'Comedy'], user_rating: 7.1, poster: 'https://placehold.co/300x450/2d132c/c72c41?text=Love+in+Paris', backdrop: null },
  { id: 1004, title: 'Galaxy Runners', type: 'movie', year: 2024, genre_names: ['Science Fiction', 'Action'], user_rating: 7.8, poster: 'https://placehold.co/300x450/1b1b2f/e43f5a?text=Galaxy+Runners', backdrop: null },
  { id: 1005, title: 'The Haunting Hour', type: 'tv_series', year: 2023, genre_names: ['Horror', 'Mystery'], user_rating: 7.5, poster: 'https://placehold.co/300x450/0d0d0d/b80000?text=Haunting+Hour', backdrop: null },
  { id: 1006, title: 'Chef\'s Table Reimagined', type: 'tv_series', year: 2024, genre_names: ['Documentary'], user_rating: 8.9, poster: 'https://placehold.co/300x450/3d0c02/ff6b35?text=Chefs+Table', backdrop: null },
  { id: 1007, title: 'Code Zero', type: 'movie', year: 2024, genre_names: ['Thriller', 'Crime'], user_rating: 7.9, poster: 'https://placehold.co/300x450/0a1628/1f4068?text=Code+Zero', backdrop: null },
  { id: 1008, title: 'Fantasia Kingdom', type: 'movie', year: 2023, genre_names: ['Fantasy', 'Animation'], user_rating: 8.0, poster: 'https://placehold.co/300x450/1a0533/7b2ff7?text=Fantasia+Kingdom', backdrop: null },
  { id: 1009, title: 'War Stories', type: 'tv_miniseries', year: 2024, genre_names: ['War', 'Drama'], user_rating: 8.4, poster: 'https://placehold.co/300x450/2c2c34/ff4444?text=War+Stories', backdrop: null },
  { id: 1010, title: 'Family Ties Forever', type: 'movie', year: 2024, genre_names: ['Family', 'Comedy'], user_rating: 6.8, poster: 'https://placehold.co/300x450/1a472a/2ecc71?text=Family+Ties', backdrop: null },
  { id: 1011, title: 'Neon Nights', type: 'movie', year: 2024, genre_names: ['Action', 'Crime'], user_rating: 7.6, poster: 'https://placehold.co/300x450/1a0a2e/e040fb?text=Neon+Nights', backdrop: null },
  { id: 1012, title: 'The Last Frontier', type: 'tv_series', year: 2023, genre_names: ['Western', 'Drama'], user_rating: 8.1, poster: 'https://placehold.co/300x450/3d2b1f/d4a574?text=Last+Frontier', backdrop: null },
  { id: 1013, title: 'Ocean Deep', type: 'movie', year: 2024, genre_names: ['Adventure', 'Science Fiction'], user_rating: 7.3, poster: 'https://placehold.co/300x450/0a2351/1ca9c9?text=Ocean+Deep', backdrop: null },
  { id: 1014, title: 'Stand Up Special', type: 'tv_special', year: 2024, genre_names: ['Comedy'], user_rating: 7.7, poster: 'https://placehold.co/300x450/2d2d2d/f5c518?text=Stand+Up', backdrop: null },
  { id: 1015, title: 'Shadows of the Past', type: 'movie', year: 2023, genre_names: ['Drama', 'Mystery'], user_rating: 8.3, poster: 'https://placehold.co/300x450/1c1c1c/aaaaaa?text=Shadows', backdrop: null },
  { id: 1016, title: 'Robot Revolution', type: 'movie', year: 2024, genre_names: ['Science Fiction', 'Animation'], user_rating: 7.4, poster: 'https://placehold.co/300x450/0d1b2a/00d4ff?text=Robot+Rev', backdrop: null },
  { id: 1017, title: 'Heartstrings', type: 'tv_series', year: 2024, genre_names: ['Romance', 'Drama'], user_rating: 7.9, poster: 'https://placehold.co/300x450/2e0219/ff6b6b?text=Heartstrings', backdrop: null },
  { id: 1018, title: 'True Crime Files', type: 'tv_series', year: 2023, genre_names: ['Crime', 'Documentary'], user_rating: 8.5, poster: 'https://placehold.co/300x450/1a1a1a/e74c3c?text=True+Crime', backdrop: null },
  { id: 1019, title: 'Dragon\'s Peak', type: 'movie', year: 2024, genre_names: ['Fantasy', 'Adventure'], user_rating: 7.6, poster: 'https://placehold.co/300x450/1a0a00/ff6600?text=Dragons+Peak', backdrop: null },
  { id: 1020, title: 'Laugh Track', type: 'tv_series', year: 2024, genre_names: ['Comedy', 'Family'], user_rating: 7.0, poster: 'https://placehold.co/300x450/2d2d00/f1c40f?text=Laugh+Track', backdrop: null },
]

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

    // Handle streaming category — uses placeholder data (no Watchmode API needed)
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

    console.log(`🎬 Using placeholder streaming data for session ${sessionId}`)

    // Filter placeholder titles based on user preferences
    let filteredTitles = PLACEHOLDER_TITLES.filter(title => {
      // Filter by content type
      if (preferences.contentTypes.length > 0 && !preferences.contentTypes.includes(title.type as any)) {
        return false
      }
      return true
    })

    // Sort based on preference
    if (preferences.sortBy === 'new_releases') {
      filteredTitles.sort((a, b) => b.year - a.year)
    } else {
      filteredTitles.sort((a, b) => b.user_rating - a.user_rating)
    }

    // Take up to 10
    const candidates = filteredTitles.slice(0, 10)

    console.log(`✅ Selected ${candidates.length} placeholder titles`)

    // Store in database
    const supabase = createServerClient()

    // Create or verify session
    const { error: sessionCheckError } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .single()

    if (sessionCheckError && sessionCheckError.code === 'PGRST116') {
      // Session doesn't exist, create it
      const streamingSessionInsert: any = {
        id: sessionId,
        status: 'active',
        category: 'streaming',
        invite_count_hint: 2,
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
    } else if (sessionCheckError) {
      console.error('Error checking session:', sessionCheckError)
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
      place_id: candidate.id.toString(),
      external_id: candidate.id.toString(),
      name: candidate.title,
      title: candidate.title,
      year: candidate.year,
      genre_names: candidate.genre_names,
      user_rating: candidate.user_rating,
      poster: candidate.poster,
      image_url: candidate.poster,
      backdrop: candidate.backdrop,
      description: `A ${candidate.genre_names?.join(', ')} ${candidate.type === 'movie' ? 'film' : 'series'} from ${candidate.year}.`,
      metadata: {
        placeholder: true,
        backdrop: candidate.backdrop,
      },
      tags: candidate.genre_names,
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

    console.log(`📺 Stored ${candidates.length} placeholder streaming candidates for session ${sessionId}`)

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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  return new Response('ok', { headers: corsHeaders })
}
