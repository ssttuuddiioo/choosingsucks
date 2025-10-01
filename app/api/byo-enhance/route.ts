import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/utils/supabase-server'
import OpenAI from 'openai'

export async function POST(req: NextRequest) {
  try {
    const { candidateId, optionName, sessionId } = await req.json()

    if (!candidateId || !optionName || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Check if session has AI enhancement enabled
    const supabase = createServerClient()
    const { data: session } = await supabase
      .from('sessions')
      .select('ai_enhancement_enabled')
      .eq('id', sessionId)
      .single()

    if (!(session as any)?.ai_enhancement_enabled) {
      // AI enhancement disabled, return empty
      return NextResponse.json({ 
        description: null,
        aiEnhancementDisabled: true 
      })
    }

    // Check if we already have enhanced data for this candidate
    const { data: existingCandidate } = await supabase
      .from('candidates')
      .select('description, image_url, url, metadata')
      .eq('id', candidateId)
      .single()

    // If already enhanced, return cached data
    const candidateData = existingCandidate as any
    if (candidateData?.metadata?.aiEnhanced) {
      return NextResponse.json({
        description: candidateData.description,
        photos: candidateData.image_url ? [candidateData.image_url] : [],
        website: candidateData.url,
        cached: true
      })
    }

    // Get all options in session for context
    const { data: allCandidates } = await supabase
      .from('candidates')
      .select('name')
      .eq('session_id', sessionId)

    const allOptionNames = (allCandidates as any)?.map((c: any) => c.name) || []

    // Use OpenAI Responses API with guaranteed web search
    console.log('🤖 Enhancing BYO option with AI web search:', optionName)
    
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const startTime = Date.now()
    
    try {
      const response = await openai.responses.create({
        model: "gpt-5-nano", // Fastest, cheapest reasoning model with web search
        tools: [
          { type: "web_search" }
        ],
        input: `Context: User is choosing between these options: ${allOptionNames.join(', ')}

Search the web for current, helpful information about: "${optionName}"

Based on the context, determine what type of information would help someone decide:
- For places/venues/businesses → Location, reviews, what makes it special, hours, pricing
- For names (baby names, people) → Meaning, origin, popularity, cultural significance
- For concepts/colors/ideas → Symbolism, meaning, psychology, common associations
- For very personal items → Explain no public info available

Provide a concise summary (2-3 paragraphs) that aids decision-making.`,
        reasoning: { effort: "low" }, // Fast web search without deep reasoning
      })

      const endTime = Date.now()
      const responseTimeMs = endTime - startTime

      // Extract output text
      const outputText = response.output_text || ''
      
      // Extract citations from annotations
      const citations: { url: string; title: string }[] = []
      if (response.output && Array.isArray(response.output)) {
        response.output.forEach((item: any) => {
          if (item.type === 'message' && item.content) {
            item.content.forEach((content: any) => {
              if (content.annotations) {
                content.annotations.forEach((annotation: any) => {
                  if (annotation.type === 'url_citation') {
                    citations.push({
                      url: annotation.url,
                      title: annotation.title || annotation.url
                    })
                  }
                })
              }
            })
          }
        })
      }

      // Calculate cost (Responses API doesn't return usage in same format)
      // Estimate based on response length
      const estimatedInputTokens = 200
      const estimatedOutputTokens = Math.ceil(outputText.length / 4) // ~4 chars per token
      const pricing = { input: 0.05, output: 0.40 } // gpt-5-nano pricing
      const totalCost = (estimatedInputTokens / 1_000_000) * pricing.input + 
                       (estimatedOutputTokens / 1_000_000) * pricing.output

      // Track in database
      const supabase = createServerClient()
      await (supabase as any)
        .from('openai_usage')
        .insert({
          session_id: sessionId,
          candidate_id: candidateId,
          purpose: 'byo_enhancement_web_search',
          model: 'gpt-5-nano',
          input_tokens: estimatedInputTokens,
          output_tokens: estimatedOutputTokens,
          total_tokens: estimatedInputTokens + estimatedOutputTokens,
          input_cost_usd: (estimatedInputTokens / 1_000_000) * pricing.input,
          output_cost_usd: (estimatedOutputTokens / 1_000_000) * pricing.output,
          total_cost_usd: totalCost,
          response_time_ms: responseTimeMs,
          success: true,
          metadata: { 
            optionName,
            allOptions: allOptionNames,
            citations_count: citations.length,
            has_web_search: true
          }
        })

      console.log(`💰 OpenAI Responses API web search: $${totalCost.toFixed(4)} (${responseTimeMs}ms, ${citations.length} citations)`)

      const description = outputText

      const enhancedData = {
        description,
        citations: citations.length > 0 ? citations : null
      }

      // Cache the enhanced data in the database (reuse supabase from earlier)
      if (description) {
        const updateData: any = {
          description: description,
          metadata: { 
            ...(candidateData?.metadata || {}),
            aiEnhanced: true,
            enhancedAt: new Date().toISOString(),
            webSearchUsed: true,
            citations: citations
          }
        }
        
        await (supabase as any)
          .from('candidates')
          .update(updateData)
          .eq('id', candidateId)
      }

      console.log('✅ BYO option enhanced successfully with web search')
      return NextResponse.json(enhancedData)
      
    } catch (apiError) {
      console.error('Error calling OpenAI Responses API:', apiError)
      return NextResponse.json(
        { error: 'Failed to enhance with web search', description: null },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error enhancing BYO option:', error)
    return NextResponse.json(
      { error: 'Failed to enhance option', description: null },
      { status: 500 }
    )
  }
}

