import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/utils/env'
import { trackGooglePlacesCall } from '@/lib/utils/api-tracker'

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { placeId } = await req.json()

    if (!placeId) {
      return NextResponse.json(
        { error: 'Missing placeId parameter' },
        { status: 400 }
      )
    }

    const apiKey = env.google.mapsApiKey
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      )
    }

    // Call Google Places API Place Details with enhanced fields
    const placeDetailsUrl = `https://places.googleapis.com/v1/places/${placeId}`
    
    const response = await fetch(placeDetailsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': [
          'id',
          'displayName',
          'formattedAddress',
          'internationalPhoneNumber',
          'websiteUri',
          'editorialSummary',
          'photos',
          'regularOpeningHours',
          'businessStatus',
          'delivery',
          'dineIn',
          'takeout',
          'reservable',
          'servesBreakfast',
          'servesLunch',
          'servesDinner',
          'servesBrunch',
          'servesVegetarianFood',
          'goodForChildren',
          'goodForGroups',
          'parkingOptions',
          'paymentOptions',
          'accessibilityOptions'
        ].join(',')
      }
    })

    const responseTime = Date.now() - startTime

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Places API error:', errorText)
      
      // Track failed API call
      await trackGooglePlacesCall(
        'place_details',
        false,
        responseTime,
        {},
        response.status,
        errorText
      )
      
      return NextResponse.json(
        { error: 'Failed to fetch place details' },
        { status: response.status }
      )
    }

    const placeData = await response.json()
    console.log('📍 Place details fetched:', placeData.displayName?.text)
    
    // Track successful API call
    await trackGooglePlacesCall(
      'place_details',
      true,
      responseTime,
      { metadata: { placeId, placeName: placeData.displayName?.text } },
      response.status
    )

    // Transform into our format
    const amenities: string[] = []
    
    // Service options
    if (placeData.dineIn) amenities.push('Dine-in')
    if (placeData.takeout) amenities.push('Takeout')
    if (placeData.delivery) amenities.push('Delivery')
    if (placeData.reservable) amenities.push('Reservations')
    
    // Meal services
    if (placeData.servesBreakfast) amenities.push('Breakfast')
    if (placeData.servesLunch) amenities.push('Lunch')
    if (placeData.servesDinner) amenities.push('Dinner')
    if (placeData.servesBrunch) amenities.push('Brunch')
    
    // Dietary & groups
    if (placeData.servesVegetarianFood) amenities.push('Vegetarian options')
    if (placeData.goodForChildren) amenities.push('Kid-friendly')
    if (placeData.goodForGroups) amenities.push('Good for groups')

    // Accessibility
    if (placeData.accessibilityOptions?.wheelchairAccessibleEntrance) {
      amenities.push('Wheelchair accessible')
    }

    // Get photo URLs (return photo references, client will construct URLs)
    const photos = placeData.photos?.slice(0, 5).map((photo: any) => photo.name) || []

    // Format opening hours
    const hours = placeData.regularOpeningHours?.weekdayDescriptions || []

    const enhancedData = {
      description: placeData.editorialSummary?.text || null,
      phone: placeData.internationalPhoneNumber || null,
      website: placeData.websiteUri || null,
      hours: hours.length > 0 ? hours : null,
      photos: photos.length > 0 ? photos : null,
      amenities: amenities.length > 0 ? amenities : null,
      businessStatus: placeData.businessStatus || null,
      externalLinks: {
        googleMaps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeData.displayName?.text || '')}&query_place_id=${placeId}`,
        website: placeData.websiteUri || null
      }
    }

    return NextResponse.json(enhancedData)
  } catch (error) {
    console.error('Error in restaurant-details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

