// @ts-nocheck
import { createServerClient } from './supabase-server'
import OpenAI from 'openai'

// OpenAI Pricing (per million tokens) - UPDATE THESE WITH ACTUAL 2025 PRICING
// Source: https://openai.com/api/pricing
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-5': {
    input: 2.50,    // $ per 1M input tokens - PLACEHOLDER, verify pricing
    output: 10.00   // $ per 1M output tokens - PLACEHOLDER, verify pricing
  },
  'gpt-4o': {
    input: 2.50,    // $ per 1M input tokens  
    output: 10.00   // $ per 1M output tokens
  },
  'gpt-4o-2024-08-06': {
    input: 2.50,    // $ per 1M input tokens (same as gpt-4o)
    output: 10.00   // $ per 1M output tokens
  },
  'gpt-4o-mini': {
    input: 0.15,    // $ per 1M input tokens
    output: 0.60    // $ per 1M output tokens
  },
  'gpt-4o-mini-search-preview-2025-03-11': {
    input: 0.15,    // $ per 1M input tokens (assuming same as gpt-4o-mini)
    output: 0.60    // $ per 1M output tokens
  },
  'gpt-4-turbo': {
    input: 10.00,
    output: 30.00
  },
  'gpt-3.5-turbo': {
    input: 0.50,
    output: 1.50
  }
}

interface OpenAIUsageContext {
  sessionId?: string
  candidateId?: string
  purpose: string // 'byo_enhancement', 'image_analysis', 'option_generation', etc.
  metadata?: Record<string, any>
}

interface OpenAITrackingResult {
  response: OpenAI.Chat.Completions.ChatCompletion
  usage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    inputCostUsd: number
    outputCostUsd: number
    totalCostUsd: number
  }
}

/**
 * Track OpenAI API usage and costs in Supabase
 * @param model - The OpenAI model being used
 * @param messages - The chat messages
 * @param options - Additional OpenAI options (tools, max_tokens, etc.)
 * @param context - Tracking context (sessionId, purpose, etc.)
 * @returns Response with usage metrics
 */
export async function trackOpenAICall(
  model: string,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  options: Omit<OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming, 'model' | 'messages'>,
  context: OpenAIUsageContext
): Promise<OpenAITrackingResult> {
  const startTime = Date.now()
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  try {
    // Make the OpenAI API call
    const response = await openai.chat.completions.create({
      model,
      messages,
      ...options
    })

    const endTime = Date.now()
    const responseTimeMs = endTime - startTime

    // Extract usage data
    const usage = response.usage
    if (!usage) {
      console.warn('[OpenAI Tracker] No usage data in response')
      throw new Error('No usage data returned from OpenAI')
    }

    const inputTokens = usage.prompt_tokens
    const outputTokens = usage.completion_tokens
    const totalTokens = usage.total_tokens

    // Calculate costs
    const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4o-mini'] // Fallback to cheapest
    const inputCostUsd = (inputTokens / 1_000_000) * pricing.input
    const outputCostUsd = (outputTokens / 1_000_000) * pricing.output
    const totalCostUsd = inputCostUsd + outputCostUsd

    // Log to Supabase
    const supabase = createServerClient()
    const { error } = await supabase
      .from('openai_usage')
      .insert({
        session_id: context.sessionId || null,
        candidate_id: context.candidateId || null,
        purpose: context.purpose,
        model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        input_cost_usd: inputCostUsd,
        output_cost_usd: outputCostUsd,
        total_cost_usd: totalCostUsd,
        response_time_ms: responseTimeMs,
        success: true,
        metadata: context.metadata || {}
      })

    if (error) {
      console.error('[OpenAI Tracker] Failed to log usage:', error)
      // Don't throw - we don't want tracking failures to break the app
    } else {
      console.log(`[OpenAI Tracker] ✅ Logged ${model} usage:`, {
        tokens: totalTokens,
        cost: `$${totalCostUsd.toFixed(4)}`,
        purpose: context.purpose
      })
    }

    return {
      response,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens,
        inputCostUsd,
        outputCostUsd,
        totalCostUsd
      }
    }
  } catch (error) {
    const endTime = Date.now()
    const responseTimeMs = endTime - startTime

    // Log failed attempt
    const supabase = createServerClient()
    await supabase
      .from('openai_usage')
      .insert({
        session_id: context.sessionId || null,
        candidate_id: context.candidateId || null,
        purpose: context.purpose,
        model,
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        input_cost_usd: 0,
        output_cost_usd: 0,
        total_cost_usd: 0,
        response_time_ms: responseTimeMs,
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        metadata: context.metadata || {}
      })

    throw error
  }
}

/**
 * Get total OpenAI costs for a session
 */
export async function getSessionOpenAICosts(sessionId: string): Promise<{
  totalCost: number
  callCount: number
  totalTokens: number
}> {
  const supabase = createServerClient()
  
  const { data, error } = await supabase
    .from('openai_usage')
    .select('total_cost_usd, total_tokens')
    .eq('session_id', sessionId)

  if (error || !data) {
    return { totalCost: 0, callCount: 0, totalTokens: 0 }
  }

  const totalCost = data.reduce((sum, row) => sum + Number(row.total_cost_usd), 0)
  const totalTokens = data.reduce((sum, row) => sum + Number(row.total_tokens), 0)

  return {
    totalCost,
    callCount: data.length,
    totalTokens
  }
}

/**
 * Get global OpenAI usage stats
 */
export async function getGlobalOpenAIStats(days: number = 30): Promise<{
  totalCost: number
  callCount: number
  totalTokens: number
  byModel: Record<string, { cost: number; tokens: number; calls: number }>
  byPurpose: Record<string, { cost: number; tokens: number; calls: number }>
}> {
  const supabase = createServerClient()
  
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  const { data, error } = await supabase
    .from('openai_usage')
    .select('*')
    .gte('created_at', cutoffDate.toISOString())

  if (error || !data) {
    return {
      totalCost: 0,
      callCount: 0,
      totalTokens: 0,
      byModel: {},
      byPurpose: {}
    }
  }

  const totalCost = data.reduce((sum, row) => sum + Number(row.total_cost_usd), 0)
  const totalTokens = data.reduce((sum, row) => sum + Number(row.total_tokens), 0)

  // Group by model
  const byModel: Record<string, { cost: number; tokens: number; calls: number }> = {}
  data.forEach(row => {
    if (!byModel[row.model]) {
      byModel[row.model] = { cost: 0, tokens: 0, calls: 0 }
    }
    byModel[row.model].cost += Number(row.total_cost_usd)
    byModel[row.model].tokens += Number(row.total_tokens)
    byModel[row.model].calls += 1
  })

  // Group by purpose
  const byPurpose: Record<string, { cost: number; tokens: number; calls: number }> = {}
  data.forEach(row => {
    if (!byPurpose[row.purpose]) {
      byPurpose[row.purpose] = { cost: 0, tokens: 0, calls: 0 }
    }
    byPurpose[row.purpose].cost += Number(row.total_cost_usd)
    byPurpose[row.purpose].tokens += Number(row.total_tokens)
    byPurpose[row.purpose].calls += 1
  })

  return {
    totalCost,
    callCount: data.length,
    totalTokens,
    byModel,
    byPurpose
  }
}

