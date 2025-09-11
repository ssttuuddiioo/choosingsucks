'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Play, Loader2 } from 'lucide-react'
import { nanoid } from 'nanoid'

import ContentTypeSection from '@/components/streaming/content-type-section'
import StreamingServicesSection from '@/components/streaming/streaming-services-section'
import GenresSection from '@/components/streaming/genres-section'
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
    <div className="h-screen flex flex-col bg-gradient-primary overflow-hidden" style={{ height: '100dvh' }}>
      {/* Header - Fixed */}
      <div className="flex justify-between items-center p-4 flex-shrink-0 bg-gradient-primary backdrop-blur border-b border-white/10 relative z-20">
        <div>
          <h1 
            className="text-2xl font-outfit font-black leading-tight logo-chunky cursor-pointer hover:scale-105 transition-transform"
            onClick={() => router.push('/')}
          >
            <div>
              <span className="gradient-text">CHOOSING </span>
              <span className="text-white">SHOWS </span>
              <span className="gradient-text">SUCKS</span>
            </div>
          </h1>
          <p className="text-white/70 text-sm font-semibold">
            Set your preferences and we'll find the perfect match
          </p>
        </div>
        <div className="p-2 rounded-xl">
          <Play className="h-6 w-6 text-white/70" />
        </div>
      </div>
      
      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 space-y-6">

        {/* Setup Sections */}
        <div className="space-y-6">
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
        </div>

        {/* Start Button */}
        <motion.div 
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {/* Start Button */}
          <button
            onClick={createStreamingSession}
            disabled={!canStartSession() || isCreatingSession}
            className={`
              w-full py-4 rounded-2xl font-bold text-xl transition-all duration-300 transform
              flex items-center justify-center gap-3
              ${canStartSession() && !isCreatingSession
                ? 'bg-gradient-electric text-white shadow-lg hover:scale-105 active:scale-95' 
                : 'bg-white/20 text-white/50 cursor-not-allowed'
              }
            `}
          >
            {isCreatingSession ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                Shuffling cards...
              </>
            ) : (
              <>
                <Play className="h-6 w-6" />
                Start Swipe Session
              </>
            )}
          </button>

          {!canStartSession() && (
            <p className="text-white/60 text-sm text-center">
              Please select at least one content type and streaming service to continue
            </p>
          )}
        </motion.div>
        </div>
      </div>
    </div>
  )
}