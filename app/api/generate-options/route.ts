import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

interface GenerateOptionsRequest {
  description: string
  count?: number
  sessionTitle?: string
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

    const contextInfo = body.sessionTitle 
      ? `The user is trying to decide: "${body.sessionTitle.trim()}"` 
      : ''

    const prompt = `${contextInfo ? `${contextInfo}\n\n` : ''}Based on this description: "${body.description.trim()}"

Generate ${count} distinct options that people could vote on for this decision. Each option should be:
1. Specific and actionable
2. Different from the others
3. Relevant to the decision being made
4. Something people could realistically choose

If the description is clear and you can generate good options, set success=true and provide the options.

If the description is too vague, inappropriate, or impossible to generate meaningful options for, set success=false and provide a helpful error message explaining what went wrong (e.g., "That description is too vague. Try being more specific about what you want to decide between.")

Examples of good responses:
- For "What should we watch tonight?": success=true with options like "Action Movie", "Comedy Special", "Documentary", etc.
- For "Where should we go for dinner?": success=true with options like "Italian Restaurant", "Sushi Place", "Food Truck", "Cook at Home"
- For "What feature should we build next?": success=true with options like "Dark Mode", "Push Notifications", etc.

Make the options diverse and cover different aspects of the decision when successful.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.8, // Higher temperature for more creative options
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "generated_options",
          strict: true,
          schema: {
            type: "object",
            properties: {
              success: {
                type: "boolean",
                description: "Whether options were successfully generated"
              },
              options: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: {
                      type: "string",
                      description: "Clear, concise option name (2-8 words)"
                    },
                    description: {
                      type: ["string", "null"],
                      description: "Brief explanation if helpful"
                    }
                  },
                  required: ["title", "description"],
                  additionalProperties: false
                },
                minItems: 2,
                maxItems: 20,
                description: "Array of generated options"
              },
              error: {
                type: ["string", "null"],
                description: "User-friendly error message if generation failed or request is problematic"
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
      // Provide creative fallback options based on the count requested
      const fallbackOptions = Array.from({ length: Math.min(count, 4) }, (_, i) => ({
        title: `Option ${String.fromCharCode(65 + i)}`, // A, B, C, D
        description: `Choice number ${i + 1}`,
        source_type: 'ai_generated' as const,
        metadata: {
          generation_timestamp: new Date().toISOString(),
          model_used: 'gpt-4o-2024-08-06',
          original_description: body.description.trim(),
          display_order: i,
          fallback_used: true
        }
      }))

      return NextResponse.json({
        success: true,
        options: fallbackOptions,
        metadata: {
          total_generated: fallbackOptions.length,
          original_description: body.description.trim(),
          model_used: 'gpt-4o-2024-08-06',
          generation_time: new Date().toISOString(),
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
        { error: 'Could not generate options from that description. Try being more specific about what you want to decide.' },
        { status: 400 }
      )
    }

    // Clean and validate each option from structured output
    const validOptions = parsed.options.map((option: any, index: number) => ({
      title: option.title.trim(),
      description: option.description?.trim() || undefined,
      source_type: 'ai_generated' as const,
      metadata: {
        generation_timestamp: new Date().toISOString(),
        model_used: 'gpt-4o-2024-08-06',
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
