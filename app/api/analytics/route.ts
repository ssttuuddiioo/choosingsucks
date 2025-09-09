import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/utils/env'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Call Supabase Edge Function
    const response = await fetch(`${env.supabase.url}/functions/v1/analytics`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.supabase.anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

