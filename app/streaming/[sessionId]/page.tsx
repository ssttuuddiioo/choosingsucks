'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import StreamingSwipeInterface from '@/components/streaming/streaming-swipe-interface'

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

  useEffect(() => {
    // For now, we'll get the candidates from the API response
    // In a full implementation, this would fetch from the database
    fetchSessionData()
  }, [sessionId])

  const fetchSessionData = async () => {
    try {
      // For now, we'll use session storage to get the candidates
      // In a production app, you'd fetch from your database using the sessionId
      const storedCandidates = sessionStorage.getItem(`streaming-session-${sessionId}`)
      
      if (storedCandidates) {
        const parsedCandidates = JSON.parse(storedCandidates)
        setCandidates(parsedCandidates)
        setLoading(false)
      } else {
        // If no stored data, show error
        setError('Session expired or not found. Please go back and create a new session.')
        setLoading(false)
      }
      
    } catch (err) {
      console.error('Error fetching session data:', err)
      setError('Failed to load streaming session')
      setLoading(false)
    }
  }

  const handleSwipe = (candidateId: number, vote: boolean) => {
    console.log(`${vote ? 'Liked' : 'Rejected'} title:`, candidateId)
    // TODO: Store vote in database for matching logic
    // For now, just log the vote
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/70">Shuffling cards...</p>
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
    <StreamingSwipeInterface 
      candidates={candidates}
      onSwipe={handleSwipe}
    />
  )
}
