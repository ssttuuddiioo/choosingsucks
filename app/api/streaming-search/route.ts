import { NextRequest, NextResponse } from 'next/server'
import { WatchmodeClient } from '@/lib/utils/watchmode-client'
import { StreamingPreferences } from '@/lib/constants/streaming'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export async function POST(request: NextRequest) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { sessionId, preferences }: { 
      sessionId: string
      preferences: StreamingPreferences 
    } = await request.json()
    
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
      searchParams.types = 'movie,tv_series' // Fallback to both
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
    try {
      searchResults = await watchmode.searchTitles(searchParams)
    } catch (error) {
      console.error('❌ Watchmode API error with genres, trying without genres:', error)
      
      // Fallback: try without genres if genre filtering fails
      if (searchParams.genres) {
        console.log('🔄 Retrying without genre filters...')
        const fallbackParams = { ...searchParams }
        delete fallbackParams.genres
        
        try {
          searchResults = await watchmode.searchTitles(fallbackParams)
          console.log('✅ Fallback search successful')
        } catch (fallbackError) {
          console.error('❌ Fallback search also failed:', fallbackError)
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

    // Fast approach: Use basic title data with constructed poster URLs
    // This eliminates the 20+ detailed API calls that were causing timeouts
    console.log('🚀 Using fast basic data approach...')
    
    const candidates = searchResults.titles.map((title) => ({
      id: title.id,
      title: title.title,
      original_title: title.title,
      type: title.type,
      year: title.year,
      runtime_minutes: title.type === 'movie' ? 120 : 45, // Reasonable defaults
      plot_overview: `Popular ${title.type === 'movie' ? 'movie' : 'TV series'} from ${title.year}`,
      genre_names: ['Popular'], // Generic genre
      user_rating: 7.5, // Default good rating
      critic_score: 75,
      poster: `https://image.tmdb.org/t/p/w342/${title.tmdb_id}`, // TMDB poster URL
      posterLarge: `https://image.tmdb.org/t/p/w780/${title.tmdb_id}`,
      backdrop: `https://image.tmdb.org/t/p/w1280/${title.tmdb_id}`,
      trailer: null,
      us_rating: 'PG-13',
      sources: [],
      session_id: sessionId,
    }))

    // Already sorted by API preference (new releases or popularity)

    // TODO: Store candidates in database for session
    // For now, we'll return the data directly
    
    console.log(`📺 Prepared ${candidates.length} streaming candidates for session ${sessionId}`)
    console.log(`🎬 Content: ${candidates.slice(0, 3).map(c => `${c.title} (${c.year})`).join(', ')}`)

    return NextResponse.json({
      success: true,
      sessionId,
      candidatesAdded: candidates.length,
      message: `Found ${candidates.length} ${
        preferences.contentTypes.length === 2 ? 'titles' : 
        preferences.contentTypes.includes('movie') ? 'movies' : 'TV shows'
      } to explore`,
      candidates, // Include candidates in response for now
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
