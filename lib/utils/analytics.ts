interface AnalyticsEvent {
  event: string
  sessionId?: string
  zipCode?: string
  placeId?: string
  meta?: Record<string, any>
}

class Analytics {
  private queue: AnalyticsEvent[] = []
  private flushTimer: NodeJS.Timeout | null = null
  private edgeFunctionUrl: string

  constructor() {
    // Use the API route instead of edge function directly
    this.edgeFunctionUrl = '/api/analytics'
  }

  track(event: AnalyticsEvent): void {
    this.queue.push({
      ...event,
      meta: {
        ...event.meta,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      }
    })

    // Debounce flush
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
    }

    this.flushTimer = setTimeout(() => this.flush(), 1000)

    // Flush immediately if queue is getting large
    if (this.queue.length >= 10) {
      this.flush()
    }
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return

    const events = [...this.queue]
    this.queue = []

    try {
      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(events),
      })

      if (!response.ok) {
        console.error('Analytics flush failed:', response.status)
      }
    } catch (error) {
      console.error('Analytics flush error:', error)
    }
  }

  // Specific event methods
  sessionCreated(sessionId: string, zipCode: string): void {
    this.track({
      event: 'session_created',
      sessionId,
      zipCode,
    })
  }

  participantJoined(sessionId: string, isHost: boolean = false): void {
    this.track({
      event: 'participant_joined',
      sessionId,
      meta: { isHost },
    })
  }

  swipe(sessionId: string, placeId: string, vote: boolean): void {
    this.track({
      event: vote ? 'swipe_yes' : 'swipe_no',
      sessionId,
      placeId,
    })
  }

  matched(sessionId: string, placeId: string, zipCode?: string): void {
    this.track({
      event: 'matched',
      sessionId,
      placeId,
      zipCode,
    })
  }

  sessionExhausted(sessionId: string): void {
    this.track({
      event: 'session_exhausted',
      sessionId,
    })
  }
}

// Export singleton instance
export const analytics = new Analytics()

