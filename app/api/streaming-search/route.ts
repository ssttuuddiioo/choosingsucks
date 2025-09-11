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

    // Build search parameters
    const searchParams: any = {
      sort_by: 'popularity_desc', // Get popular content, then we'll sort by rating
      limit: 50, // Get more titles so we can filter for the best rated ones
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

    console.log('🎬 Fetching streaming content with params:', searchParams)

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

    // Get detailed information for each title to include posters and rich data
    console.log('🔍 Fetching detailed information for each title...')
    const detailedCandidates = await Promise.all(
      searchResults.titles.map(async (title) => {
        try {
          // Fetch detailed information for this title
          const detailedTitle = await watchmode.getTitleDetails(title.id)
          
          return {
            id: detailedTitle.id,
            title: detailedTitle.title,
            original_title: detailedTitle.original_title,
            type: detailedTitle.type,
            year: detailedTitle.year,
            runtime_minutes: detailedTitle.runtime_minutes,
            plot_overview: detailedTitle.plot_overview,
            genre_names: detailedTitle.genre_names,
            user_rating: detailedTitle.user_rating,
            critic_score: detailedTitle.critic_score,
            poster: detailedTitle.poster,
            posterLarge: detailedTitle.posterLarge,
            backdrop: detailedTitle.backdrop,
            trailer: detailedTitle.trailer,
            us_rating: detailedTitle.us_rating,
            sources: detailedTitle.sources || [],
            session_id: sessionId,
          }
        } catch (error) {
          console.error(`Failed to fetch details for title ${title.id}:`, error)
          // Return basic info if detailed fetch fails
          return {
            id: title.id,
            title: title.title,
            type: title.type,
            year: title.year,
            session_id: sessionId,
            poster: null,
            plot_overview: null,
            user_rating: null,
            sources: [],
          }
        }
      })
    )

    // Sort candidates by rating (best to worst) and take top 20
    const sortedCandidates = detailedCandidates
      .filter(candidate => candidate.user_rating && candidate.user_rating > 0) // Only include rated content
      .sort((a, b) => (b.user_rating || 0) - (a.user_rating || 0)) // Sort by rating descending
      .slice(0, 20) // Take only the top 20 highest rated

    const candidates = sortedCandidates

    // TODO: Store candidates in database for session
    // For now, we'll return the data directly
    
    console.log(`📺 Prepared ${candidates.length} streaming candidates for session ${sessionId}`)
    console.log(`🏆 Top rated content: ${candidates.slice(0, 3).map(c => `${c.title} (${c.user_rating})`).join(', ')}`)

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
