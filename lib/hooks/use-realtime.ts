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

  useEffect(() => {
    const supabase = createBrowserClient()
    
    // Create channel
    const channel = supabase.channel(channelName)

    // Set up event listeners
    if (onMessage) {
      channel.on('broadcast', { event: '*' }, onMessage)
    }

    if (onPresenceSync) {
      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        onPresenceSync(state)
      })
    }

    if (onPresenceJoin) {
      channel.on('presence', { event: 'join' }, ({ key, currentPresences, newPresences }) => {
        onPresenceJoin(key, currentPresences, newPresences)
      })
    }

    if (onPresenceLeave) {
      channel.on('presence', { event: 'leave' }, ({ key, currentPresences, leftPresences }) => {
        onPresenceLeave(key, currentPresences, leftPresences)
      })
    }

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
  }, [channelName, onMessage, onPresenceSync, onPresenceJoin, onPresenceLeave])

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


