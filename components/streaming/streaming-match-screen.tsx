import { Star, Calendar, Clock, ExternalLink, Plus } from 'lucide-react'
import type { Tables } from '@/types/supabase'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Lottie from 'lottie-react'
import confettiAnimation from '@/lib/animations/confetti.json'
import { cn } from '@/lib/utils/cn'

interface StreamingMatchScreenProps {
  session: Tables<'sessions'>
  candidate?: Tables<'candidates'>
}

export default function StreamingMatchScreen({ session, candidate }: StreamingMatchScreenProps) {
  const router = useRouter()
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    // Hide confetti after 3 seconds
    const timer = setTimeout(() => setShowConfetti(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  if (!candidate) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white/70">Loading match details...</p>
        </div>
      </div>
    )
  }

  const formatRuntime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`
    }
    return `${minutes}m`
  }

  return (
    <div className="min-h-screen bg-gradient-primary md:flex md:items-center md:justify-center md:p-4 relative overflow-hidden">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-50">
          <Lottie 
            animationData={confettiAnimation}
            loop={false}
            className="w-full h-full"
          />
        </div>
      )}

      <motion.div 
        initial={{ scale: 0.8, opacity: 0, rotateY: 180 }}
        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 100, 
          damping: 15,
          duration: 0.8 
        }}
        className="md:glass-card md:max-w-md w-full overflow-hidden min-h-screen md:min-h-0 flex flex-col"
      >
        {/* Success Header */}
        <div className="bg-gradient-lime p-6 text-center">
          <motion.h1 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-outfit font-bold text-white"
          >
            Unanimous decision!
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-white/90 mt-2"
          >
            {session.match_requirement === 'all' 
              ? "Everyone agreed on this one" 
              : "Majority has spoken"}
          </motion.p>
        </div>

        {/* Content Image */}
        {(candidate.poster || candidate.image_url) && (
          <div className="relative h-48 bg-gradient-mesh animate-gradient">
            <img
              src={candidate.poster || candidate.image_url || ''}
              alt={candidate.title || candidate.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}

        {/* Content Details */}
        <div className="flex-1 p-6 space-y-4 flex flex-col">
          <div>
            <h2 className="text-2xl font-outfit font-bold text-white">
              {candidate.title || candidate.name}
            </h2>
            {candidate.original_title && candidate.original_title !== candidate.title && (
              <p className="text-white/70 text-sm mt-1">
                {candidate.original_title}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-2">
            {candidate.user_rating && (
              <div className="flex items-center gap-1 bg-white/10 px-3 py-2 rounded-lg">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span className="font-bold text-white">{Number(candidate.user_rating).toFixed(1)}</span>
              </div>
            )}

            {candidate.year && (
              <div className="flex items-center gap-1 bg-white/10 px-3 py-2 rounded-lg">
                <Calendar className="h-4 w-4 text-white/70" />
                <span className="text-white font-bold">{candidate.year}</span>
              </div>
            )}

            {candidate.runtime_minutes && (
              <div className="flex items-center gap-1 bg-white/10 px-3 py-2 rounded-lg">
                <Clock className="h-4 w-4 text-white/70" />
                <span className="text-white font-bold">{formatRuntime(candidate.runtime_minutes)}</span>
              </div>
            )}
          </div>

          {/* Content Type Badge */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-gradient-electric text-white text-sm rounded-full font-semibold">
              {candidate.content_type === 'tv_series' ? 'TV Series' : 'Movie'}
            </span>
          </div>

          {/* Genres */}
          {candidate.genre_names && candidate.genre_names.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {candidate.genre_names.slice(0, 3).map((genre, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-white/10 text-white text-xs rounded-full font-semibold"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* Plot Overview */}
          {(candidate.plot_overview || candidate.description) && (
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-white/80 text-sm leading-relaxed">
                {candidate.plot_overview || candidate.description}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-auto space-y-3 pt-4">
            <button
              onClick={() => {
                // Try to find the content on popular streaming services
                const searchQuery = encodeURIComponent(candidate.title || candidate.name || '')
                window.open(`https://www.google.com/search?q=${searchQuery}+watch+online`, '_blank')
              }}
              className="btn-gradient-lime w-full flex items-center justify-center gap-2 text-lg"
            >
              <ExternalLink className="h-5 w-5" />
              Let's watch this
            </button>

            {/* Subtle New Session Button */}
            <button
              onClick={() => router.push('/streaming')}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 text-white/60 hover:text-white/80 transition-all text-sm"
            >
              <Plus className="h-4 w-4" />
              Start a new streaming session
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
