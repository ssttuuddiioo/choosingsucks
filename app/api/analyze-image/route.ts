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

${body.context ? `Context: ${body.context}\n\n` : ''}

If you can extract clear options from the image, set success=true and provide the options. 

If it's not clear what you should infer from the photo, the image quality is poor, or if the photo is against content policies, you have two choices:
1. Set success=false and provide a friendly error message explaining what went wrong (e.g., "I couldn't make out any clear options from this image. Try a clearer photo with more visible text or ideas.")
2. OR set success=true and have some fun with it! Create relevant options based on whatever you can see or imagine from the image.

Focus on extracting actionable, distinct options that people could vote on. Avoid duplicates and overly similar items. Provide between 4-20 options when successful.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
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
      temperature: 0.8, // Higher temperature for more creativity
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "extracted_options",
          strict: true,
          schema: {
            type: "object",
            properties: {
              success: {
                type: "boolean",
                description: "Whether options were successfully extracted"
              },
              options: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: {
                      type: "string",
                      description: "A clear, concise title (2-8 words)"
                    },
                    description: {
                      type: ["string", "null"],
                      description: "Brief description if more context is needed"
                    },
                    confidence: {
                      type: "string",
                      enum: ["high", "medium", "low"],
                      description: "Confidence level in the extraction"
                    }
                  },
                  required: ["title", "description", "confidence"],
                  additionalProperties: false
                },
                maxItems: 20,
                description: "Array of extracted options"
              },
              error: {
                type: ["string", "null"],
                description: "User-friendly error message if extraction failed or image is problematic"
              }
            },
            required: ["success", "options", "error"],
            additionalProperties: false
          }
        }
      }
    })

    // Handle potential refusal
    if (response.choices[0]?.message?.refusal) {
      console.log('OpenAI refused the request:', response.choices[0].message.refusal)
      // Even if refused, provide some creative fallback options
      const fallbackOptions = [
        { title: 'Option A', description: 'First choice', confidence: 'medium' as const },
        { title: 'Option B', description: 'Second choice', confidence: 'medium' as const },
        { title: 'Option C', description: 'Third choice', confidence: 'medium' as const },
        { title: 'Option D', description: 'Fourth choice', confidence: 'medium' as const }
      ]
      
      const validOptions = fallbackOptions.map((option, index) => ({
        title: option.title,
        description: option.description,
        confidence: option.confidence,
        source_type: 'ai_extracted' as const,
        metadata: {
          extraction_timestamp: new Date().toISOString(),
          model_used: 'gpt-4o-2024-08-06',
          confidence_level: option.confidence,
          display_order: index,
          fallback_used: true
        }
      }))

      return NextResponse.json({
        success: true,
        options: validOptions,
        metadata: {
          total_extracted: validOptions.length,
          model_used: 'gpt-4o-2024-08-06',
          extraction_time: new Date().toISOString(),
          fallback_used: true
        }
      })
    }

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    // Parse the structured JSON response
    let parsed: any
    try {
      parsed = JSON.parse(content)
    } catch (parseError) {
      console.error('Failed to parse structured response:', content)
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please try again.' },
        { status: 500 }
      )
    }

    // Check if the LLM reported an error
    if (!parsed.success && parsed.error) {
      return NextResponse.json(
        { error: parsed.error },
        { status: 400 }
      )
    }

    // Ensure we have options
    if (!parsed.options || parsed.options.length === 0) {
      return NextResponse.json(
        { error: 'No options could be extracted from this image. Try a different photo with clearer text or ideas.' },
        { status: 400 }
      )
    }

    // Clean and validate each option from structured output
    const validOptions = parsed.options.map((option: any, index: number) => ({
      title: option.title.trim(),
      description: option.description?.trim() || undefined,
      confidence: option.confidence,
      source_type: 'ai_extracted' as const,
      metadata: {
        extraction_timestamp: new Date().toISOString(),
        model_used: 'gpt-4o-2024-08-06',
        confidence_level: option.confidence,
        display_order: index
      }
    }))

    return NextResponse.json({
      success: true,
      options: validOptions,
      metadata: {
        total_extracted: validOptions.length,
        model_used: 'gpt-4o-2024-08-06',
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
