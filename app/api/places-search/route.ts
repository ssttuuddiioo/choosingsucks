import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/utils/env'

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const limit = rateLimitMap.get(ip)
  
  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 300000 }) // 5 minute window
    return true
  }
  
  if (limit.count >= 5) { // 5 searches per 5 minutes
    return false
  }
  
  limit.count++
  return true
}

export async function POST(request: NextRequest) {
  // Get client IP
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  
  // Check rate limit
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    console.log('Places search request body:', body)
    const { sessionId, lat, lng, radius, selectedPriceLevels } = body
    
    // Validate session ID format
    if (!sessionId || !/^[a-f0-9-]{36}$/.test(sessionId)) {
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 400 }
      )
    }
    
    // Call Supabase Edge Function
    const response = await fetch(`${env.supabase.url}/functions/v1/places-search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.supabase.anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        lat,
        lng,
        radius, // Pass through the search radius
        selectedPriceLevels, // Pass through the selected price levels
      }),
    })

    const data = await response.json()
    console.log('Edge function response:', { status: response.status, data })
    
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Places search API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
