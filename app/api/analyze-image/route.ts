import { NextRequest, NextResponse } from 'next/server'
import { trackOpenAICall } from '@/lib/utils/openai-tracker'

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
  const startTime = Date.now()
  const requestId = crypto.randomUUID()
  
  console.log(`🤖 [${requestId}] Image analysis request started`)
  
  try {
    const body: AnalyzeImageRequest = await request.json()

    console.log(`📊 [${requestId}] Request details:`, {
      hasImageUrl: !!body.image_url,
      imageSize: body.image_url ? `${Math.round(body.image_url.length / 1024)}KB` : 'N/A',
      hasContext: !!body.context,
      context: body.context ? body.context.substring(0, 100) + '...' : 'None'
    })

    if (!body.image_url) {
      console.log(`❌ [${requestId}] Missing image URL`)
      return NextResponse.json(
        { error: 'Image URL is required' },
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

    console.log(`🚀 [${requestId}] Sending request to OpenAI...`)
    const apiStartTime = Date.now()

    const { response, usage } = await trackOpenAICall(
      'gpt-4o-2024-08-06',
      [
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
          ] as any
        }
      ],
      {
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
      },
      {
        purpose: 'image_analysis',
        metadata: {
          hasContext: !!body.context,
          context: body.context?.substring(0, 200),
          imageSize: body.image_url.length
        }
      }
    )

    const apiDuration = Date.now() - apiStartTime
    console.log(`⚡ [${requestId}] OpenAI API response received in ${apiDuration}ms`)
    console.log(`💰 [${requestId}] Cost: $${usage.totalCostUsd.toFixed(4)} (${usage.totalTokens} tokens)`)

    // Handle potential refusal
    if (response.choices[0]?.message?.refusal) {
      console.log(`🚫 [${requestId}] OpenAI refused the request:`, response.choices[0].message.refusal)
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

      console.log(`🔄 [${requestId}] Using fallback options due to refusal - returned ${validOptions.length} options`)

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
      console.log(`❌ [${requestId}] No options extracted from response`)
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

    const totalDuration = Date.now() - startTime
    console.log(`🎉 [${requestId}] Image analysis completed successfully:`, {
      optionsExtracted: validOptions.length,
      confidenceLevels: validOptions.reduce((acc: any, opt: any) => {
        acc[opt.confidence] = (acc[opt.confidence] || 0) + 1
        return acc
      }, {}),
      apiDuration: apiDuration,
      totalDuration: totalDuration,
      averageOptionLength: Math.round(validOptions.reduce((acc: number, opt: any) => acc + opt.title.length, 0) / validOptions.length)
    })

    return NextResponse.json({
      success: true,
      options: validOptions,
      metadata: {
        total_extracted: validOptions.length,
        model_used: 'gpt-4o-2024-08-06',
        extraction_time: new Date().toISOString(),
        api_duration_ms: apiDuration,
        total_duration_ms: totalDuration
      }
    })

  } catch (error) {
    const totalDuration = Date.now() - startTime
    console.error(`💥 [${requestId}] Image analysis error after ${totalDuration}ms:`, {
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
      { error: 'Failed to analyze image. Please try again.' },
      { status: 500 }
    )
  }
}
