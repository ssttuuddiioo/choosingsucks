import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/utils/supabase-server'
import { trackOpenAICall } from '@/lib/utils/openai-tracker'

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

    // Use OpenAI with web search to enhance the option
    console.log('🤖 Enhancing BYO option with AI:', optionName)
    
    const { response, usage } = await trackOpenAICall(
      "gpt-4o-mini-search-preview-2025-03-11", // Web search enabled model
      [
        {
          role: "system",
          content: `You are helping users learn more about options they're deciding between. 
Analyze the context to determine what kind of information would be helpful.

Rules:
- For places/venues/businesses → Provide details about location, what it is, why someone might choose it
- For names (baby names, people) → Explain meaning, origin, significance
- For concepts/colors/ideas → Explain symbolism, meaning, psychology
- For very personal/private items → Explain no public info available

Keep responses concise (2-3 paragraphs max). Focus on decision-relevant information.`
        },
        {
          role: "user",
          content: `Context: User is choosing between these options: ${allOptionNames.join(', ')}

Provide helpful information about: "${optionName}"

Format your response as a helpful summary that aids decision-making.`
        }
      ],
      {
        max_tokens: 500, // Keep responses concise
        temperature: 0.7
      },
      {
        sessionId,
        candidateId,
        purpose: 'byo_enhancement',
        metadata: {
          optionName,
          allOptions: allOptionNames
        }
      }
    )

    console.log(`💰 OpenAI cost for this enhancement: $${usage.totalCostUsd.toFixed(4)} (${usage.totalTokens} tokens)`)

    const assistantMessage = response.choices[0]?.message
    const description = assistantMessage?.content || null

    // Extract citations from tool calls if available
    const citations: { url: string; title: string }[] = []
    
    // Note: OpenAI's web search returns citations in a specific format
    // We'll extract them from the response if available
    // This is a simplified version - you may need to adjust based on actual response format

    const enhancedData = {
      description,
      citations: citations.length > 0 ? citations : null
    }

    // Cache the enhanced data in the database
    if (description) {
      const updateData: any = {
        description: description,
        metadata: { 
          ...(candidateData?.metadata || {}),
          aiEnhanced: true,
          enhancedAt: new Date().toISOString()
        }
      }
      
      await (supabase as any)
        .from('candidates')
        .update(updateData)
        .eq('id', candidateId)
    }

    console.log('✅ BYO option enhanced successfully')
    return NextResponse.json(enhancedData)

  } catch (error) {
    console.error('Error enhancing BYO option:', error)
    return NextResponse.json(
      { error: 'Failed to enhance option', description: null },
      { status: 500 }
    )
  }
}

