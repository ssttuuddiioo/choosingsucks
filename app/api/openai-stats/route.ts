import { NextRequest, NextResponse } from 'next/server'
import { getGlobalOpenAIStats } from '@/lib/utils/openai-tracker'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '30')

    const stats = await getGlobalOpenAIStats(days)

    return NextResponse.json({
      period: `Last ${days} days`,
      summary: {
        totalCost: `$${stats.totalCost.toFixed(2)}`,
        totalCalls: stats.callCount,
        totalTokens: stats.totalTokens.toLocaleString(),
        averageCostPerCall: stats.callCount > 0 
          ? `$${(stats.totalCost / stats.callCount).toFixed(4)}`
          : '$0.0000'
      },
      byModel: Object.entries(stats.byModel).map(([model, data]) => ({
        model,
        calls: data.calls,
        tokens: data.tokens.toLocaleString(),
        cost: `$${data.cost.toFixed(4)}`,
        avgCostPerCall: `$${(data.cost / data.calls).toFixed(4)}`
      })),
      byPurpose: Object.entries(stats.byPurpose).map(([purpose, data]) => ({
        purpose,
        calls: data.calls,
        tokens: data.tokens.toLocaleString(),
        cost: `$${data.cost.toFixed(4)}`,
        avgCostPerCall: `$${(data.cost / data.calls).toFixed(4)}`
      }))
    })
  } catch (error) {
    console.error('Error fetching OpenAI stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}

