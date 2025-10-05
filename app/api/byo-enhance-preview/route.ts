import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { z } from 'zod'

// Reuse the same module schema from byo-enhance
const BYOModuleSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('title_and_paragraph'),
    title: z.string(),
    content: z.string()
  }),
  z.object({
    type: z.literal('title_and_list'),
    title: z.string(),
    items: z.array(z.string())
  }),
  z.object({
    type: z.literal('key_value_pairs'),
    pairs: z.array(z.object({
      key: z.string(),
      value: z.string()
    }))
  }),
  z.object({
    type: z.literal('quote'),
    text: z.string(),
    source: z.string()
  }),
  z.object({
    type: z.literal('stats'),
    value: z.string(),
    label: z.string()
  }),
  z.object({
    type: z.literal('tags'),
    items: z.array(z.string())
  }),
  z.object({
    type: z.literal('table'),
    headers: z.array(z.string()),
    rows: z.array(z.array(z.string()))
  }),
  z.object({
    type: z.literal('hero_image'),
    image_url: z.string(),
    alt_text: z.string()
  }),
  z.object({
    type: z.literal('image_gallery'),
    images: z.array(z.object({
      url: z.string(),
      alt_text: z.string()
    })).min(2).max(4)
  }),
  z.object({
    type: z.literal('color_block'),
    hex: z.string(),
    name: z.string()
  }),
  z.object({
    type: z.literal('location'),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string().nullable()
  }),
  z.object({
    type: z.literal('pricing'),
    range: z.string(),
    note: z.string().nullable()
  }),
  z.object({
    type: z.literal('hours'),
    schedule: z.string()
  }),
  z.object({
    type: z.literal('reviews'),
    rating: z.string(),
    count: z.string().nullable(),
    summary: z.string().nullable()
  }),
  z.object({
    type: z.literal('rating'),
    score: z.string(),
    max_score: z.string().nullable(),
    label: z.string()
  }),
  z.object({
    type: z.literal('warning'),
    message: z.string(),
    warning_type: z.enum(['info', 'warning', 'alert'])
  })
])

const BYOEnhancementSchema = z.object({
  modules: z.array(BYOModuleSchema).min(2).max(6)
})

export async function POST(req: NextRequest) {
  try {
    const { optionName, contextDescription, allOptions } = await req.json()

    if (!optionName) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    
    console.log('🤖 Previewing BYO enhancement with web search:', optionName)
    
    const contextInfo = contextDescription 
      ? `Context: ${contextDescription}\n\n` 
      : ''
    
    const allOptionNames = allOptions || []
    
    const response = await openai.responses.parse({
      model: "gpt-5-nano",
      tools: [
        { type: "web_search" }
      ],
      input: `${contextInfo}User is choosing between: ${allOptionNames.join(', ')}

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

Rental Car (e.g. Economy Car, Luxury Sedan):
- title_and_paragraph: {title: "Overview", content: "Description of vehicle type and features"}
- pricing: {range: "$30-80 per day", note: "Prices vary by location and season"}
- key_value_pairs: {pairs: [{key: "Category", value: "Economy"}, {key: "Capacity", value: "5 passengers"}, {key: "Fuel Type", value: "Gasoline"}]}
- title_and_list: {title: "Common Features", items: ["Air conditioning", "Automatic transmission", "Bluetooth"]}

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

    const parsedData = response.output_parsed || { modules: [] }
    
    // Clean citation markers - more aggressive cleaning
    const cleanCitationMarkers = (text: string): string => {
      if (!text) return text
      // Remove all citation markers and view indicators
      let cleaned = text.replace(/≡cite≡[^≡]*≡/g, '')
      cleaned = cleaned.replace(/≡turn\d+view\d+≡/g, '')
      cleaned = cleaned.replace(/≡[^≡]*≡/g, '')
      return cleaned.trim()
    }
    
    if (parsedData.modules) {
      parsedData.modules = parsedData.modules.map((module: any) => {
        const cleaned = { ...module }
        // Clean all text fields
        if (cleaned.content) cleaned.content = cleanCitationMarkers(cleaned.content)
        if (cleaned.title) cleaned.title = cleanCitationMarkers(cleaned.title)
        if (cleaned.text) cleaned.text = cleanCitationMarkers(cleaned.text)
        if (cleaned.summary) cleaned.summary = cleanCitationMarkers(cleaned.summary)
        if (cleaned.message) cleaned.message = cleanCitationMarkers(cleaned.message)
        if (cleaned.range) cleaned.range = cleanCitationMarkers(cleaned.range)
        if (cleaned.note) cleaned.note = cleanCitationMarkers(cleaned.note)
        if (cleaned.schedule) cleaned.schedule = cleanCitationMarkers(cleaned.schedule)
        if (cleaned.label) cleaned.label = cleanCitationMarkers(cleaned.label)
        if (cleaned.source) cleaned.source = cleanCitationMarkers(cleaned.source)
        if (cleaned.address) cleaned.address = cleanCitationMarkers(cleaned.address)
        if (cleaned.city) cleaned.city = cleanCitationMarkers(cleaned.city)
        if (cleaned.state) cleaned.state = cleanCitationMarkers(cleaned.state)
        if (cleaned.alt_text) cleaned.alt_text = cleanCitationMarkers(cleaned.alt_text)
        if (cleaned.name) cleaned.name = cleanCitationMarkers(cleaned.name)
        
        // Clean arrays
        if (cleaned.items) cleaned.items = cleaned.items.map((item: string) => cleanCitationMarkers(item))
        
        // Clean nested objects
        if (cleaned.pairs && Array.isArray(cleaned.pairs)) {
          cleaned.pairs = cleaned.pairs.map((pair: any) => ({
            key: cleanCitationMarkers(pair.key),
            value: cleanCitationMarkers(pair.value)
          }))
        }
        
        if (cleaned.images && Array.isArray(cleaned.images)) {
          cleaned.images = cleaned.images.map((img: any) => ({
            ...img,
            url: cleanCitationMarkers(img.url),
            alt_text: cleanCitationMarkers(img.alt_text)
          }))
        }
        
        return cleaned
      })
    }
    
    // Extract citations
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

    return NextResponse.json({
      modules: parsedData.modules || [],
      citations: citations.length > 0 ? citations : null
    })

  } catch (error) {
    console.error('Error previewing BYO enhancement:', error)
    return NextResponse.json(
      { error: 'Failed to preview enhancement' },
      { status: 500 }
    )
  }
}
