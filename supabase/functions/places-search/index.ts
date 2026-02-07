import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { sessionId, lat, lng, radius, maxPriceLevel, selectedPriceLevels, keywords, limit } = await req.json()
    
    // Validate required parameters
    if (!sessionId || !lat || !lng) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: sessionId, lat, lng' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Convert radius from miles to meters (default to 2.5 miles if not provided)
    const radiusInMeters = (radius || 2.5) * 1609.34
    
    console.log('🎯 Places Search Debug:', {
      inputRadius: radius,
      radiusInMeters,
      center: { lat, lng },
      conversion: `${radius} miles = ${radiusInMeters} meters`,
      keywords: keywords || [],
      textQuery: keywords && keywords.length > 0 ? `restaurants ${keywords.join(' ')}` : 'restaurants',
      sortStrategy: 'rating (highest to lowest)'
    })

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')!

    if (!googleApiKey) {
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Track API call start time
    const apiCallStartTime = Date.now()

    // Check if session exists
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Build price levels array based on selectedPriceLevels
    const priceLevels = []
    if (selectedPriceLevels && Array.isArray(selectedPriceLevels)) {
      // Map numeric levels to Google API strings
      selectedPriceLevels.forEach(level => {
        switch(level) {
          case 1: priceLevels.push('PRICE_LEVEL_INEXPENSIVE'); break
          case 2: priceLevels.push('PRICE_LEVEL_MODERATE'); break
          case 3: priceLevels.push('PRICE_LEVEL_EXPENSIVE'); break
          case 4: priceLevels.push('PRICE_LEVEL_VERY_EXPENSIVE'); break
        }
      })
    } else {
      // Fallback to all price levels if not specified
      priceLevels.push('PRICE_LEVEL_INEXPENSIVE', 'PRICE_LEVEL_MODERATE', 'PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE')
    }
    
    // Use the new Places API (Text Search)
    const placesUrl = `https://places.googleapis.com/v1/places:searchText`
    
    // Build text query with keywords
    let textQuery = 'restaurants'
    if (keywords && keywords.length > 0) {
      textQuery = `restaurants ${keywords.join(' ')}`
    }

    const requestBody: any = {
      textQuery,
      locationBias: {
        circle: {
          center: {
            latitude: lat,
            longitude: lng
          },
          radius: radiusInMeters
        }
      },
      maxResultCount: 20,
      languageCode: 'en'
    }
    
    // Always add price levels filter
    if (priceLevels.length > 0) {
      requestBody.priceLevels = priceLevels
    }
    
    
    const placesResponse = await fetch(placesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleApiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.photos,places.rating,places.userRatingCount,places.priceLevel,places.location'
      },
      body: JSON.stringify(requestBody)
    })

    const apiCallDuration = Date.now() - apiCallStartTime

    if (!placesResponse.ok) {
      const errorText = await placesResponse.text()
      console.error('Places API error:', errorText)
      
      // Track failed API call
      await supabase.from('api_usage').insert({
        session_id: sessionId,
        api_provider: 'google_places',
        api_endpoint: 'text_search',
        request_count: 1,
        unit_cost_usd: 0.032,
        total_cost_usd: 0.032,
        response_time_ms: apiCallDuration,
        success: false,
        status_code: placesResponse.status,
        error_message: errorText.substring(0, 500),
        metadata: { radius, lat, lng }
      })
      
      return new Response(
        JSON.stringify({ error: 'Failed to fetch places from Google API' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const placesData = await placesResponse.json()
    
    // Track successful API call
    await supabase.from('api_usage').insert({
      session_id: sessionId,
      api_provider: 'google_places',
      api_endpoint: 'text_search',
      request_count: 1,
      unit_cost_usd: 0.032,
      total_cost_usd: 0.032,
      response_time_ms: apiCallDuration,
      success: true,
      status_code: placesResponse.status,
      metadata: { 
        radius, 
        lat, 
        lng,
        results_count: placesData.places?.length || 0
      }
    })
    
    console.log(`💰 Google Places API: $0.032 (${apiCallDuration}ms, ${placesData.places?.length || 0} results)`)
    
    if (!placesData.places || placesData.places.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No restaurants found in this area' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Helper function to calculate distance between two points in meters
    function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
      const R = 6371000 // Earth's radius in meters
      const dLat = (lat2 - lat1) * Math.PI / 180
      const dLng = (lng2 - lng1) * Math.PI / 180
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      return R * c
    }

    // Filter and transform candidates - only include restaurants within the actual radius
    const filteredPlaces = placesData.places.filter((place: any) => {
      if (!place.location?.latitude || !place.location?.longitude) return false
      const distance = calculateDistance(lat, lng, place.location.latitude, place.location.longitude)
      const withinRadius = distance <= radiusInMeters
      if (!withinRadius) {
        console.log(`🚫 Filtered out: ${place.displayName?.text} (${(distance/1609.34).toFixed(2)} miles away)`)
      }
      return withinRadius
    })

    console.log(`📊 Filtering results: ${placesData.places.length} → ${filteredPlaces.length} restaurants within ${radius} miles`)

    // Sort by rating (highest to lowest) for faster matches
    // Places with no rating go to the end
    const sortedPlaces = filteredPlaces.sort((a: any, b: any) => {
      const ratingA = a.rating || 0
      const ratingB = b.rating || 0
      return ratingB - ratingA // Descending order (highest first)
    })

    // Limit to requested count (default 10)
    const maxCandidates = limit || 10
    const limitedPlaces = sortedPlaces.slice(0, maxCandidates)

    console.log(`⭐ Top ${limitedPlaces.length} rating-sorted restaurants:`, limitedPlaces.slice(0, 5).map((place: any) => ({
      name: place.displayName?.text,
      rating: place.rating || 'no rating'
    })))

    const candidates = limitedPlaces.map((place: any) => {
      // Convert price level string to number
      let priceLevel = null
      if (place.priceLevel) {
        switch (place.priceLevel) {
          case 'PRICE_LEVEL_FREE': priceLevel = 0; break
          case 'PRICE_LEVEL_INEXPENSIVE': priceLevel = 1; break
          case 'PRICE_LEVEL_MODERATE': priceLevel = 2; break
          case 'PRICE_LEVEL_EXPENSIVE': priceLevel = 3; break
          case 'PRICE_LEVEL_VERY_EXPENSIVE': priceLevel = 4; break
        }
      }

      return {
        session_id: sessionId,
        place_id: place.id,
        name: place.displayName?.text || 'Unknown Restaurant',
        lat: place.location?.latitude || 0,
        lng: place.location?.longitude || 0,
        rating: place.rating || null,
        user_ratings_total: place.userRatingCount || null,
        price_level: priceLevel,
        photo_ref: place.photos?.[0]?.name || null,
        url: null, // We don't have URL from the new API
        cuisines: null // We don't have cuisines from the new API
      }
    })

    // Insert candidates into database
    console.log('📝 Attempting to insert candidates:', {
      count: candidates.length,
      sessionId,
      selectedPriceLevels: selectedPriceLevels || 'all',
      priceLevelsUsed: requestBody.priceLevels,
      restaurants: candidates.map(c => ({
        name: c.name,
        rating: c.rating,
        price_level: c.price_level,
        photo_ref: c.photo_ref ? 'has_photo' : 'no_photo',
        lat: c.lat,
        lng: c.lng
      }))
    })
    
    const { error: insertError } = await supabase
      .from('candidates')
      .insert(candidates)

    if (insertError) {
      console.error('Database insert error:', insertError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to save restaurant data',
          details: insertError.message,
          candidates: candidates.length
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        candidatesAdded: candidates.length,
        message: `Added ${candidates.length} restaurants to session`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Places search error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
