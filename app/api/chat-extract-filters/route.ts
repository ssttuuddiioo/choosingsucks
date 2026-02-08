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

const SYSTEM_PROMPT = `You are a filter extraction engine. Given a restaurant conversation, extract structured search parameters as JSON.

Return ONLY valid JSON with these fields:
- keywords: string[] (cuisine types, vibes, descriptors like "rooftop", "italian", "sports bar", "quiet", "cozy")
- selectedPriceLevels: number[] (1=cheap, 2=moderate, 3=expensive, 4=very expensive). Default to [1,2,3] if not discussed.
- minRating: number | null (minimum star rating 1-5, null if not mentioned)

Examples:
- "intimate date night, nice but not crazy expensive" -> {"keywords":["intimate","date night","romantic"],"selectedPriceLevels":[2,3],"minRating":4}
- "cheap tacos with friends" -> {"keywords":["tacos","casual","group friendly"],"selectedPriceLevels":[1,2],"minRating":null}
- "big group to watch the game" -> {"keywords":["sports bar","big group","game day"],"selectedPriceLevels":[1,2,3],"minRating":null}
- "surprise me" -> {"keywords":[],"selectedPriceLevels":[1,2,3],"minRating":null}
- "fancy italian for an anniversary" -> {"keywords":["italian","upscale","romantic","anniversary"],"selectedPriceLevels":[3,4],"minRating":4}`

const DEFAULT_FILTERS = {
  keywords: [] as string[],
  selectedPriceLevels: [1, 2, 3],
  minRating: null as number | null,
}

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
      return NextResponse.json(DEFAULT_FILTERS)
    }

    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    const text =
      response.content[0].type === 'text' ? response.content[0].text : ''

    try {
      const parsed = JSON.parse(text)
      return NextResponse.json({
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        selectedPriceLevels: Array.isArray(parsed.selectedPriceLevels)
          ? parsed.selectedPriceLevels
          : [1, 2, 3],
        minRating:
          typeof parsed.minRating === 'number' ? parsed.minRating : null,
      })
    } catch {
      // If Claude didn't return valid JSON, use defaults
      return NextResponse.json(DEFAULT_FILTERS)
    }
  } catch (error) {
    console.error('Filter extraction error:', error)
    return NextResponse.json(DEFAULT_FILTERS)
  }
}
