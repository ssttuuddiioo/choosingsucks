import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/utils/env'

// Simple rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute
  const maxRequests = 10

  const current = rateLimitMap.get(ip)
  if (!current || now > current.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (current.count >= maxRequests) {
    return false
  }

  current.count++
  return true
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    )
  }

  try {
    const { lat, lng } = await request.json()

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Missing required parameters: lat, lng' },
        { status: 400 }
      )
    }

    // Use Google Geocoding API for reverse geocoding
    const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${env.google.mapsApiKey}`
    
    const response = await fetch(geocodingUrl)
    
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Extract location information from address components
    let city = null
    let zipCode = null
    let state = null
    
    for (const result of data.results) {
      for (const component of result.address_components) {
        if (component.types.includes('locality')) {
          city = component.long_name
        } else if (component.types.includes('postal_code')) {
          zipCode = component.short_name
        } else if (component.types.includes('administrative_area_level_1')) {
          state = component.short_name
        }
      }
      if (city) break
    }

    // Fallback to sublocality or neighborhood if no city found
    if (!city) {
      for (const result of data.results) {
        for (const component of result.address_components) {
          if (component.types.includes('sublocality') || component.types.includes('neighborhood')) {
            city = component.long_name
            break
          }
        }
        if (city) break
      }
    }

    return NextResponse.json({
      city: city || 'Unknown Location',
      zipCode,
      state,
      address: data.results[0].formatted_address
    })

  } catch (error) {
    console.error('Reverse geocode API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
