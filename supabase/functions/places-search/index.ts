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
    const { sessionId, lat, lng, maxPriceLevel } = await req.json()
    
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

    // Build price levels array based on maxPriceLevel
    const priceLevels = []
    if (maxPriceLevel && maxPriceLevel < 4) {
      // If a price limit is set, include all levels up to that limit
      // Skip PRICE_LEVEL_FREE as requested
      if (maxPriceLevel >= 1) priceLevels.push('PRICE_LEVEL_INEXPENSIVE')
      if (maxPriceLevel >= 2) priceLevels.push('PRICE_LEVEL_MODERATE')
      if (maxPriceLevel >= 3) priceLevels.push('PRICE_LEVEL_EXPENSIVE')
      // Note: maxPriceLevel 4 means include all, so we don't set priceLevels filter
    }
    
    // Use the new Places API (Text Search)
    const placesUrl = `https://places.googleapis.com/v1/places:searchText`
    
    const requestBody: any = {
      textQuery: 'restaurants',
      locationBias: {
        circle: {
          center: {
            latitude: lat,
            longitude: lng
          },
          radius: 3000.0  // Changed from 8000 to match UI
        }
      },
      maxResultCount: 20,
      languageCode: 'en'
    }
    
    // Only add priceLevels if we're filtering (not showing all)
    if (maxPriceLevel && maxPriceLevel < 4 && priceLevels.length > 0) {
      requestBody.priceLevels = priceLevels
    } else if (maxPriceLevel === 4 || !maxPriceLevel) {
      // Include all price levels when maxPriceLevel is 4 or not specified
      requestBody.priceLevels = [
        'PRICE_LEVEL_INEXPENSIVE',
        'PRICE_LEVEL_MODERATE', 
        'PRICE_LEVEL_EXPENSIVE',
        'PRICE_LEVEL_VERY_EXPENSIVE'
      ]
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

    if (!placesResponse.ok) {
      const errorText = await placesResponse.text()
      console.error('Places API error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch places from Google API' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const placesData = await placesResponse.json()
    
    if (!placesData.places || placesData.places.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No restaurants found in this area' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Transform and insert candidates
    const candidates = placesData.places.map((place: any) => {
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
      maxPriceLevel: maxPriceLevel || 'all',
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
