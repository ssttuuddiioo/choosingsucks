import { NextRequest, NextResponse } from 'next/server'
import { getTotalAPICosts, getAverageCostPerSession } from '@/lib/utils/api-tracker'
import { createServerClient } from '@/lib/utils/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '30')
    const supabase = createServerClient()

    // Get comprehensive costs across all APIs
    const costs = await getTotalAPICosts(days)
    const avgPerSession = await getAverageCostPerSession(days)

    // Get month-to-date costs
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const { data: monthData } = await supabase
      .from('api_usage')
      .select('total_cost_usd, api_provider')
      .gte('created_at', monthStart.toISOString())

    const monthUsage = monthData as any
    const monthToDateCost = monthUsage?.reduce((sum: number, row: any) => 
      sum + Number(row.total_cost_usd), 0) || 0

    // Get all-time costs
    const { data: allTimeData } = await supabase
      .from('api_usage')
      .select('total_cost_usd, created_at')
      .order('created_at', { ascending: true })

    const allUsage = allTimeData as any
    const allTimeCost = allUsage?.reduce((sum: number, row: any) => 
      sum + Number(row.total_cost_usd), 0) || 0
    const firstCall = allUsage?.[0]?.created_at

    // Get call counts by provider
    const { data: callCounts } = await supabase
      .from('api_usage')
      .select('api_provider, api_endpoint, request_count')
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())

    const counts = callCounts as any
    const providerCalls: Record<string, number> = {}
    counts?.forEach((row: any) => {
      providerCalls[row.api_provider] = (providerCalls[row.api_provider] || 0) + (row.request_count || 1)
    })

    return NextResponse.json({
      period: `Last ${days} days`,
      summary: {
        totalCost: `$${costs.totalCost.toFixed(2)}`,
        monthToDateCost: `$${monthToDateCost.toFixed(2)}`,
        allTimeCost: `$${allTimeCost.toFixed(2)}`,
        averageCostPerSession: `$${avgPerSession.toFixed(4)}`,
        firstCallDate: firstCall || 'No data yet',
      },
      byProvider: Object.entries(costs.byProvider).map(([provider, cost]) => ({
        provider,
        cost: `$${cost.toFixed(2)}`,
        calls: providerCalls[provider] || 0,
        costPerCall: providerCalls[provider] > 0 
          ? `$${(cost / providerCalls[provider]).toFixed(6)}`
          : '$0.000000'
      })),
      byEndpoint: Object.entries(costs.byEndpoint).map(([key, data]) => {
        const [provider, endpoint] = key.split(':')
        return {
          provider,
          endpoint,
          calls: data.calls,
          cost: `$${data.cost.toFixed(4)}`,
          costPerCall: `$${(data.cost / data.calls).toFixed(6)}`
        }
      }),
      watchmodeQuota: {
        note: "Watchmode usage from your dashboard",
        currentUsage: "398 / 1,000 (free tier)",
        recommendation: "Track in database going forward"
      }
    })
  } catch (error) {
    console.error('Error fetching cost stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}

