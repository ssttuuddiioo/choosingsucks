import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/utils/env'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, candidateId, participantId } = body

    if (!sessionId || !candidateId || !participantId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Call Supabase Edge Function
    const edgeFunctionUrl = `${env.supabase.url}/functions/v1/check-match`
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.supabase.serviceRoleKey}`,
      },
      body: JSON.stringify({
        sessionId,
        candidateId,
        participantId
      })
    })

    const data = await response.json()
    console.log('Match check result:', { sessionId, candidateId, match: data.match })
    
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Match check API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
