'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Wrapper } from '@googlemaps/react-wrapper'
import { env } from '@/lib/utils/env'

interface MapInterfaceProps {
  center: { lat: number; lng: number }
  radius: number // in miles
  onCenterChange: (center: { lat: number; lng: number }) => void
  onRadiusChange: (radius: number) => void
  className?: string
}

interface GoogleMapProps {
  center: { lat: number; lng: number }
  radius: number
  onCenterChange: (center: { lat: number; lng: number }) => void
  style: React.CSSProperties
}

function GoogleMapComponent({ center, radius, onCenterChange, style }: GoogleMapProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map>()
  const [marker, setMarker] = useState<google.maps.Marker>()
  const [circle, setCircle] = useState<google.maps.Circle>()

  // Initialize map
  useEffect(() => {
    if (ref.current && !map) {
      const newMap = new google.maps.Map(ref.current, {
        center,
        zoom: 12,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      })
      setMap(newMap)
    }
  }, [ref, map, center])

  // Update map center when prop changes
  useEffect(() => {
    if (map) {
      map.setCenter(center)
    }
  }, [map, center])

  // Create marker
  useEffect(() => {
    if (map && !marker) {
      const newMarker = new google.maps.Marker({
        position: center,
        map,
        draggable: true,
        title: 'Search Center',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#EC4899',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        }
      })

      newMarker.addListener('dragend', () => {
        const position = newMarker.getPosition()
        if (position) {
          onCenterChange({
            lat: position.lat(),
            lng: position.lng()
          })
        }
      })

      setMarker(newMarker)
    }
  }, [map, marker, center, onCenterChange])

  // Update marker position
  useEffect(() => {
    if (marker) {
      marker.setPosition(center)
    }
  }, [marker, center])

  // Create/update circle
  useEffect(() => {
    if (map) {
      if (circle) {
        circle.setMap(null)
      }

      const newCircle = new google.maps.Circle({
        center,
        radius: radius * 1609.34, // miles to meters
        map,
        fillColor: '#EC4899',
        fillOpacity: 0.15,
        strokeColor: '#EC4899',
        strokeWeight: 2,
        strokeOpacity: 0.8,
      })

      setCircle(newCircle)
    }
  }, [map, center, radius, circle])

  return <div ref={ref} style={style} />
}

export default function MapInterface({ 
  center, 
  radius, 
  onCenterChange, 
  onRadiusChange, 
  className = '' 
}: MapInterfaceProps) {
  const render = useCallback((status: any) => {
    if (status === 'LOADING') {
      return (
        <div className="flex items-center justify-center h-full bg-gradient-to-br from-electric-purple/20 to-hot-pink/20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white/70">Loading map...</p>
          </div>
        </div>
      )
    }

    if (status === 'FAILURE') {
      return (
        <div className="flex items-center justify-center h-full bg-gradient-to-br from-red-500/20 to-red-700/20">
          <div className="text-center">
            <p className="text-white/70 mb-4">Failed to load map</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )
    }

    return (
      <GoogleMapComponent
        center={center}
        radius={radius}
        onCenterChange={onCenterChange}
        style={{ width: '100%', height: '100%' }}
      />
    )
  }, [center, radius, onCenterChange])

  if (!env.google.mapsApiKey) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-red-500/20 to-red-700/20">
        <div className="text-center">
          <p className="text-white/70">Google Maps API key not configured</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <Wrapper apiKey={env.google.mapsApiKey} render={render} />
      
      {/* Radius Control Overlay */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <div className="bg-black/80 backdrop-blur-sm rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/70 text-sm font-medium">Search Radius</span>
            <span className="text-white font-bold">{radius} {radius === 1 ? 'mile' : 'miles'}</span>
          </div>
          <div className="relative">
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={radius}
              onChange={(e) => onRadiusChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-white/50 mt-1">
              <span>1mi</span>
              <span>5mi</span>
              <span>10mi</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #EC4899;
          cursor: pointer;
          border: 2px solid #FFFFFF;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #EC4899;
          cursor: pointer;
          border: 2px solid #FFFFFF;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  )
}
