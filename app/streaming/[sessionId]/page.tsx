'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import { Star, Clock, Calendar, ExternalLink, ArrowLeft } from 'lucide-react'

interface StreamingCandidate {
  id: number
  title: string
  original_title: string
  type: 'movie' | 'tv_series'
  year: number
  runtime_minutes?: number
  plot_overview: string
  genre_names: string[]
  user_rating: number
  critic_score?: number
  poster: string
  backdrop: string
  sources: any[]
  session_id: string
}

export default function StreamingSessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  
  const [candidates, setCandidates] = useState<StreamingCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    // For now, we'll get the candidates from the API response
    // In a full implementation, this would fetch from the database
    fetchSessionData()
  }, [sessionId])

  const fetchSessionData = async () => {
    try {
      // This is a placeholder - in reality, you'd fetch from your database
      // For now, we'll simulate having data
      setLoading(false)
      
      // TODO: Implement proper session data fetching
      setError('Session data loading not yet implemented. Please go back and create a new session.')
      
    } catch (err) {
      console.error('Error fetching session data:', err)
      setError('Failed to load streaming session')
      setLoading(false)
    }
  }

  const formatRuntime = (minutes?: number) => {
    if (!minutes) return null
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}m`
    return `${hours}h ${mins}m`
  }

  const currentCandidate = candidates[currentIndex]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/70">Loading your streaming session...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-6xl">😕</div>
          <h1 className="text-2xl font-bold text-white">Oops!</h1>
          <p className="text-white/70">{error}</p>
          <button
            onClick={() => router.push('/streaming')}
            className="bg-gradient-electric text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
          >
            <ArrowLeft className="h-4 w-4 inline mr-2" />
            Back to Setup
          </button>
        </div>
      </div>
    )
  }

  if (candidates.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-6xl">🎬</div>
          <h1 className="text-2xl font-bold text-white">No Content Found</h1>
          <p className="text-white/70">
            We couldn't find any content matching your preferences. 
            Try adjusting your filters.
          </p>
          <button
            onClick={() => router.push('/streaming')}
            className="bg-gradient-electric text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
          >
            <ArrowLeft className="h-4 w-4 inline mr-2" />
            Try Different Preferences
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-primary">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <button
          onClick={() => router.push('/streaming')}
          className="text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="text-white/70 text-sm">
          {currentIndex + 1} of {candidates.length}
        </div>
      </div>

      {/* Content Card */}
      <div className="px-4 pb-4">
        <motion.div
          key={currentCandidate.id}
          className="max-w-md mx-auto bg-white/10 rounded-3xl overflow-hidden backdrop-blur-lg"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Poster/Backdrop */}
          <div className="aspect-[2/3] relative overflow-hidden">
            <img
              src={currentCandidate.poster || currentCandidate.backdrop}
              alt={currentCandidate.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/placeholder-poster.jpg' // You'll need to add a placeholder
              }}
            />
            
            {/* Type Badge */}
            <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-bold">
              {currentCandidate.type === 'tv_series' ? 'TV Series' : 'Movie'}
            </div>

            {/* Rating */}
            {currentCandidate.user_rating && (
              <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                {currentCandidate.user_rating.toFixed(1)}
              </div>
            )}
          </div>

          {/* Content Info */}
          <div className="p-6 space-y-4">
            <div>
              <h1 className="text-white text-2xl font-bold leading-tight mb-2">
                {currentCandidate.title}
              </h1>
              
              <div className="flex items-center gap-4 text-white/70 text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {currentCandidate.year}
                </div>
                
                {currentCandidate.runtime_minutes && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatRuntime(currentCandidate.runtime_minutes)}
                  </div>
                )}
              </div>
            </div>

            {/* Genres */}
            {currentCandidate.genre_names.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {currentCandidate.genre_names.slice(0, 3).map((genre) => (
                  <span
                    key={genre}
                    className="bg-white/20 text-white px-3 py-1 rounded-full text-sm"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* Plot */}
            {currentCandidate.plot_overview && (
              <p className="text-white/80 text-sm leading-relaxed">
                {currentCandidate.plot_overview}
              </p>
            )}

            {/* Streaming Sources */}
            {currentCandidate.sources.length > 0 && (
              <div>
                <h3 className="text-white font-bold mb-2">Available On:</h3>
                <div className="flex flex-wrap gap-2">
                  {currentCandidate.sources.slice(0, 4).map((source, index) => (
                    <span
                      key={index}
                      className="bg-gradient-electric text-white px-3 py-1 rounded-full text-sm font-bold"
                    >
                      {source.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Action Buttons */}
        <div className="max-w-md mx-auto mt-6 flex gap-4">
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="flex-1 bg-white/20 text-white py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/30 transition-colors"
          >
            Pass
          </button>
          
          <button
            onClick={() => setCurrentIndex(Math.min(candidates.length - 1, currentIndex + 1))}
            disabled={currentIndex === candidates.length - 1}
            className="flex-1 bg-gradient-electric text-white py-3 rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Like
          </button>
        </div>
      </div>
    </div>
  )
}
