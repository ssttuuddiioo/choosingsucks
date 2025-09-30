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
      console.log('[MapInterface] Initializing Google Map', { center })
      const newMap = new google.maps.Map(ref.current, {
        center,
        zoom: 13,
        disableDefaultUI: true,
        zoomControl: !isMobile, // Show zoom controls only on desktop
        gestureHandling: 'greedy',
        draggable: true,
        scrollwheel: true,
        isFractionalZoomEnabled: true, // Enable smooth fractional zoom
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      })
      setMap(newMap)
      // Attach helpful lifecycle logs
      newMap.addListener('tilesloaded', () => {
        console.log('[MapInterface] tilesloaded')
      })
      newMap.addListener('idle', () => {
        const c = newMap.getCenter()
        console.log('[MapInterface] idle', {
          zoom: newMap.getZoom(),
          center: c ? { lat: c.lat(), lng: c.lng() } : null,
        })
      })
      try {
        onMapReady(newMap)
      } catch (err) {
        console.error('[MapInterface] onMapReady handler threw', err)
      }
    }
  }, [ref, map, center, onMapReady])

  // Update map center when prop changes (only for initial load)
  useEffect(() => {
    if (map) {
      console.log('[MapInterface] Updating map center', { center })
      map.setCenter(center)
    }
  }, [map, center])

  return <div ref={ref} style={style} />
}

// Function to calculate radius from zoom level (supports fractional zoom)
function zoomToRadius(zoom: number): number {
  // Smooth calculation for fractional zoom levels
  // Zoom 10 = ~10 miles, Zoom 13 = ~2.5 miles, Zoom 16 = ~0.5 miles
  // Formula: radius = 20 / 2^(zoom - 10), clamped between 0.5 and 10 miles
  const radius = 20 / Math.pow(2, zoom - 10)
  return Math.max(0.5, Math.min(10, Math.round(radius * 10) / 10)) // Round to 1 decimal
}

const MapInterface = forwardRef<MapInterfaceRef, MapInterfaceProps>(({ 
  center, 
  className = '' 
}, ref) => {
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Log environment/API availability on mount
  useEffect(() => {
    const hasGoogle = typeof window !== 'undefined' && (window as any).google && (window as any).google.maps
    console.log('[MapInterface] Mounted', {
      hasGoogleMapsOnWindow: Boolean(hasGoogle),
      hasApiKey: Boolean(env.google.mapsApiKey),
    })
  }, [])

  // Log container size to detect zero-height issues
  useEffect(() => {
    if (!containerRef.current) return
    const logSize = () => {
      const rect = containerRef.current!.getBoundingClientRect()
      console.log('[MapInterface] Container size', { width: rect.width, height: rect.height })
      if (rect.height === 0) {
        console.warn('[MapInterface] Container height is 0 - map cannot render')
      }
    }
    logSize()
    window.addEventListener('resize', logSize)
    return () => window.removeEventListener('resize', logSize)
  }, [])

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
  const handleMapReady = useCallback((map: google.maps.Map) => {
    const centerNow = map.getCenter()
    console.log('[MapInterface] Map ready', {
      center: centerNow ? { lat: centerNow.lat(), lng: centerNow.lng() } : null,
      zoom: map.getZoom(),
    })
    setMapInstance(map)
  }, [])

  const render = useCallback((status: any) => {
    console.log('[MapInterface] Wrapper status', status)
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

    // Return empty div so the Wrapper renders its children when scripts are ready
    return <div></div>
  }, [])

  if (!env.google.mapsApiKey) {
    console.error('[MapInterface] Missing Google Maps API key')
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-red-500/20 to-red-700/20">
        <div className="text-center">
          <p className="text-white/70">Google Maps API key not configured</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="h-full w-full">
        <Wrapper apiKey={env.google.mapsApiKey} render={render}>
          <GoogleMapComponent
            center={center}
            style={{ width: '100%', height: '100%' }}
            onMapReady={handleMapReady}
          />
        </Wrapper>
      </div>
      
      {/* Fixed Circle Overlay - Always centered on screen */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div 
          className="border-2 border-pink-500 bg-pink-500/20 rounded-full"
          style={{
            width: 'min(70vw, 70vh, 350px)',
            height: 'min(70vw, 70vh, 350px)',
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
