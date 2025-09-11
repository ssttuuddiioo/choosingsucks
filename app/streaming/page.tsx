'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Play, Loader2 } from 'lucide-react'
import { nanoid } from 'nanoid'

import ContentTypeSection from '@/components/streaming/content-type-section'
import StreamingServicesSection from '@/components/streaming/streaming-services-section'
import GenresSection from '@/components/streaming/genres-section'
import SetupPageTemplate from '@/components/shared/setup-page-template'
import { Tv } from 'lucide-react'
import { 
  StreamingPreferences, 
  DEFAULT_PREFERENCES,
  STREAMING_SERVICES 
} from '@/lib/constants/streaming'

export default function StreamingPage() {
  const router = useRouter()
  const [preferences, setPreferences] = useState<StreamingPreferences>(DEFAULT_PREFERENCES)
  const [isCreatingSession, setIsCreatingSession] = useState(false)

  const updateContentTypes = (contentTypes: ('movie' | 'tv_series')[]) => {
    setPreferences(prev => ({ ...prev, contentTypes }))
  }

  const updateStreamingServices = (streamingServices: number[]) => {
    setPreferences(prev => ({ ...prev, streamingServices }))
  }

  const updateGenres = (genres: number[]) => {
    setPreferences(prev => ({ ...prev, genres }))
  }

  const canStartSession = () => {
    return preferences.contentTypes.length > 0 && preferences.streamingServices.length > 0
  }

  const createStreamingSession = async () => {
    if (!canStartSession()) return

    setIsCreatingSession(true)
    
    try {
      const sessionId = nanoid()
      
      // Create session with preferences
      const response = await fetch('/api/streaming-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          preferences
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create streaming session')
      }

      const data = await response.json()
      
      if (data.success) {
        // Store candidates in session storage for the session page to access
        if (data.candidates) {
          sessionStorage.setItem(`streaming-session-${sessionId}`, JSON.stringify(data.candidates))
        }
        
        // Navigate to streaming session page (similar to restaurant session)
        router.push(`/streaming/${sessionId}`)
      } else {
        throw new Error(data.error || 'Failed to create session')
      }
    } catch (error) {
      console.error('Error creating streaming session:', error)
      // TODO: Show error toast
    } finally {
      setIsCreatingSession(false)
    }
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