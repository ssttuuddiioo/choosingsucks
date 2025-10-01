'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Phone, Globe, Star, Clock, Calendar, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Tables } from '@/types/supabase'
import { cn } from '@/lib/utils/cn'
import { env } from '@/lib/utils/env'

interface LearnMoreModalProps {
  candidate: Tables<'candidates'>
  category: 'restaurants' | 'streaming' | 'build-your-own'
  isOpen: boolean
  onClose: () => void
  userLocation?: { city: string; region: string; country: string }
}

interface EnhancedData {
  description?: string
  phone?: string
  website?: string
  hours?: string[]
  photos?: string[]
  amenities?: string[]
  runtime?: number
  usRating?: string
  criticScore?: number
  trailer?: string
  sources?: any[]
  externalLinks?: {
    googleMaps?: string
    website?: string
  }
  citations?: { url: string; title: string }[]
  loading?: boolean
  error?: string
}

export default function LearnMoreModal({ 
  candidate, 
  category, 
  isOpen, 
  onClose,
  userLocation 
}: LearnMoreModalProps) {
  const [enhancedData, setEnhancedData] = useState<EnhancedData>({ loading: true })
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)

  // Fetch enhanced data when modal opens
  useEffect(() => {
    if (!isOpen) return

    const fetchEnhancedData = async () => {
      setEnhancedData({ loading: true })
      
      try {
        if (category === 'restaurants') {
          const response = await fetch('/api/restaurant-details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              placeId: candidate.place_id,
              candidateId: candidate.id // For caching
            })
          })
          
          if (response.ok) {
            const data = await response.json()
            setEnhancedData({ ...data, loading: false })
          } else {
            setEnhancedData({ loading: false, error: 'Failed to load details' })
          }
        } else if (category === 'streaming') {
          // Streaming uses lazy loading - fetch details on-demand
          const response = await fetch('/api/streaming-details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidateId: candidate.id })
          })
          
          if (response.ok) {
            const data = await response.json()
            setEnhancedData({ 
              description: data.plot_overview || undefined,
              loading: false,
              // Store additional fields for display
              runtime: data.runtime_minutes,
              usRating: data.us_rating,
              criticScore: data.critic_score,
              trailer: data.trailer,
              sources: data.sources
            })
          } else {
            // Fallback to basic data if details fetch fails
            setEnhancedData({ 
              description: undefined,
              loading: false 
            })
          }
        } else if (category === 'build-your-own') {
          // Check if AI enhancement is enabled for this session
          const response = await fetch('/api/byo-enhance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              candidateId: candidate.id,
              optionName: candidate.name,
              sessionId: candidate.session_id
            })
          })
          
          if (response.ok) {
            const data = await response.json()
            setEnhancedData({ ...data, loading: false })
          } else {
            setEnhancedData({ loading: false })
          }
        }
      } catch (err) {
        console.error('Error fetching enhanced data:', err)
        setEnhancedData({ loading: false, error: 'Failed to load details' })
      }
    }

    fetchEnhancedData()
  }, [isOpen, candidate.id, category])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Convert photo refs to URLs for restaurants
  const getPhotoUrl = (photoRef: string): string => {
    const apiKey = env.google.mapsApiKey
    if (!apiKey) return ''
    
    if (photoRef.startsWith('places/')) {
      return `https://places.googleapis.com/v1/${photoRef}/media?maxWidthPx=1200&key=${apiKey}`
    } else {
      return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${photoRef}&key=${apiKey}`
    }
  }

  // Get all photos for carousel
  const rawPhotos = enhancedData.photos || (candidate.photo_ref ? [candidate.photo_ref] : [])
  const photos = category === 'restaurants' 
    ? rawPhotos.map(ref => getPhotoUrl(ref))
    : rawPhotos
  const posterUrl = candidate.poster || candidate.image_url || candidate.backdrop

  const hasPhotos = photos.length > 0 || posterUrl

  const nextPhoto = () => {
    if (photos.length > 1) {
      setCurrentPhotoIndex((prev) => (prev + 1) % photos.length)
    }
  }

  const prevPhoto = () => {
    if (photos.length > 1) {
      setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 150) onClose()
            }}
            className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center p-0 sm:p-4"
          >
            <div className="bg-white w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl">
              {/* Header */}
              <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
                <h3 className="text-lg font-semibold text-gray-900">Details</h3>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Photo Carousel */}
                {hasPhotos && (
                  <div className="relative bg-gray-900 aspect-[4/3] sm:aspect-video">
                    {category === 'streaming' && posterUrl ? (
                      <img
                        src={posterUrl}
                        alt={candidate.title || candidate.name}
                        className="w-full h-full object-cover"
                      />
                    ) : photos.length > 0 ? (
                      <>
                        <img
                          src={photos[currentPhotoIndex]}
                          alt={`${candidate.name} - Photo ${currentPhotoIndex + 1}`}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Photo Navigation */}
                        {photos.length > 1 && (
                          <>
                            <button
                              onClick={prevPhoto}
                              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
                            >
                              <ChevronLeft className="h-6 w-6" />
                            </button>
                            <button
                              onClick={nextPhoto}
                              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
                            >
                              <ChevronRight className="h-6 w-6" />
                            </button>
                            
                            {/* Photo Dots */}
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                              {photos.map((_, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setCurrentPhotoIndex(idx)}
                                  className={cn(
                                    "w-2 h-2 rounded-full transition-all",
                                    idx === currentPhotoIndex 
                                      ? "bg-white w-6" 
                                      : "bg-white/50 hover:bg-white/75"
                                  )}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    ) : null}
                  </div>
                )}

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Loading State */}
                  {enhancedData.loading && (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-purple"></div>
                    </div>
                  )}

                  {/* Error State */}
                  {enhancedData.error && (
                    <div className="text-center py-8 text-gray-600">
                      <p>{enhancedData.error}</p>
                    </div>
                  )}

                  {/* Restaurant Content */}
                  {!enhancedData.loading && category === 'restaurants' && (
                    <RestaurantDetails candidate={candidate} data={enhancedData} />
                  )}

                  {/* Streaming Content */}
                  {!enhancedData.loading && category === 'streaming' && (
                    <StreamingDetails candidate={candidate} data={enhancedData} />
                  )}

                  {/* BYO Content */}
                  {!enhancedData.loading && category === 'build-your-own' && (
                    <BYODetails candidate={candidate} data={enhancedData} />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Restaurant Details Component
function RestaurantDetails({ candidate, data }: { candidate: Tables<'candidates'>, data: EnhancedData }) {
  return (
    <>
      {/* Title & Quick Info */}
      <div>
        <h2 className="text-2xl font-outfit font-bold text-gray-900 mb-2">{candidate.name}</h2>
        <div className="flex items-center gap-3 flex-wrap">
          {candidate.rating && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
              <span className="font-bold">{candidate.rating}</span>
              {candidate.user_ratings_total && (
                <span className="text-gray-600 text-sm">({candidate.user_ratings_total})</span>
              )}
            </div>
          )}
          {candidate.price_level && (
            <span className="text-green-600 font-bold">{'$'.repeat(candidate.price_level)}</span>
          )}
          {candidate.cuisines && candidate.cuisines.length > 0 && (
            <span className="text-gray-600">{candidate.cuisines.join(', ')}</span>
          )}
        </div>
      </div>

      {/* Contact Info */}
      {(data.phone || data.website || candidate.url) && (
        <div className="space-y-2">
          {data.phone && (
            <a href={`tel:${data.phone}`} className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
              <Phone className="h-4 w-4" />
              <span>{data.phone}</span>
            </a>
          )}
          {(data.website || candidate.url) && (
            <a 
              href={data.website || candidate.url || '#'} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <Globe className="h-4 w-4" />
              <span>Visit Website</span>
            </a>
          )}
        </div>
      )}

      {/* Description */}
      {data.description && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">About</h3>
          <p className="text-gray-700 leading-relaxed">{data.description}</p>
        </div>
      )}

      {/* Hours */}
      {data.hours && data.hours.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Hours</h3>
          <div className="space-y-1 text-sm text-gray-700">
            {data.hours.map((hour, idx) => (
              <div key={idx}>{hour}</div>
            ))}
          </div>
        </div>
      )}

      {/* Amenities */}
      {data.amenities && data.amenities.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Amenities</h3>
          <div className="flex flex-wrap gap-2">
            {data.amenities.map((amenity, idx) => (
              <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                {amenity}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Google Maps Link */}
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(candidate.name)}&query_place_id=${candidate.place_id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full btn-gradient-lime flex items-center justify-center gap-2 text-lg py-3"
      >
        <MapPin className="h-5 w-5" />
        View on Google Maps
      </a>
    </>
  )
}

// Streaming Details Component
function StreamingDetails({ candidate, data }: { candidate: Tables<'candidates'>, data: EnhancedData }) {
  const formatRuntime = (minutes?: number) => {
    if (!minutes) return null
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}m`
    return `${hours}h ${mins}m`
  }

  return (
    <>
      {/* Title & Quick Info */}
      <div>
        <h2 className="text-2xl font-outfit font-bold text-gray-900 mb-2">
          {candidate.title || candidate.name}
        </h2>
        <div className="flex items-center gap-3 flex-wrap text-sm text-gray-600">
          {candidate.year && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{candidate.year}</span>
            </div>
          )}
          {candidate.runtime_minutes && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{formatRuntime(candidate.runtime_minutes)}</span>
            </div>
          )}
          {candidate.us_rating && (
            <span className="bg-gray-200 px-2 py-1 rounded text-xs font-bold">
              {candidate.us_rating}
            </span>
          )}
          {candidate.user_rating && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
              <span className="font-bold">{Number(candidate.user_rating).toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Genres */}
      {candidate.genre_names && candidate.genre_names.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {candidate.genre_names.map((genre: string) => (
            <span key={genre} className="px-3 py-1 bg-gradient-electric text-white rounded-full text-sm font-semibold">
              {genre}
            </span>
          ))}
        </div>
      )}

      {/* Plot */}
      {(candidate.plot_overview || candidate.description) && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Plot</h3>
          <p className="text-gray-700 leading-relaxed">
            {candidate.plot_overview || candidate.description}
          </p>
        </div>
      )}

      {/* External Link */}
      {candidate.url && (
        <a
          href={candidate.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full btn-gradient flex items-center justify-center gap-2 text-lg py-3"
        >
          <ExternalLink className="h-5 w-5" />
          View Details
        </a>
      )}
    </>
  )
}

// BYO Details Component
function BYODetails({ candidate, data }: { candidate: Tables<'candidates'>, data: EnhancedData }) {
  return (
    <>
      {/* Title */}
      <div>
        <h2 className="text-2xl font-outfit font-bold text-gray-900 mb-2">{candidate.name}</h2>
      </div>

      {/* AI-Enhanced Description */}
      {data.description && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">About</h3>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">{data.description}</p>
        </div>
      )}

      {/* User-provided description */}
      {!data.description && candidate.description && (
        <div>
          <p className="text-gray-700 leading-relaxed">{candidate.description}</p>
        </div>
      )}

      {/* Website */}
      {(data.website || candidate.url) && (
        <a
          href={data.website || candidate.url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full btn-gradient flex items-center justify-center gap-2 text-lg py-3"
        >
          <Globe className="h-5 w-5" />
          Learn More
        </a>
      )}

      {/* Citations (for AI-enhanced content) */}
      {data.citations && data.citations.length > 0 && (
        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Sources</h3>
          <div className="space-y-1">
            {data.citations.map((citation, idx) => (
              <a
                key={idx}
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-blue-600 hover:text-blue-700 hover:underline truncate"
              >
                {citation.title || citation.url}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* No AI Enhancement Available */}
      {!data.loading && !data.description && !candidate.description && (
        <div className="text-center py-8 text-gray-500">
          <p>No additional information available</p>
          <p className="text-sm mt-2">AI enhancement is disabled for this session</p>
        </div>
      )}
    </>
  )
}

