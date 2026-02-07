'use client'

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react'
import { Wrapper } from '@googlemaps/react-wrapper'
import { env } from '@/lib/utils/env'

interface MapInterfaceProps {
  center: { lat: number; lng: number }
  className?: string
  theme?: 'dark' | 'warm'
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
  mapStyles?: google.maps.MapTypeStyle[]
}

const WARM_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'geometry', stylers: [{ color: '#f5f5f0' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6B6B66' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FAFAF8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#EDEDEB' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9d6e0' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#e8e8e3' }] },
]

const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
]

function GoogleMapComponent({ center, style, onMapReady, mapStyles }: GoogleMapProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map>()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (ref.current && !map) {
      const newMap = new google.maps.Map(ref.current, {
        center,
        zoom: 13,
        disableDefaultUI: true,
        zoomControl: !isMobile,
        gestureHandling: 'greedy',
        draggable: true,
        scrollwheel: true,
        isFractionalZoomEnabled: true,
        styles: mapStyles || DARK_MAP_STYLES,
      })
      setMap(newMap)
      try { onMapReady(newMap) } catch (err) { console.error('[MapInterface] onMapReady error', err) }
    }
  }, [ref, map, center, onMapReady, mapStyles])

  useEffect(() => {
    if (map) map.setCenter(center)
  }, [map, center])

  return <div ref={ref} style={style} />
}

function zoomToRadius(zoom: number): number {
  const radius = 20 / Math.pow(2, zoom - 10)
  return Math.max(0.5, Math.min(10, Math.round(radius * 10) / 10))
}

const MapInterface = forwardRef<MapInterfaceRef, MapInterfaceProps>(({
  center,
  className = '',
  theme = 'dark',
}, ref) => {
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const isWarm = theme === 'warm'
  const accentColor = isWarm ? '#E07A5F' : '#EC4899'

  useImperativeHandle(ref, () => ({
    getCurrentMapState: () => {
      if (!mapInstance) return null
      const currentCenter = mapInstance.getCenter()
      const currentZoom = mapInstance.getZoom()
      if (!currentCenter || currentZoom === undefined) return null
      return {
        center: { lat: currentCenter.lat(), lng: currentCenter.lng() },
        zoom: currentZoom,
        radius: zoomToRadius(currentZoom),
      }
    }
  }), [mapInstance])

  const handleMapReady = useCallback((map: google.maps.Map) => {
    setMapInstance(map)
  }, [])

  const render = useCallback((status: any) => {
    if (status === 'LOADING') {
      return (
        <div className={`flex items-center justify-center h-full ${isWarm ? 'bg-warm-bg' : 'bg-gradient-to-br from-electric-purple/20 to-hot-pink/20'}`}>
          <div className="text-center">
            <div className={`animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-3 ${isWarm ? 'border-coral' : 'border-white'}`} />
            <p className={isWarm ? 'text-warm-gray500 text-sm' : 'text-white/70'}>Loading map...</p>
          </div>
        </div>
      )
    }
    if (status === 'FAILURE') {
      return (
        <div className={`flex items-center justify-center h-full ${isWarm ? 'bg-warm-bg' : 'bg-gradient-to-br from-red-500/20 to-red-700/20'}`}>
          <div className="text-center">
            <p className={`mb-4 ${isWarm ? 'text-warm-gray500' : 'text-white/70'}`}>Failed to load map</p>
            <button
              onClick={() => window.location.reload()}
              className={`px-4 py-2 rounded-lg transition-colors ${isWarm ? 'bg-warm-gray100 text-warm-gray700 hover:bg-warm-gray200' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              Retry
            </button>
          </div>
        </div>
      )
    }
    return <div></div>
  }, [isWarm])

  if (!env.google.mapsApiKey) {
    return (
      <div className={`flex items-center justify-center h-full ${isWarm ? 'bg-warm-bg' : 'bg-gradient-to-br from-red-500/20 to-red-700/20'}`}>
        <p className={isWarm ? 'text-warm-gray500' : 'text-white/70'}>Google Maps API key not configured</p>
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
            mapStyles={isWarm ? WARM_MAP_STYLES : DARK_MAP_STYLES}
          />
        </Wrapper>
      </div>

      {/* Circle overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div
          className="rounded-full"
          style={{
            width: 'min(70vw, 70vh, 350px)',
            height: 'min(70vw, 70vh, 350px)',
            border: `2px solid ${accentColor}`,
            backgroundColor: `${accentColor}15`,
          }}
        />
      </div>

      {/* Center dot */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
      </div>
    </div>
  )
})

MapInterface.displayName = 'MapInterface'

export default MapInterface
