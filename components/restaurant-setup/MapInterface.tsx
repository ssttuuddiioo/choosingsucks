'use client'

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react'
import { Wrapper } from '@googlemaps/react-wrapper'
import { env } from '@/lib/utils/env'

interface MapInterfaceProps {
  center: { lat: number; lng: number }
  className?: string
}

export interface MapInterfaceRef {
  getCurrentMapState: () => {
    center: { lat: number; lng: number }
    zoom: number
    radius: number
  } | null
}

interface GoogleMapProps {
  center: { lat: number; lng: number }
  style: React.CSSProperties
  onMapReady: (map: google.maps.Map) => void
}

function GoogleMapComponent({ center, style, onMapReady }: GoogleMapProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map>()
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
        zoomControl: !isMobile, // Show zoom controls only on desktop
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
      onMapReady(newMap)
    }
  }, [ref, map, center, onMapReady])

  // Update map center when prop changes (only for initial load)
  useEffect(() => {
    if (map) {
      map.setCenter(center)
    }
  }, [map, center])

  return <div ref={ref} style={style} />
}

// Function to calculate radius from zoom level
function zoomToRadius(zoom: number): number {
  // Rough approximation: higher zoom = smaller radius
  // Zoom 13 = ~2.5 miles, Zoom 10 = ~10 miles, Zoom 16 = ~0.5 miles
  return Math.max(0.5, Math.min(10, 20 / Math.pow(2, zoom - 10)))
}

const MapInterface = forwardRef<MapInterfaceRef, MapInterfaceProps>(({ 
  center, 
  className = '' 
}, ref) => {
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null)

  useImperativeHandle(ref, () => ({
    getCurrentMapState: () => {
      if (!mapInstance) return null
      
      const currentCenter = mapInstance.getCenter()
      const currentZoom = mapInstance.getZoom()
      
      if (!currentCenter || currentZoom === undefined) return null
      
      return {
        center: {
          lat: currentCenter.lat(),
          lng: currentCenter.lng()
        },
        zoom: currentZoom,
        radius: zoomToRadius(currentZoom)
      }
    }
  }), [mapInstance])
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
        style={{ width: '100%', height: '100%' }}
        onMapReady={setMapInstance}
      />
    )
  }, [center])

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
      
      {/* Fixed Circle Overlay - Always centered on screen */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div 
          className="border-2 border-pink-500 bg-pink-500/20 rounded-full"
          style={{
            width: '200px',
            height: '200px',
          }}
        />
      </div>

      {/* Center Dot */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        <div className="w-2 h-2 bg-pink-500 rounded-full" />
      </div>
    </div>
  )
})

MapInterface.displayName = 'MapInterface'

export default MapInterface
