'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Play, Loader2 } from 'lucide-react'
import { nanoid } from 'nanoid'

import ContentTypeSection from '@/components/streaming/content-type-section'
import StreamingServicesSection from '@/components/streaming/streaming-services-section'
import GenresSection from '@/components/streaming/genres-section'
import SortPreferenceSection from '@/components/streaming/sort-preference-section'
import SetupPageTemplate from '@/components/shared/setup-page-template'
import SessionCreatedScreen from '@/components/streaming/session-created-screen'
import { Tv } from 'lucide-react'
import { generateShareToken } from '@/lib/utils/session'
import { 
  StreamingPreferences, 
  SortPreference,
  DEFAULT_PREFERENCES,
  STREAMING_SERVICES 
} from '@/lib/constants/streaming'

export default function StreamingPage() {
  const router = useRouter()
  const [preferences, setPreferences] = useState<StreamingPreferences>(DEFAULT_PREFERENCES)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [sessionCreated, setSessionCreated] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [shareLink, setShareLink] = useState('')

  const updateContentTypes = (contentTypes: ('movie' | 'tv_series')[]) => {
    setPreferences(prev => ({ ...prev, contentTypes }))
  }

  const updateStreamingServices = (streamingServices: number[]) => {
    setPreferences(prev => ({ ...prev, streamingServices }))
  }

  const updateGenres = (genres: number[]) => {
    setPreferences(prev => ({ ...prev, genres }))
  }

  const updateSortBy = (sortBy: SortPreference) => {
    setPreferences(prev => ({ ...prev, sortBy }))
  }

  const canStartSession = () => {
    return preferences.contentTypes.length > 0 && preferences.streamingServices.length > 0
  }

  const createStreamingSession = async () => {
    if (!canStartSession()) return

    setIsCreatingSession(true)
    
    try {
      const newSessionId = nanoid()
      const shareToken = generateShareToken()
      const newShareLink = `${window.location.origin}/streaming/${newSessionId}?t=${shareToken}`
      
      // Set session created state immediately to show sharing screen
      setSessionId(newSessionId)
      setShareLink(newShareLink)
      setSessionCreated(true)
      setIsCreatingSession(false)
      
      // Load content in background while user shares the session
      const loadContent = async () => {
        try {
          console.log('🔄 Loading streaming content in background...')
          const response = await fetch('/api/streaming-search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: newSessionId,
              preferences
            }),
          })

          if (response.ok) {
            const data = await response.json()
            console.log(`✅ Created streaming session with ${data.candidatesAdded} candidates`)
          } else {
            console.error('❌ Background API response not ok:', response.status)
          }
        } catch (error) {
          console.error('❌ Background API loading error:', error)
        }
      }
      
      // Start loading immediately (no delay)
      loadContent()
      
    } catch (error) {
      console.error('Error creating streaming session:', error)
      setIsCreatingSession(false)
    }
  }

  const handleJoinSession = () => {
    router.push(`/streaming/${sessionId}`)
  }

  // Show session created screen
  if (sessionCreated) {
    return (
      <SessionCreatedScreen
        sessionId={sessionId}
        shareLink={shareLink}
        onJoinSession={handleJoinSession}
      />
    )
  }

  return (
    <SetupPageTemplate
      title={{
        choosing: "CHOOSING",
        subject: "SHOWS",
        sucks: "SUCKS"
      }}
      subtitle="Set your preferences and we'll find the perfect match"
      icon={<Tv className="h-6 w-6 text-white/70" />}
      onStartSession={createStreamingSession}
      canStartSession={canStartSession()}
      isCreatingSession={isCreatingSession}
      sessionButtonText="Start Swipe Session"
      loadingText="Shuffling cards..."
      errorMessage="Please select at least one content type and streaming service to continue"
    >
      <SortPreferenceSection 
        sortBy={preferences.sortBy}
        onSortChange={updateSortBy}
      />
      
      <ContentTypeSection 
        contentTypes={preferences.contentTypes}
        onContentTypesChange={updateContentTypes}
      />
      
      <StreamingServicesSection 
        selectedServices={preferences.streamingServices}
        onServicesChange={updateStreamingServices}
      />
      
      <GenresSection 
        selectedGenres={preferences.genres}
        onGenresChange={updateGenres}
      />
    </SetupPageTemplate>
  )
}