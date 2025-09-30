'use client'

import { useState } from 'react'
import { Star, Clock, Calendar } from 'lucide-react'
import type { Tables } from '@/types/supabase'
import { cn } from '@/lib/utils/cn'

interface StreamingCardProps {
  candidate: Tables<'candidates'>
  className?: string
  style?: React.CSSProperties
}

export default function StreamingCard({ candidate, className, style }: StreamingCardProps) {
  const [imageError, setImageError] = useState(false)

  const formatRuntime = (minutes?: number) => {
    if (!minutes) return null
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}m`
    return `${hours}h ${mins}m`
  }

  return (
    <div className={cn("h-full bg-white overflow-hidden flex flex-col relative rounded-2xl shadow-2xl", className)} style={style}>
      {/* Poster Image */}
      <div 
        className="relative bg-gradient-to-br from-electric-purple/20 to-hot-pink/20"
        style={{ 
          flex: '1 1 0',
          minHeight: '300px',
          maxHeight: 'calc(100% - 200px)'
        }}
      >
        {(candidate.poster || candidate.image_url) && !imageError ? (
          <>
            <img
              src={candidate.backdrop || candidate.poster || candidate.image_url || ''}
              alt={candidate.title || candidate.name}
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-mesh animate-gradient">
            <div className="text-center">
              <div className="text-8xl font-outfit font-bold text-white/20">
                {(candidate.title || candidate.name || '?').charAt(0)}
              </div>
            </div>
          </div>
        )}

        {/* Type Badge */}
        <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-bold">
          {candidate.content_type === 'tv_series' ? 'TV Series' : 
           candidate.content_type === 'tv_miniseries' ? 'Limited Series' :
           candidate.content_type === 'tv_special' ? 'TV Special' : 'Movie'}
        </div>

        {/* Rating */}
        {candidate.user_rating && (
          <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            {Number(candidate.user_rating).toFixed(1)}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="flex-shrink-0 p-6 space-y-3">
        <div>
          <h1 className="text-gray-900 text-2xl font-bold leading-tight mb-2">
            {candidate.title || candidate.name}
          </h1>
          
          <div className="flex items-center gap-4 text-gray-600 text-sm mb-3">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {candidate.year}
            </div>
            
            {candidate.runtime_minutes && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatRuntime(candidate.runtime_minutes)}
              </div>
            )}

            {candidate.us_rating && (
              <div className="bg-gray-200 px-2 py-1 rounded text-xs font-bold text-gray-700">
                {candidate.us_rating}
              </div>
            )}
          </div>

          {/* Genres */}
          {candidate.genre_names && candidate.genre_names.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {candidate.genre_names.slice(0, 3).map((genre: string) => (
                <span
                  key={genre}
                  className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* Plot */}
          {(candidate.plot_overview || candidate.description) && (
            <p className="text-gray-700 text-sm leading-relaxed line-clamp-3">
              {candidate.plot_overview || candidate.description}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

