import { createServerClient } from './supabase-server'
import type { Tables } from '@/types/supabase'
import OpenAI from 'openai'

// OpenAI Pricing (per million tokens)
// Source: docs/openai_models.md (Updated October 2025)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // GPT-5 Series (Current Flagship Reasoning Models)
  'gpt-5': {
    input: 1.25,    // $1.25 per 1M input tokens
    output: 10.00   // $10.00 per 1M output tokens
  },
  'gpt-5-mini': {
    input: 0.25,    // $0.25 per 1M input tokens
    output: 2.00    // $2.00 per 1M output tokens
  },
  'gpt-5-nano': {
    input: 0.05,    // $0.05 per 1M input tokens
    output: 0.40    // $0.40 per 1M output tokens
  },
  'gpt-5-chat-latest': {
    input: 1.25,    // Same as gpt-5
    output: 10.00
  },
  
  // GPT-4.1 Series (Current Generation Chat Models)
  'gpt-4.1': {
    input: 2.00,    // $2.00 per 1M input tokens
    output: 8.00    // $8.00 per 1M output tokens
  },
  'gpt-4.1-mini': {
    input: 0.40,    // $0.40 per 1M input tokens
    output: 1.60    // $1.60 per 1M output tokens
  },
  'gpt-4.1-nano': {
    input: 0.10,    // $0.10 per 1M input tokens
    output: 0.40    // $0.40 per 1M output tokens
  },
  
  // GPT-4o Series (Legacy)
  'gpt-4o': {
    input: 2.50,    // $2.50 per 1M input tokens
    output: 10.00   // $10.00 per 1M output tokens
  },
  'gpt-4o-2024-08-06': {
    input: 2.50,    // Same as gpt-4o
    output: 10.00
  },
  'chatgpt-4o-latest': {
    input: 2.50,    // Same as gpt-4o
    output: 10.00
  },
  'gpt-4o-mini': {
    input: 0.15,    // $0.15 per 1M input tokens
    output: 0.60    // $0.60 per 1M output tokens
  },
  'gpt-4o-mini-search-preview-2025-03-11': {
    input: 0.15,    // Same as gpt-4o-mini
    output: 0.60
  },
  
  // o-series (Deprecated)
  'o3': {
    input: 10.00,   // $10.00 per 1M input tokens
    output: 40.00   // $40.00 per 1M output tokens
  },
  'o4-mini': {
    input: 1.10,    // $1.10 per 1M input tokens
    output: 4.40    // $4.40 per 1M output tokens
  },
  'o3-mini': {
    input: 1.10,    // $1.10 per 1M input tokens
    output: 4.40    // $4.40 per 1M output tokens
  },
  'o1': {
    input: 15.00,   // $15.00 per 1M input tokens (deprecated)
    output: 60.00   // $60.00 per 1M output tokens
  },
  'o1-mini': {
    input: 1.10,    // $1.10 per 1M input tokens (deprecated)
    output: 4.40    // $4.40 per 1M output tokens
  },
  
  // GPT-4 Series (Legacy)
  'gpt-4-turbo': {
    input: 10.00,
    output: 30.00
  },
  'gpt-4': {
    input: 30.00,
    output: 60.00
  },
  
  // GPT-3.5 Series (Legacy)
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
    // Note: Insert needs 'as any' due to Supabase client's complex type inference
    const { error } = await (supabase as any)
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
    // Note: Insert needs 'as any' due to Supabase client's complex type inference
    await (supabase as any)
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

  const usageData = data as Array<{ total_cost_usd: number; total_tokens: number }>
  const totalCost = usageData.reduce((sum, row) => sum + Number(row.total_cost_usd), 0)
  const totalTokens = usageData.reduce((sum, row) => sum + Number(row.total_tokens), 0)

  return {
    totalCost,
    callCount: usageData.length,
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

  type UsageRow = Tables<'openai_usage'>
  const usageData = data as UsageRow[]

  const totalCost = usageData.reduce((sum, row) => sum + Number(row.total_cost_usd), 0)
  const totalTokens = usageData.reduce((sum, row) => sum + Number(row.total_tokens), 0)

  // Group by model
  const byModel: Record<string, { cost: number; tokens: number; calls: number }> = {}
  usageData.forEach(row => {
    if (!byModel[row.model]) {
      byModel[row.model] = { cost: 0, tokens: 0, calls: 0 }
    }
    byModel[row.model].cost += Number(row.total_cost_usd)
    byModel[row.model].tokens += Number(row.total_tokens)
    byModel[row.model].calls += 1
  })

  // Group by purpose
  const byPurpose: Record<string, { cost: number; tokens: number; calls: number }> = {}
  usageData.forEach(row => {
    if (!byPurpose[row.purpose]) {
      byPurpose[row.purpose] = { cost: 0, tokens: 0, calls: 0 }
    }
    byPurpose[row.purpose].cost += Number(row.total_cost_usd)
    byPurpose[row.purpose].tokens += Number(row.total_tokens)
    byPurpose[row.purpose].calls += 1
  })

  return {
    totalCost,
    callCount: usageData.length,
    totalTokens,
    byModel,
    byPurpose
  }
}

