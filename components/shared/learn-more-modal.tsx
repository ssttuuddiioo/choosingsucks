'use client'

import { useState, useEffect } from 'react'
import { X, MapPin, Phone, Globe, Star, Clock, Calendar, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Tables } from '@/types/supabase'
import { cn } from '@/lib/utils/cn'
import { env } from '@/lib/utils/env'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

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
  modules?: any[] // For BYO structured modules
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
        // Determine actual category from candidate data (more reliable than prop)
        const actualCategory = candidate.category || category
        const contentType = candidate.content_type
        
        console.log('[Learn More] Category:', category, 'Actual:', actualCategory, 'Content Type:', contentType)
        
        if (actualCategory === 'restaurants' || contentType === 'restaurant') {
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
        } else if (actualCategory === 'streaming' || contentType?.includes('movie') || contentType?.includes('tv_')) {
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
        } else if (actualCategory === 'build-your-own' || contentType === 'custom_option') {
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

  // Determine category from candidate data
  const actualCategory = candidate.category || category
  const isRestaurant = actualCategory === 'restaurants' || candidate.content_type === 'restaurant'
  const isStreaming = actualCategory === 'streaming' || candidate.content_type?.includes('movie') || candidate.content_type?.includes('tv_')
  const isBYO = actualCategory === 'build-your-own' || candidate.content_type === 'custom_option'

  // Get all photos for carousel
  const rawPhotos = enhancedData.photos || (candidate.photo_ref ? [candidate.photo_ref] : [])
  const photos = isRestaurant 
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
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="h-[95vh] max-w-2xl mx-auto">
        {/* Header */}
        <DrawerHeader className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 bg-white sticky top-0 z-10">
          <DrawerTitle className="text-xl font-outfit font-bold text-gray-900">
            {candidate.name || candidate.title}
          </DrawerTitle>
          <DrawerClose asChild>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </DrawerClose>
        </DrawerHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Photo Carousel */}
          {hasPhotos && (
            <div className="relative bg-gray-900 aspect-[4/3] sm:aspect-video">
              {isStreaming && posterUrl ? (
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
          <div className="p-6 space-y-6 pb-12">
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
            {!enhancedData.loading && isRestaurant && (
              <RestaurantDetails candidate={candidate} data={enhancedData} />
            )}

            {/* Streaming Content */}
            {!enhancedData.loading && isStreaming && (
              <StreamingDetails candidate={candidate} data={enhancedData} />
            )}

            {/* BYO Content */}
            {!enhancedData.loading && isBYO && (
              <BYODetails candidate={candidate} data={enhancedData} />
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
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

// BYO Details Component with Module Rendering
function BYODetails({ candidate, data }: { candidate: Tables<'candidates'>, data: EnhancedData }) {
  const modules = data.modules || []

  return (
    <>
      {/* Title */}
      <div>
        <h2 className="text-2xl font-outfit font-bold text-gray-900 mb-2">{candidate.name}</h2>
      </div>

      {/* Render Modules Dynamically */}
      {modules.length > 0 && (
        <div className="space-y-6">
          {modules.map((module: any, idx: number) => (
            <ModuleRenderer key={idx} module={module} candidateName={candidate.name} />
          ))}
        </div>
      )}

      {/* Fallback: User-provided description if no modules */}
      {modules.length === 0 && candidate.description && (
        <div>
          <p className="text-gray-700 leading-relaxed">{candidate.description}</p>
        </div>
      )}

      {/* Citations */}
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
      {!data.loading && modules.length === 0 && !candidate.description && (
        <div className="text-center py-8 text-gray-500">
          <p>No additional information available</p>
          <p className="text-sm mt-2">Enable AI enhancement when creating the session</p>
        </div>
      )}
    </>
  )
}

// Universal Module Renderer
function ModuleRenderer({ module, candidateName }: { module: any; candidateName: string }) {
  const { type } = module

  // title_and_paragraph
  if (type === 'title_and_paragraph') {
    return (
      <div>
        {module.title && <h3 className="font-semibold text-gray-900 mb-2">{module.title}</h3>}
        <p className="text-gray-700 leading-relaxed">{module.content}</p>
      </div>
    )
  }

  // title_and_list
  if (type === 'title_and_list') {
    return (
      <div>
        {module.title && <h3 className="font-semibold text-gray-900 mb-2">{module.title}</h3>}
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          {module.items?.map((item: string, idx: number) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </div>
    )
  }

  // key_value_pairs
  if (type === 'key_value_pairs' && module.pairs) {
    // Handle both array and object formats for backward compatibility
    const pairs = Array.isArray(module.pairs) 
      ? module.pairs 
      : Object.entries(module.pairs).map(([key, value]) => ({ key, value }))
    
    return (
      <div className="grid grid-cols-2 gap-3">
        {pairs.map((pair: any, idx: number) => (
          <div key={idx}>
            <div className="text-xs text-gray-600 uppercase tracking-wide">{pair.key}</div>
            <div className="text-sm font-semibold text-gray-900">{pair.value}</div>
          </div>
        ))}
      </div>
    )
  }

  // quote
  if (type === 'quote') {
    return (
      <div className="border-l-4 border-electric-purple pl-4 py-2 bg-gray-50 rounded-r">
        <p className="text-gray-700 italic">"{module.text}"</p>
        {module.source && <p className="text-xs text-gray-600 mt-1">— {module.source}</p>}
      </div>
    )
  }

  // stats
  if (type === 'stats') {
    // Handle both simple value and complex object
    const displayValue = typeof module.value === 'object' ? 
      (module.value?.value || JSON.stringify(module.value)) : 
      module.value
    const displayLabel = module.label || module.value?.label
    
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <div className="text-3xl font-bold text-gray-900">{displayValue}</div>
        {displayLabel && <div className="text-sm text-gray-600 mt-1">{displayLabel}</div>}
      </div>
    )
  }

  // tags
  if (type === 'tags' && module.items) {
    return (
      <div className="flex flex-wrap gap-2">
        {module.items.map((tag: string, idx: number) => (
          <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
            {tag}
          </span>
        ))}
      </div>
    )
  }

  // hero_image
  if (type === 'hero_image' && module.image_url) {
    return (
      <div className="rounded-lg overflow-hidden">
        <img src={module.image_url} alt={module.alt_text || candidateName} className="w-full h-48 object-cover" />
      </div>
    )
  }

  // image_gallery
  if (type === 'image_gallery' && module.images) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {module.images.slice(0, 4).map((img: any, idx: number) => (
          <img key={idx} src={img.url} alt={img.alt_text || ''} className="w-full h-32 object-cover rounded-lg" />
        ))}
      </div>
    )
  }

  // color_block
  if (type === 'color_block') {
    return (
      <div className="flex items-center gap-4">
        <div 
          className="w-24 h-24 rounded-lg shadow-md border border-gray-200"
          style={{ backgroundColor: module.hex }}
        />
        <div>
          <div className="font-semibold text-gray-900">{module.name}</div>
          <div className="text-sm text-gray-600 font-mono">{module.hex}</div>
        </div>
      </div>
    )
  }

  // location
  if (type === 'location') {
    return (
      <div>
        <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Location
        </h3>
        <p className="text-gray-700">
          {module.address && <span>{module.address}<br /></span>}
          {module.city && module.state && <span>{module.city}, {module.state} {module.zip}</span>}
        </p>
      </div>
    )
  }

  // pricing
  if (type === 'pricing') {
    return (
      <div>
        <h3 className="font-semibold text-gray-900 mb-2">Pricing</h3>
        <p className="text-gray-700">
          <span className="text-lg font-bold text-green-600">{module.range}</span>
          {module.note && <span className="text-sm text-gray-600 ml-2">{module.note}</span>}
        </p>
      </div>
    )
  }

  // hours
  if (type === 'hours') {
    return (
      <div>
        <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Hours
        </h3>
        <p className="text-gray-700">{module.schedule}</p>
      </div>
    )
  }

  // reviews
  if (type === 'reviews') {
    return (
      <div>
        <h3 className="font-semibold text-gray-900 mb-2">Reviews</h3>
        {module.rating && (
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-5 w-5 text-yellow-500 fill-current" />
            <span className="font-bold">{module.rating}</span>
            {module.count && <span className="text-gray-600 text-sm">({module.count} reviews)</span>}
          </div>
        )}
        {module.summary && <p className="text-gray-700 text-sm">{module.summary}</p>}
      </div>
    )
  }

  // rating
  if (type === 'rating') {
    return (
      <div className="flex items-center gap-2">
        <Star className="h-5 w-5 text-yellow-500 fill-current" />
        <span className="font-bold text-lg">{module.score}</span>
        {module.max_score && <span className="text-gray-600">/ {module.max_score}</span>}
        {module.label && <span className="text-gray-600 text-sm ml-2">{module.label}</span>}
      </div>
    )
  }

  // warning
  if (type === 'warning') {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r">
        <p className="text-sm text-yellow-800">{module.message}</p>
      </div>
    )
  }

  // table
  if (type === 'table' && module.headers && module.rows) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              {module.headers.map((header: string, idx: number) => (
                <th key={idx} className="text-left py-2 px-3 font-semibold text-gray-900">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {module.rows.map((row: string[], rowIdx: number) => (
              <tr key={rowIdx} className="border-b border-gray-100">
                {row.map((cell: string, cellIdx: number) => (
                  <td key={cellIdx} className="py-2 px-3 text-gray-700">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Unknown module type - try to render something useful
  console.warn('Unknown module type:', type, module)
  
  // Try to extract any displayable content
  if (module.content) {
    return (
      <div>
        {module.title && <h3 className="font-semibold text-gray-900 mb-2">{module.title}</h3>}
        <p className="text-gray-700">{typeof module.content === 'string' ? module.content : JSON.stringify(module.content)}</p>
      </div>
    )
  }
  
  // Last resort - show module type
  return (
    <div className="text-xs text-gray-400 italic">
      Unsupported module: {type}
    </div>
  )
}


