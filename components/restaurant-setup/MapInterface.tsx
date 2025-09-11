'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Wrapper } from '@googlemaps/react-wrapper'
import { env } from '@/lib/utils/env'
import { Slider } from '@/components/ui/slider'

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
  const [isMobile, setIsMobile] = useState(false)

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Initialize map
  useEffect(() => {
    if (ref.current && !map) {
      const newMap = new google.maps.Map(ref.current, {
        center,
        zoom: 13,
        disableDefaultUI: true,
        zoomControl: !isMobile, // Hide zoom controls on mobile
        gestureHandling: 'greedy',
        draggable: true,
        scrollwheel: true,
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
  }, [ref, map, center, isMobile])

  // Update map center when prop changes
  useEffect(() => {
    if (map) {
      map.setCenter(center)
    }
  }, [map, center])

  // Listen to map center changes and update circle position
  useEffect(() => {
    if (map) {
      const listener = map.addListener('center_changed', () => {
        const newCenter = map.getCenter()
        if (newCenter && circle) {
          const newCenterObj = {
            lat: newCenter.lat(),
            lng: newCenter.lng()
          }
          circle.setCenter(newCenterObj)
          // Update parent component with new center
          onCenterChange(newCenterObj)
        }
      })

      return () => {
        google.maps.event.removeListener(listener)
      }
    }
  }, [map, circle, onCenterChange])

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

  // Update marker position to always be at map center
  useEffect(() => {
    if (map && marker) {
      const listener = map.addListener('center_changed', () => {
        const newCenter = map.getCenter()
        if (newCenter) {
          marker.setPosition(newCenter)
        }
      })

      return () => {
        google.maps.event.removeListener(listener)
      }
    }
  }, [map, marker])

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
        fillOpacity: 0.2,
        strokeColor: '#EC4899',
        strokeWeight: 3,
        strokeOpacity: 1,
        clickable: false,
        editable: false,
      })

      setCircle(newCircle)
    }
  }, [map, center, radius])

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
      
      {/* Desktop Radius Control */}
      <div className="absolute bottom-4 left-4 right-4 z-10 hidden md:block">
        <div className="bg-black/80 backdrop-blur-sm rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-bold">{radius} {radius === 1 ? 'mile' : 'miles'}</span>
          </div>
          <Slider
            value={[radius]}
            onValueChange={(value) => onRadiusChange(value[0])}
            max={10}
            min={1}
            step={0.5}
            className="w-full"
          />
        </div>
      </div>

      {/* Mobile Radius Display */}
      <div className="absolute top-4 left-4 z-20 md:hidden">
        <div className="bg-black/80 backdrop-blur-sm rounded-xl px-3 py-2">
          <span className="text-white font-bold text-sm">{radius} {radius === 1 ? 'mile' : 'miles'}</span>
        </div>
      </div>
    </div>
  )
}
