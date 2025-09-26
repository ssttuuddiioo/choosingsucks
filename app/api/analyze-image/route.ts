import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

interface AnalyzeImageRequest {
  image_url: string
  context?: string
}

interface ExtractedOption {
  title: string
  description?: string
  confidence: 'high' | 'medium' | 'low'
  source_type: 'ai_extracted'
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeImageRequest = await request.json()

    if (!body.image_url) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const prompt = `Analyze this image and extract distinct options or ideas that could be used for voting or decision-making. This might be:

- Sticky notes from a brainstorming session
- Items on a whiteboard or flip chart
- Written lists or bullet points
- Sketches or diagrams representing different concepts
- Product features or design alternatives
- Menu items or food choices
- Activity options or places to go
- Movies, shows, or entertainment options

For each distinct option you identify, provide:
1. A clear, concise title (2-8 words)
2. A brief description if more context is needed (optional)
3. Confidence level (high/medium/low)

Return your response as a JSON array with this structure:
[
  {
    "title": "Option title",
    "description": "Brief description if needed (optional)",
    "confidence": "high|medium|low"
  }
]

${body.context ? `Additional context: ${body.context}` : ''}

Focus on extracting actionable, distinct options that people could vote on. Avoid duplicates and overly similar items. Maximum 20 options.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: body.image_url,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1 // Low temperature for more consistent extraction
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    // Try to parse the JSON response
    let extractedOptions: ExtractedOption[]
    try {
      // Remove any markdown code block formatting if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim()
      extractedOptions = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content)
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please try again.' },
        { status: 500 }
      )
    }

    // Validate the structure
    if (!Array.isArray(extractedOptions)) {
      return NextResponse.json(
        { error: 'Invalid response format from AI' },
        { status: 500 }
      )
    }

    // Clean and validate each option
    const validOptions = extractedOptions
      .filter(option => option.title && typeof option.title === 'string')
      .slice(0, 20) // Limit to 20 options
      .map((option, index) => ({
        title: option.title.trim(),
        description: option.description?.trim() || undefined,
        confidence: ['high', 'medium', 'low'].includes(option.confidence) ? option.confidence : 'medium',
        source_type: 'ai_extracted' as const,
        metadata: {
          extraction_timestamp: new Date().toISOString(),
          model_used: 'gpt-4o',
          confidence_level: option.confidence,
          display_order: index
        }
      }))

    return NextResponse.json({
      success: true,
      options: validOptions,
      metadata: {
        total_extracted: validOptions.length,
        model_used: 'gpt-4o',
        extraction_time: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error analyzing image:', error)
    
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        { error: 'OpenAI API key is invalid or missing' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to analyze image. Please try again.' },
      { status: 500 }
    )
  }
}
