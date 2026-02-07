import { useEffect, useRef } from 'react'
import { createBrowserClient } from '@/lib/utils/supabase-client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeOptions {
  channel: string
  onMessage?: (payload: any) => void
  onPresenceSync?: (state: any) => void
  onPresenceJoin?: (key: string, currentPresences: any, newPresences: any) => void
  onPresenceLeave?: (key: string, currentPresences: any, leftPresences: any) => void
}

export function useRealtime({
  channel: channelName,
  onMessage,
  onPresenceSync,
  onPresenceJoin,
  onPresenceLeave,
}: UseRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Store callbacks in refs so channel subscription stays stable
  const onMessageRef = useRef(onMessage)
  const onPresenceSyncRef = useRef(onPresenceSync)
  const onPresenceJoinRef = useRef(onPresenceJoin)
  const onPresenceLeaveRef = useRef(onPresenceLeave)

  // Keep refs up to date without triggering re-subscription
  useEffect(() => { onMessageRef.current = onMessage }, [onMessage])
  useEffect(() => { onPresenceSyncRef.current = onPresenceSync }, [onPresenceSync])
  useEffect(() => { onPresenceJoinRef.current = onPresenceJoin }, [onPresenceJoin])
  useEffect(() => { onPresenceLeaveRef.current = onPresenceLeave }, [onPresenceLeave])

  useEffect(() => {
    const supabase = createBrowserClient()

    // Create channel
    const channel = supabase.channel(channelName)

    // Set up event listeners using stable ref-based callbacks
    channel.on('broadcast', { event: '*' }, (payload) => {
      onMessageRef.current?.(payload)
    })

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      onPresenceSyncRef.current?.(state)
    })

    channel.on('presence', { event: 'join' }, ({ key, currentPresences, newPresences }) => {
      onPresenceJoinRef.current?.(key, currentPresences, newPresences)
    })

    channel.on('presence', { event: 'leave' }, ({ key, currentPresences, leftPresences }) => {
      onPresenceLeaveRef.current?.(key, currentPresences, leftPresences)
    })

    // Subscribe to channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Connected to channel: ${channelName}`)
      }
    })

    channelRef.current = channel

    // Cleanup
    return () => {
      channel.unsubscribe()
    }
  }, [channelName]) // Only re-subscribe when channel name changes

  // Function to send broadcast message
  const broadcast = async (event: string, payload: any) => {
    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event,
        payload,
      })
    }
  }

  // Function to track presence
  const trackPresence = async (state: any) => {
    if (channelRef.current) {
      await channelRef.current.track(state)
    }
  }

  return {
    broadcast,
    trackPresence,
  }
}
