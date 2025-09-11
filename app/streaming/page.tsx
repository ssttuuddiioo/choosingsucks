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
  ContentType, 
  StreamingPreferences, 
  DEFAULT_PREFERENCES,
  STREAMING_SERVICES 
} from '@/lib/constants/streaming'

export default function StreamingPage() {
  const router = useRouter()
  const [preferences, setPreferences] = useState<StreamingPreferences>(DEFAULT_PREFERENCES)
  const [isCreatingSession, setIsCreatingSession] = useState(false)

  const updateContentType = (contentType: ContentType) => {
    setPreferences(prev => ({ ...prev, contentType }))
  }

  const updateStreamingServices = (streamingServices: number[]) => {
    setPreferences(prev => ({ ...prev, streamingServices }))
  }

  const updateAllServices = (useAllServices: boolean) => {
    setPreferences(prev => ({ ...prev, useAllServices }))
  }

  const updateGenres = (genres: number[]) => {
    setPreferences(prev => ({ ...prev, genres }))
  }

  const canStartSession = () => {
    return preferences.useAllServices || preferences.streamingServices.length > 0
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

  const getSelectedServicesText = () => {
    if (preferences.useAllServices) {
      return 'All streaming services'
    }
    if (preferences.streamingServices.length === 0) {
      return 'No services selected'
    }
    if (preferences.streamingServices.length === 1) {
      const service = STREAMING_SERVICES.find(s => s.id === preferences.streamingServices[0])
      return service?.name || '1 service'
    }
    return `${preferences.streamingServices.length} services selected`
  }

  const getContentTypeText = () => {
    switch (preferences.contentType) {
      case 'tv_series': return 'TV Shows'
      case 'movie': return 'Movies'
      case 'both': return 'TV Shows & Movies'
      default: return 'Content'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-primary flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <motion.div 
          className="text-center space-y-4"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <h1 className="text-4xl md:text-5xl font-outfit font-black gradient-text leading-tight">
            What to Stream?
          </h1>
          <p className="text-white/70 text-lg md:text-xl">
            Set your preferences and we'll find the perfect match
          </p>
        </motion.div>

        {/* Setup Sections */}
        <div className="space-y-6">
          <ContentTypeSection 
            contentType={preferences.contentType}
            onContentTypeChange={updateContentType}
          />
          
          <StreamingServicesSection 
            selectedServices={preferences.streamingServices}
            useAllServices={preferences.useAllServices}
            onServicesChange={updateStreamingServices}
            onAllServicesToggle={updateAllServices}
          />
          
          <GenresSection 
            selectedGenres={preferences.genres}
            onGenresChange={updateGenres}
          />
        </div>

        {/* Session Summary & Start Button */}
        <motion.div 
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {/* Summary */}
          <div className="bg-white/5 rounded-2xl p-4 text-center">
            <p className="text-white/80 text-sm">
              Ready to find <span className="font-bold text-white">{getContentTypeText()}</span> on{' '}
              <span className="font-bold text-white">{getSelectedServicesText()}</span>
              {preferences.genres.length > 0 && (
                <>
                  {' '}in <span className="font-bold text-white">
                    {preferences.genres.length} selected genre{preferences.genres.length > 1 ? 's' : ''}
                  </span>
                </>
              )}
            </p>
          </div>

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
                Finding Content...
              </>
            ) : (
              <>
                <Play className="h-6 w-6" />
                Start Streaming Session
              </>
            )}
          </button>

          {!canStartSession() && (
            <p className="text-white/60 text-sm text-center">
              Please select at least one streaming service to continue
            </p>
          )}
        </motion.div>
      </div>
    </div>
  )
}