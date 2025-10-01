import { createServerClient } from './supabase-server'

/**
 * API Pricing Configuration
 * 
 * Google Places API (New):
 * - Text Search: $32.00 per 1000 requests
 * - Place Details (basic): $17.00 per 1000 requests
 * - Photos: $7.00 per 1000 requests
 * 
 * Watchmode API:
 * - Free tier: 1,000 requests/month (no cost)
 * - Startup tier: $249/month for 35,000 requests = $0.00711 per request
 * - Business tier: $499/month for 100,000 requests = $0.00499 per request
 * 
 * Source: https://developers.google.com/maps/billing-and-pricing/pricing
 * Source: https://api.watchmode.com/pricing
 */

const API_PRICING = {
  google_places: {
    text_search: 0.032,      // $32 per 1000 requests = $0.032 per request
    place_details: 0.017,    // $17 per 1000 requests = $0.017 per request
    photo: 0.007,            // $7 per 1000 requests = $0.007 per request
  },
  watchmode: {
    free_tier: 0,            // Free up to 1000/month
    startup_tier: 0.00711,   // $249/month ÷ 35,000 requests
    business_tier: 0.00499,  // $499/month ÷ 100,000 requests
    // Default to free tier cost for now
    default: 0
  }
}

interface APIUsageContext {
  sessionId?: string
  candidateId?: string
  metadata?: Record<string, any>
}

/**
 * Track Google Places API usage
 */
export async function trackGooglePlacesCall(
  endpoint: 'text_search' | 'place_details' | 'photo',
  success: boolean,
  responseTimeMs: number,
  context: APIUsageContext = {},
  statusCode?: number,
  errorMessage?: string
): Promise<void> {
  try {
    const supabase = createServerClient()
    const unitCost = API_PRICING.google_places[endpoint]
    
    await (supabase as any)
      .from('api_usage')
      .insert({
        session_id: context.sessionId || null,
        candidate_id: context.candidateId || null,
        api_provider: 'google_places',
        api_endpoint: endpoint,
        request_count: 1,
        unit_cost_usd: unitCost,
        total_cost_usd: unitCost,
        response_time_ms: responseTimeMs,
        success,
        status_code: statusCode,
        error_message: errorMessage,
        metadata: context.metadata || {}
      })
    
    if (success) {
      console.log(`[API Tracker] ✅ Google Places ${endpoint}: $${unitCost.toFixed(4)}`)
    } else {
      console.log(`[API Tracker] ❌ Google Places ${endpoint} failed`)
    }
  } catch (error) {
    console.error('[API Tracker] Failed to log Google Places usage:', error)
    // Don't throw - tracking failures shouldn't break the app
  }
}

/**
 * Track Watchmode API usage
 */
export async function trackWatchmodeCall(
  endpoint: 'list_titles' | 'title_details' | 'sources',
  success: boolean,
  responseTimeMs: number,
  context: APIUsageContext = {},
  statusCode?: number,
  errorMessage?: string,
  requestCount: number = 1 // For batch title details
): Promise<void> {
  try {
    const supabase = createServerClient()
    // Using free tier pricing (0) for now - update when you upgrade
    const unitCost = API_PRICING.watchmode.default
    const totalCost = unitCost * requestCount
    
    await (supabase as any)
      .from('api_usage')
      .insert({
        session_id: context.sessionId || null,
        candidate_id: context.candidateId || null,
        api_provider: 'watchmode',
        api_endpoint: endpoint,
        request_count: requestCount,
        unit_cost_usd: unitCost,
        total_cost_usd: totalCost,
        response_time_ms: responseTimeMs,
        success,
        status_code: statusCode,
        error_message: errorMessage,
        metadata: context.metadata || {}
      })
    
    if (success) {
      console.log(`[API Tracker] ✅ Watchmode ${endpoint} (${requestCount} calls): $${totalCost.toFixed(4)}`)
    } else {
      console.log(`[API Tracker] ❌ Watchmode ${endpoint} failed`)
    }
  } catch (error) {
    console.error('[API Tracker] Failed to log Watchmode usage:', error)
    // Don't throw - tracking failures shouldn't break the app
  }
}

/**
 * Migrate OpenAI usage to consolidated api_usage table
 * This allows unified cost tracking across all APIs
 */
export async function migrateOpenAIUsageToAPIUsage(): Promise<void> {
  const supabase = createServerClient()
  
  // Get all OpenAI usage
  const { data: openaiUsage } = await supabase
    .from('openai_usage')
    .select('*')
  
  if (!openaiUsage || openaiUsage.length === 0) return
  
  const usageData = openaiUsage as any
  
  // Map to api_usage format
  const apiUsageRecords = usageData.map((record: any) => ({
    created_at: record.created_at,
    session_id: record.session_id,
    candidate_id: record.candidate_id,
    api_provider: 'openai',
    api_endpoint: record.model, // Store model as endpoint
    request_count: 1,
    unit_cost_usd: record.total_cost_usd, // For OpenAI, unit = total (1 completion)
    total_cost_usd: record.total_cost_usd,
    response_time_ms: record.response_time_ms,
    success: record.success,
    error_message: record.error_message,
    metadata: {
      ...record.metadata,
      purpose: record.purpose,
      model: record.model,
      input_tokens: record.input_tokens,
      output_tokens: record.output_tokens,
      total_tokens: record.total_tokens
    }
  }))
  
  await (supabase as any)
    .from('api_usage')
    .insert(apiUsageRecords)
  
  console.log(`[API Tracker] Migrated ${apiUsageRecords.length} OpenAI records to api_usage`)
}

/**
 * Get total costs across all APIs
 */
export async function getTotalAPICosts(days: number = 30): Promise<{
  totalCost: number
  byProvider: Record<string, number>
  byEndpoint: Record<string, { cost: number; calls: number }>
}> {
  const supabase = createServerClient()
  
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  
  const { data } = await supabase
    .from('api_usage')
    .select('*')
    .gte('created_at', cutoffDate.toISOString())
  
  if (!data || data.length === 0) {
    return { totalCost: 0, byProvider: {}, byEndpoint: {} }
  }
  
  const usage = data as any
  const totalCost = usage.reduce((sum: number, row: any) => sum + Number(row.total_cost_usd), 0)
  
  // Group by provider
  const byProvider: Record<string, number> = {}
  usage.forEach((row: any) => {
    byProvider[row.api_provider] = (byProvider[row.api_provider] || 0) + Number(row.total_cost_usd)
  })
  
  // Group by endpoint
  const byEndpoint: Record<string, { cost: number; calls: number }> = {}
  usage.forEach((row: any) => {
    const key = `${row.api_provider}:${row.api_endpoint}`
    if (!byEndpoint[key]) {
      byEndpoint[key] = { cost: 0, calls: 0 }
    }
    byEndpoint[key].cost += Number(row.total_cost_usd)
    byEndpoint[key].calls += row.request_count || 1
  })
  
  return { totalCost, byProvider, byEndpoint }
}

/**
 * Get average cost per session
 */
export async function getAverageCostPerSession(days: number = 30): Promise<number> {
  const supabase = createServerClient()
  
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  
  const { data } = await supabase
    .from('api_usage')
    .select('session_id, total_cost_usd')
    .gte('created_at', cutoffDate.toISOString())
    .not('session_id', 'is', null)
  
  if (!data || data.length === 0) return 0
  
  const usage = data as any
  
  // Group by session
  const sessionCosts: Record<string, number> = {}
  usage.forEach((row: any) => {
    if (row.session_id) {
      sessionCosts[row.session_id] = (sessionCosts[row.session_id] || 0) + Number(row.total_cost_usd)
    }
  })
  
  const sessionCount = Object.keys(sessionCosts).length
  const totalCost = Object.values(sessionCosts).reduce((sum: number, cost: number) => sum + cost, 0)
  
  return sessionCount > 0 ? totalCost / sessionCount : 0
}

