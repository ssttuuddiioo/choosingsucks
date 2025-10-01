import { NextRequest, NextResponse } from 'next/server'
import { trackOpenAICall } from '@/lib/utils/openai-tracker'

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
  const startTime = Date.now()
  const requestId = crypto.randomUUID()
  
  console.log(`🤖 [${requestId}] Text generation request started`)
  
  try {
    const body: GenerateOptionsRequest = await request.json()

    console.log(`📊 [${requestId}] Request details:`, {
      descriptionLength: body.description?.trim().length || 0,
      hasSessionTitle: !!body.sessionTitle,
      sessionTitle: body.sessionTitle ? body.sessionTitle.substring(0, 50) + '...' : 'None',
      requestedCount: body.count || 8,
      description: body.description ? body.description.substring(0, 100) + '...' : 'None'
    })

    if (!body.description?.trim()) {
      console.log(`❌ [${requestId}] Missing description`)
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      console.log(`❌ [${requestId}] OpenAI API key not configured`)
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

    console.log(`🚀 [${requestId}] Sending text generation request to OpenAI...`)
    const apiStartTime = Date.now()

    const { response, usage } = await trackOpenAICall(
      'gpt-4o-2024-08-06',
      [
        {
          role: 'user',
          content: prompt
        }
      ],
      {
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
      },
      {
        purpose: 'option_generation',
        metadata: {
          description: body.description.substring(0, 200),
          sessionTitle: body.sessionTitle,
          requestedCount: count
        }
      }
    )

    const apiDuration = Date.now() - apiStartTime
    console.log(`⚡ [${requestId}] OpenAI API response received in ${apiDuration}ms`)
    console.log(`💰 [${requestId}] Cost: $${usage.totalCostUsd.toFixed(4)} (${usage.totalTokens} tokens)`)

    // Handle potential refusal
    if (response.choices[0]?.message?.refusal) {
      console.log(`🚫 [${requestId}] OpenAI refused the request:`, response.choices[0].message.refusal)
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

      console.log(`🔄 [${requestId}] Using fallback options due to refusal - returned ${fallbackOptions.length} options`)

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
      console.log(`✅ [${requestId}] Successfully parsed structured response`)
    } catch (parseError) {
      console.error(`❌ [${requestId}] Failed to parse structured response:`, {
        error: parseError,
        content: content.substring(0, 500) + '...'
      })
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please try again.' },
        { status: 500 }
      )
    }

    // Check if the LLM reported an error
    if (!parsed.success && parsed.error) {
      console.log(`⚠️ [${requestId}] LLM reported error:`, parsed.error)
      return NextResponse.json(
        { error: parsed.error },
        { status: 400 }
      )
    }

    // Ensure we have options
    if (!parsed.options || parsed.options.length === 0) {
      console.log(`❌ [${requestId}] No options generated from response`)
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

    const totalDuration = Date.now() - startTime
    console.log(`🎉 [${requestId}] Text generation completed successfully:`, {
      optionsGenerated: validOptions.length,
      requestedCount: count,
      hasDescriptions: validOptions.filter((opt: any) => opt.description).length,
      apiDuration: apiDuration,
      totalDuration: totalDuration,
      averageOptionLength: Math.round(validOptions.reduce((acc: number, opt: any) => acc + opt.title.length, 0) / validOptions.length),
      sessionTitleProvided: !!body.sessionTitle
    })

    return NextResponse.json({
      success: true,
      options: validOptions,
      metadata: {
        total_generated: validOptions.length,
        original_description: body.description.trim(),
        model_used: 'gpt-4o-2024-08-06',
        generation_time: new Date().toISOString(),
        api_duration_ms: apiDuration,
        total_duration_ms: totalDuration
      }
    })

  } catch (error) {
    const totalDuration = Date.now() - startTime
    console.error(`💥 [${requestId}] Text generation error after ${totalDuration}ms:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: totalDuration
    })
    
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
