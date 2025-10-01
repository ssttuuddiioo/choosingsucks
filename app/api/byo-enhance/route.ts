import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/utils/supabase-server'
import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { z } from 'zod'

// Define all possible module types with Zod for structured outputs
const BYOModuleSchema = z.discriminatedUnion('type', [
  // Core display modules
  z.object({
    type: z.literal('title_and_paragraph'),
    title: z.string().describe('Section heading (e.g., "About", "Overview", "Description")'),
    content: z.string().describe('Text content, 1-3 sentences maximum')
  }),
  z.object({
    type: z.literal('title_and_list'),
    title: z.string().describe('Section heading (e.g., "Features", "Highlights", "Benefits")'),
    items: z.array(z.string()).describe('List items, 3-5 items maximum')
  }),
  z.object({
    type: z.literal('key_value_pairs'),
    pairs: z.array(z.object({
      key: z.string().describe('Label (e.g., "Type", "Holes", "Origin")'),
      value: z.string().describe('Value (e.g., "Public", "18", "Latin")')
    })).describe('Array of key-value pairs, 3-6 items')
  }),
  z.object({
    type: z.literal('quote'),
    text: z.string().describe('Quote text'),
    source: z.string().describe('Quote source or attribution')
  }),
  z.object({
    type: z.literal('stats'),
    value: z.string().describe('The metric value (e.g., "4.5", "18 holes", "1933")'),
    label: z.string().describe('What the stat represents (e.g., "Rating", "Holes", "Est.")')
  }),
  z.object({
    type: z.literal('tags'),
    items: z.array(z.string()).describe('Tags or categories, 3-5 maximum')
  }),
  z.object({
    type: z.literal('table'),
    headers: z.array(z.string()).describe('Column headers'),
    rows: z.array(z.array(z.string())).describe('Table rows')
  }),
  
  // Media modules
  z.object({
    type: z.literal('hero_image'),
    image_url: z.string().describe('Direct image URL found in web search results'),
    alt_text: z.string().describe('Image description')
  }),
  z.object({
    type: z.literal('image_gallery'),
    images: z.array(z.object({
      url: z.string().describe('Image URL'),
      alt_text: z.string().describe('Image description')
    })).min(2).max(4).describe('2-4 images')
  }),
  z.object({
    type: z.literal('color_block'),
    hex: z.string().describe('Hex color code (e.g., "#FF5733")'),
    name: z.string().describe('Color name')
  }),
  
  // Specialized modules
  z.object({
    type: z.literal('location'),
    address: z.string().describe('Street address'),
    city: z.string(),
    state: z.string(),
    zip: z.string().nullable().describe('ZIP code if available')
  }),
  z.object({
    type: z.literal('pricing'),
    range: z.string().describe('Price range (e.g., "$20-50", "$$-$$$", "Free")'),
    note: z.string().nullable().describe('Additional pricing context if relevant')
  }),
  z.object({
    type: z.literal('hours'),
    schedule: z.string().describe('Operating hours (e.g., "Daily 7am-7pm", "Mon-Fri 9am-5pm")')
  }),
  z.object({
    type: z.literal('reviews'),
    rating: z.string().describe('Rating value (e.g., "4.5", "8.2/10")'),
    count: z.string().nullable().describe('Number of reviews if available'),
    summary: z.string().nullable().describe('Brief review summary, 1 sentence')
  }),
  z.object({
    type: z.literal('rating'),
    score: z.string().describe('Rating score'),
    max_score: z.string().nullable().describe('Maximum possible score'),
    label: z.string().describe('What is being rated')
  }),
  z.object({
    type: z.literal('warning'),
    message: z.string().describe('Important notice or warning'),
    warning_type: z.enum(['info', 'warning', 'alert']).describe('Severity level')
  })
])

const BYOEnhancementSchema = z.object({
  modules: z.array(BYOModuleSchema).min(2).max(6).describe('3-6 relevant modules based on content type')
})

export async function POST(req: NextRequest) {
  try {
    const { candidateId, optionName, sessionId } = await req.json()

    if (!candidateId || !optionName || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Get session and check AI enhancement (defaults to true for BYO)
    const supabase = createServerClient()
    const { data: session } = await supabase
      .from('sessions')
      .select('ai_enhancement_enabled')
      .eq('id', sessionId)
      .single()

    // Default to enabled if not explicitly set
    const aiEnabled = (session as any)?.ai_enhancement_enabled !== false

    if (!aiEnabled) {
      // AI enhancement explicitly disabled
      return NextResponse.json({ 
        modules: [],
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
    if (candidateData?.metadata?.aiEnhanced && candidateData?.metadata?.enhancedModules) {
      return NextResponse.json({
        modules: candidateData.metadata.enhancedModules,
        citations: candidateData.metadata.citations || null,
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
      const response = await openai.responses.parse({
        model: "gpt-5-nano",
        tools: [
          { type: "web_search" }
        ],
        input: `User is choosing between: ${allOptionNames.join(', ')}

Search the web for current information about: "${optionName}"

If you find high-quality images in search results, include them using hero_image or image_gallery modules.

Provide 3-6 relevant modules using ONLY these types:

EXAMPLES BY CONTENT TYPE:

Golf Course:
- location: Street address, city, state
- title_and_paragraph: {title: "About", content: "Brief description"}
- pricing: {range: "$20-50", note: "Varies by season"}
- hours: {schedule: "Daily 7am-7pm"}
- reviews: {rating: "4.2", count: "150", summary: "Well-maintained course"}

Baby Name:
- title_and_paragraph: {title: "Meaning & Origin", content: "Latin origin..."}
- key_value_pairs: {pairs: [{key: "Origin", value: "Latin"}, {key: "Popularity", value: "Top 5"}, {key: "Gender", value: "Male"}]}
- title_and_list: {title: "Famous People", items: ["Oliver Twist", "Oliver Stone"]}

Color:
- color_block: {hex: "#000080", name: "Navy Blue"}
- title_and_paragraph: {title: "Symbolism", content: "Represents authority..."}
- tags: {items: ["Professional", "Classic", "Formal"]}

NO meta-commentary. NO conversational language. Just factual modules.`,
        reasoning: { effort: "low" },
        text: {
          format: zodTextFormat(BYOEnhancementSchema, "byo_enhancement")
        }
      })

      const endTime = Date.now()
      const responseTimeMs = endTime - startTime

      // Get parsed data (guaranteed by Zod schema)
      const parsedData = response.output_parsed || { modules: [] }
      
      // Clean citation markers from all text content
      const cleanCitationMarkers = (text: string): string => {
        if (!text) return text
        // Remove ≡cite≡turn0search0≡ style markers and any remaining ≡...≡ patterns
        return text.replace(/≡cite≡[^≡]*≡/g, '').replace(/≡[^≡]*≡/g, '').trim()
      }
      
      // Clean all modules
      if (parsedData.modules) {
        parsedData.modules = parsedData.modules.map((module: any) => {
          const cleaned = { ...module }
          if (cleaned.content) cleaned.content = cleanCitationMarkers(cleaned.content)
          if (cleaned.title) cleaned.title = cleanCitationMarkers(cleaned.title)
          if (cleaned.text) cleaned.text = cleanCitationMarkers(cleaned.text)
          if (cleaned.summary) cleaned.summary = cleanCitationMarkers(cleaned.summary)
          if (cleaned.items) cleaned.items = cleaned.items.map((item: string) => cleanCitationMarkers(item))
          return cleaned
        })
      }
      
      const outputText = JSON.stringify(parsedData)
      
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

      // Calculate cost
      const estimatedInputTokens = 300
      const estimatedOutputTokens = Math.ceil(outputText.length / 4)
      const pricing = { input: 0.05, output: 0.40 }
      const totalCost = (estimatedInputTokens / 1_000_000) * pricing.input + 
                       (estimatedOutputTokens / 1_000_000) * pricing.output

      // Track in database
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
            modules_count: parsedData.modules?.length || 0,
            citations_count: citations.length,
            has_web_search: true
          }
        })

      console.log(`💰 OpenAI web search: $${totalCost.toFixed(4)} (${responseTimeMs}ms, ${parsedData.modules?.length || 0} modules, ${citations.length} citations)`)

      const enhancedData = {
        modules: parsedData.modules || [],
        citations: citations.length > 0 ? citations : null
      }

      // Cache the enhanced data in the database
      if (parsedData.modules && parsedData.modules.length > 0) {
        const updateData: any = {
          metadata: { 
            ...(candidateData?.metadata || {}),
            aiEnhanced: true,
            enhancedAt: new Date().toISOString(),
            webSearchUsed: true,
            enhancedModules: parsedData.modules,
            citations: citations
          }
        }
        
        await (supabase as any)
          .from('candidates')
          .update(updateData)
          .eq('id', candidateId)
      }

      console.log('✅ BYO option enhanced with web search - returning structured modules')
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

