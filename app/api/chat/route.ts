import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { env } from '@/lib/utils/env'

// Rate limiting: 10 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const limit = rateLimitMap.get(ip)

  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 })
    return true
  }

  if (limit.count >= 10) return false
  limit.count++
  return true
}

const SYSTEM_PROMPT = `You are a friendly restaurant concierge for choosing.sucks — an app that helps people decide where to eat.

Your job is to help users figure out what they're in the mood for by asking short, conversational clarifying questions. Think of yourself as a knowledgeable friend who knows every restaurant in the city.

Guidelines:
- Keep responses to 2-3 sentences max
- Ask about: vibe, cuisine, budget, occasion, group size, dietary needs
- Be warm and casual, not formal
- After 2-3 exchanges (once you have enough context), wrap up confidently with something like "I've got a great sense of what you're looking for" or "Okay, I know just the thing"
- Don't list specific restaurant names — you're helping them narrow their preferences, not recommending specific places
- If they mention a specific craving, validate it and ask one more refining question
- Never say "tap the button" or reference UI elements directly`

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const apiKey = env.anthropic.apiKey
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not set in environment variables')
    return NextResponse.json({ error: 'Chat is temporarily unavailable' }, { status: 500 })
  }

  try {
    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
    }

    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    const content =
      response.content[0].type === 'text' ? response.content[0].text : 'I couldn\'t process that. Try again?'

    return NextResponse.json({ content })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to get response' },
      { status: 500 }
    )
  }
}
