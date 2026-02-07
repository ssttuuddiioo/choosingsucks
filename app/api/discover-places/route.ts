import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/utils/env'

// Rate limiting: 5 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const limit = rateLimitMap.get(ip)

  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 })
    return true
  }

  if (limit.count >= 15) return false
  limit.count++
  return true
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const { lat, lng, radius, keywords, selectedPriceLevels, minRating } = await request.json()

    if (!lat || !lng) {
      return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
    }

    const apiKey = env.google.mapsApiKey
    if (!apiKey) {
      return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 })
    }

    const radiusInMeters = (radius || 2.5) * 1609.34

    // Build price levels filter
    const priceLevels: string[] = []
    if (selectedPriceLevels && Array.isArray(selectedPriceLevels)) {
      selectedPriceLevels.forEach((level: number) => {
        switch (level) {
          case 1: priceLevels.push('PRICE_LEVEL_INEXPENSIVE'); break
          case 2: priceLevels.push('PRICE_LEVEL_MODERATE'); break
          case 3: priceLevels.push('PRICE_LEVEL_EXPENSIVE'); break
          case 4: priceLevels.push('PRICE_LEVEL_VERY_EXPENSIVE'); break
        }
      })
    }

    let textQuery = 'restaurants'
    if (keywords && keywords.length > 0) {
      textQuery = `restaurants ${keywords.join(' ')}`
    }

    const requestBody: Record<string, unknown> = {
      textQuery,
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: radiusInMeters,
        },
      },
      maxResultCount: 20,
      languageCode: 'en',
    }

    if (priceLevels.length > 0) {
      requestBody.priceLevels = priceLevels
    }

    const placesResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.photos,places.rating,places.userRatingCount,places.priceLevel,places.location',
      },
      body: JSON.stringify(requestBody),
    })

    if (!placesResponse.ok) {
      console.error('Places API error:', await placesResponse.text())
      return NextResponse.json({ error: 'Failed to fetch places' }, { status: 500 })
    }

    const data = await placesResponse.json()

    if (!data.places || data.places.length === 0) {
      return NextResponse.json({ places: [] })
    }

    // Filter by distance and optional min rating
    const filtered = data.places.filter((place: any) => {
      if (!place.location?.latitude || !place.location?.longitude) return false
      const dist = calculateDistance(lat, lng, place.location.latitude, place.location.longitude)
      if (dist > radiusInMeters) return false
      if (minRating && place.rating && place.rating < minRating) return false
      return true
    })

    // Sort by rating descending, limit to 10
    const sorted = filtered
      .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 10)

    const places = sorted.map((place: any) => {
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
        placeId: place.id,
        name: place.displayName?.text || 'Unknown',
        rating: place.rating || null,
        priceLevel,
        photoRef: place.photos?.[0]?.name || null,
        lat: place.location?.latitude,
        lng: place.location?.longitude,
      }
    })

    return NextResponse.json({ places })
  } catch (error) {
    console.error('Discover places error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
