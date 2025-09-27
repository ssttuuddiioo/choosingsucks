'use client'

import { useState, useRef, useEffect } from 'react'
import { MapPin, Search } from 'lucide-react'
import { env } from '@/lib/utils/env'

interface LocationSearchProps {
  onLocationSelect: (location: { lat: number; lng: number; name: string }) => void
  onRetryLocation: () => void
  className?: string
}

export default function LocationSearch({ 
  onLocationSelect, 
  onRetryLocation, 
  className = '' 
}: LocationSearchProps) {
  const [inputValue, setInputValue] = useState('')
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesService = useRef<google.maps.places.PlacesService | null>(null)

  // Initialize Google Places services
  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places) {
      console.debug('[LocationSearch] Initializing Places services')
      autocompleteService.current = new google.maps.places.AutocompleteService()
      
      // Create a dummy div for PlacesService (required by Google Maps API)
      const dummyDiv = document.createElement('div')
      placesService.current = new google.maps.places.PlacesService(dummyDiv)
    } else {
      console.warn('[LocationSearch] Google Maps Places not available on window at mount')
    }
  }, [])

  // Handle input changes and fetch predictions
  useEffect(() => {
    if (!inputValue.trim() || !autocompleteService.current) {
      setPredictions([])
      return
    }

    const timer = setTimeout(() => {
      console.debug('[LocationSearch] Fetching place predictions for input', inputValue)
      autocompleteService.current?.getPlacePredictions(
        {
          input: inputValue,
          types: ['(cities)'],
          componentRestrictions: { country: 'us' }
        },
        (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            console.debug('[LocationSearch] Predictions OK', { count: results.length })
            setPredictions(results.slice(0, 5)) // Limit to 5 results
          } else {
            console.warn('[LocationSearch] Predictions returned no results', { status })
            setPredictions([])
          }
        }
      )
    }, 300) // Debounce

    return () => clearTimeout(timer)
  }, [inputValue])

  const handlePlaceSelect = async (placeId: string, description: string) => {
    if (!placesService.current) return

    setIsLoading(true)
    console.debug('[LocationSearch] getDetails for place', { placeId, description })
    
    placesService.current.getDetails(
      { placeId, fields: ['geometry', 'formatted_address'] },
      (place, status) => {
        setIsLoading(false)
        
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          console.debug('[LocationSearch] getDetails OK', {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          })
          onLocationSelect({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            name: place.formatted_address || description
          })
          setInputValue('')
          setPredictions([])
        } else {
          console.error('[LocationSearch] getDetails failed', { status, hasPlace: Boolean(place) })
        }
      }
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-gradient-electric rounded-full flex items-center justify-center mx-auto">
          <MapPin className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-outfit font-bold text-white">Location Needed</h2>
        <p className="text-white/70">
          We need your location to find restaurants near you
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search for a location..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-electric-purple/50 focus:border-transparent"
          />
        </div>

        {/* Predictions Dropdown */}
        {predictions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-black/90 backdrop-blur-sm border border-white/20 rounded-xl overflow-hidden z-50">
            {predictions.map((prediction) => (
              <button
                key={prediction.place_id}
                onClick={() => handlePlaceSelect(prediction.place_id, prediction.description)}
                disabled={isLoading}
                className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors disabled:opacity-50 flex items-center gap-3"
              >
                <MapPin className="h-4 w-4 text-white/50 flex-shrink-0" />
                <div>
                  <div className="font-medium">{prediction.structured_formatting.main_text}</div>
                  <div className="text-sm text-white/50">{prediction.structured_formatting.secondary_text}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Retry Location Button */}
      <button
        onClick={onRetryLocation}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-electric text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
      >
        <MapPin className="h-5 w-5" />
        Enable Location Access
      </button>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto"></div>
          <p className="text-white/70 text-sm mt-2">Getting location details...</p>
        </div>
      )}
    </div>
  )
}

// Load Google Maps Places API if not already loaded
export function loadGoogleMapsPlaces(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps && window.google.maps.places) {
      console.debug('[LocationSearch] Places already loaded')
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${env.google.mapsApiKey}&libraries=places`
    script.async = true
    script.defer = true
    
    script.onload = () => {
      console.debug('[LocationSearch] Places script loaded')
      resolve()
    }
    script.onerror = () => {
      console.error('[LocationSearch] Failed to load Google Maps Places API')
      reject(new Error('Failed to load Google Maps Places API'))
    }
    
    document.head.appendChild(script)
  })
}
