import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

interface GenerateOptionsRequest {
  description: string
  count?: number
}

interface GeneratedOption {
  title: string
  description?: string
  source_type: 'ai_generated'
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateOptionsRequest = await request.json()

    if (!body.description?.trim()) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const count = Math.min(Math.max(body.count || 8, 2), 20) // Between 2-20, default 8

    const prompt = `Based on this description: "${body.description.trim()}"

Generate ${count} distinct options that people could vote on for this decision. Each option should be:
1. Specific and actionable
2. Different from the others
3. Relevant to the decision being made
4. Something people could realistically choose

Return your response as a JSON array with this structure:
[
  {
    "title": "Clear, concise option name (2-8 words)",
    "description": "Brief explanation if helpful (optional)"
  }
]

Examples of good responses:
- For "What should we watch tonight?": [{"title": "Action Movie", "description": "Fast-paced thriller or superhero film"}, {"title": "Comedy Special", "description": "Stand-up or sketch comedy show"}]
- For "Where should we go for dinner?": [{"title": "Italian Restaurant"}, {"title": "Sushi Place"}, {"title": "Food Truck"}, {"title": "Cook at Home"}]
- For "What feature should we build next?": [{"title": "Dark Mode", "description": "Theme toggle for better UX"}, {"title": "Push Notifications", "description": "Real-time alerts for users"}]

Make the options diverse and cover different aspects of the decision.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.7 // Higher temperature for more creative options
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    // Try to parse the JSON response
    let generatedOptions: GeneratedOption[]
    try {
      // Remove any markdown code block formatting if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim()
      generatedOptions = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content)
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please try again.' },
        { status: 500 }
      )
    }

    // Validate the structure
    if (!Array.isArray(generatedOptions)) {
      return NextResponse.json(
        { error: 'Invalid response format from AI' },
        { status: 500 }
      )
    }

    // Clean and validate each option
    const validOptions = generatedOptions
      .filter(option => option.title && typeof option.title === 'string')
      .slice(0, count) // Limit to requested count
      .map((option, index) => ({
        title: option.title.trim(),
        description: option.description?.trim() || undefined,
        source_type: 'ai_generated' as const,
        metadata: {
          generation_timestamp: new Date().toISOString(),
          model_used: 'gpt-4o',
          original_description: body.description.trim(),
          display_order: index
        }
      }))

    return NextResponse.json({
      success: true,
      options: validOptions,
      metadata: {
        total_generated: validOptions.length,
        original_description: body.description.trim(),
        model_used: 'gpt-4o',
        generation_time: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error generating options:', error)
    
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        { error: 'OpenAI API key is invalid or missing' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate options. Please try again.' },
      { status: 500 }
    )
  }
}
