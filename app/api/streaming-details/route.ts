import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/utils/supabase-server'
import { WatchmodeClient } from '@/lib/utils/watchmode-client'
import { trackWatchmodeCall } from '@/lib/utils/api-tracker'

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { candidateId } = await req.json()

    if (!candidateId) {
      return NextResponse.json(
        { error: 'Missing candidateId parameter' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Get candidate to check if details already cached
    const { data: candidate } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single()

    const candidateData = candidate as any

    if (!candidateData) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      )
    }

    // Validate this is actually a streaming candidate
    const contentType = candidateData.content_type
    const actualCategory = candidateData.category
    const isStreamingContent = 
      actualCategory === 'streaming' || 
      contentType?.includes('movie') || 
      contentType?.includes('tv_')

    if (!isStreamingContent) {
      console.log(`⚠️ Skipping streaming-details for non-streaming content: ${contentType}`)
      return NextResponse.json(
        { error: 'Not a streaming title', skipped: true },
        { status: 400 }
      )
    }

    // Check if details are already cached and still fresh (7 days)
    const metadata = candidateData.metadata || {}
    const detailsCachedAt = metadata.details_cached_at
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    if (detailsCachedAt && new Date(detailsCachedAt) > sevenDaysAgo && candidateData.plot_overview) {
      console.log(`📦 Using cached details for ${candidateData.title} (cached ${Math.floor((Date.now() - new Date(detailsCachedAt).getTime()) / (1000 * 60 * 60))}h ago)`)
      
      return NextResponse.json({
        plot_overview: candidateData.plot_overview,
        runtime_minutes: candidateData.runtime_minutes,
        us_rating: candidateData.us_rating,
        trailer: candidateData.trailer,
        critic_score: candidateData.critic_score,
        sources: candidateData.sources,
        cached: true
      })
    }

    // Not cached or stale - fetch from Watchmode
    const watchmodeApiKey = process.env.WATCHMODE_API_KEY
    if (!watchmodeApiKey) {
      return NextResponse.json(
        { error: 'Watchmode API key not configured' },
        { status: 500 }
      )
    }

    const watchmode = new WatchmodeClient(watchmodeApiKey)
    const watchmodeId = metadata.watchmode_id || parseInt(candidateData.external_id)

    if (!watchmodeId) {
      return NextResponse.json(
        { error: 'No Watchmode ID found' },
        { status: 400 }
      )
    }

    console.log(`🎬 Fetching details for ${candidateData.title} (Watchmode ID: ${watchmodeId})`)

    const detailsStartTime = Date.now()
    try {
      const detailedTitle = await watchmode.getTitleDetails(watchmodeId)
      const detailsDuration = Date.now() - detailsStartTime

      // Track successful API call
      await trackWatchmodeCall(
        'title_details',
        true,
        detailsDuration,
        { 
          sessionId: candidateData.session_id,
          candidateId,
          metadata: { titleId: watchmodeId, titleName: candidateData.title }
        },
        200
      )

      // Cache the details in the database
      await (supabase as any)
        .from('candidates')
        .update({
          plot_overview: detailedTitle.plot_overview,
          runtime_minutes: detailedTitle.runtime_minutes,
          us_rating: detailedTitle.us_rating,
          trailer: detailedTitle.trailer,
          critic_score: detailedTitle.critic_score,
          sources: detailedTitle.sources,
          metadata: {
            ...metadata,
            details_cached_at: new Date().toISOString(),
            details_fetched_via: 'lazy_load'
          }
        })
        .eq('id', candidateId)

      console.log(`✅ Fetched and cached details for ${candidateData.title}`)

      return NextResponse.json({
        plot_overview: detailedTitle.plot_overview,
        runtime_minutes: detailedTitle.runtime_minutes,
        us_rating: detailedTitle.us_rating,
        trailer: detailedTitle.trailer,
        critic_score: detailedTitle.critic_score,
        sources: detailedTitle.sources,
        cached: false
      })

    } catch (error) {
      const detailsDuration = Date.now() - detailsStartTime
      console.error('Error fetching Watchmode details:', error)

      // Track failed API call
      await trackWatchmodeCall(
        'title_details',
        false,
        detailsDuration,
        { 
          sessionId: candidateData.session_id,
          candidateId,
          metadata: { titleId: watchmodeId, titleName: candidateData.title }
        },
        500,
        error instanceof Error ? error.message : 'Unknown error'
      )

      return NextResponse.json(
        { error: 'Failed to fetch streaming details' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in streaming-details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

