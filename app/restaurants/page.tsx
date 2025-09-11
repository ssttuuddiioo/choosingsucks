'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Loader2, Utensils } from 'lucide-react'
import { createBrowserClient } from '@/lib/utils/supabase-client'
import { generateShareToken } from '@/lib/utils/session'
import { analytics } from '@/lib/utils/analytics'
import { motion, AnimatePresence } from 'framer-motion'

// New components
import MapInterface from '@/components/restaurant-setup/MapInterface'
import LocationSearch, { loadGoogleMapsPlaces } from '@/components/restaurant-setup/LocationSearch'
import DetailsDrawer from '@/components/restaurant-setup/DetailsDrawer'
import { useLocationPermission, LocationState } from '@/components/restaurant-setup/LocationPermission'

export default function RestaurantSetupPage() {
  const router = useRouter()
  
  // Location state
  const { state: locationState, location, requestLocation, setManualLocation } = useLocationPermission()
  const [mapCenter, setMapCenter] = useState({ lat: 47.6062, lng: -122.3321 }) // Default to Seattle
  const [searchRadius, setSearchRadius] = useState(2.5)
  
  // Session configuration
  const [selectedPriceLevels, setSelectedPriceLevels] = useState<number[]>([2, 3])
  const [requireNames, setRequireNames] = useState(false)
  const [inviteCount, setInviteCount] = useState('2')
  const [customCount, setCustomCount] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [matchRequirement, setMatchRequirement] = useState<'all' | 'majority'>('all')
  const [multipleMatches, setMultipleMatches] = useState(false)
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionCreated, setSessionCreated] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [shareLink, setShareLink] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  
  // Update map center when location is obtained
  useEffect(() => {
    if (location?.coordinates) {
      setMapCenter(location.coordinates)
    }
  }, [location])

  // Load Google Maps Places API for location search
  useEffect(() => {
    if (locationState === 'denied' || locationState === 'unavailable') {
      loadGoogleMapsPlaces().catch(console.error)
    }
  }, [locationState])

  const handleLocationSelect = (locationData: { lat: number; lng: number; name: string }) => {
    setManualLocation({
      coordinates: { lat: locationData.lat, lng: locationData.lng },
      name: locationData.name
    })
    setMapCenter({ lat: locationData.lat, lng: locationData.lng })
  }

  const handleCreateSession = async () => {
    if (!location?.coordinates) {
      setError('Please set your location first')
      return
    }

    setLoading(true)
    setError('')

    try {
      const supabase = createBrowserClient()
      
      // Create session with coordinates directly
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          place_search_center: `POINT(${mapCenter.lng} ${mapCenter.lat})`,
          search_radius_miles: searchRadius,
          require_names: requireNames,
          invite_count_hint: inviteCount ? parseInt(inviteCount) : 2,
          match_requirement: matchRequirement,
          allow_multiple_matches: multipleMatches,
        })
        .select()
        .single()

      if (sessionError) throw sessionError

      // Create host participant
      const { error: participantError } = await supabase
        .from('participants')
        .insert({
          session_id: session.id,
          is_host: true,
        })

      if (participantError) throw participantError

      // Generate share token
      const shareToken = generateShareToken()
      const fullShareLink = `${window.location.origin}/session/${session.id}?t=${shareToken}`
      
      setSessionId(session.id)
      setShareLink(fullShareLink)
      setSessionCreated(true)

      // Track analytics
      analytics.sessionCreated(session.id, location.name)

      // Trigger places search
      const placesResponse = await fetch('/api/places-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          lat: mapCenter.lat,
          lng: mapCenter.lng,
          radius: searchRadius,
          selectedPriceLevels,
        })
      })

      if (!placesResponse.ok) {
        console.error('Failed to fetch places')
      }

    } catch (err) {
      console.error('Error creating session:', err)
      setError('Failed to create session. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Show success screen after session creation
  if (sessionCreated) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-card p-8 max-w-md w-full text-center space-y-6"
        >
          <div className="space-y-2">
            <h1 className="text-3xl font-outfit font-bold">Session Created!</h1>
            <p className="text-white/70">Share this link with your group</p>
          </div>

          <button
            onClick={handleCopyLink}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all ${
              linkCopied
                ? "bg-gradient-lime text-white shadow-lg"
                : "btn-gradient"
            }`}
          >
            <Copy className="h-5 w-5" />
            {linkCopied ? "Link Copied!" : "Copy Link"}
          </button>

          <button
            onClick={() => router.push(`/session/${sessionId}`)}
            className="btn-gradient-pink w-full text-xl py-4"
          >
            Join Session
          </button>
          
          <p className="text-xs text-white/30">choosing.sucks</p>
        </motion.div>
      </div>
    )
  }

  const isLocationReady = locationState === 'granted' || locationState === 'manual'
  const showLocationSearch = locationState === 'denied' || locationState === 'unavailable'

  return (
    <div className="h-screen flex flex-col bg-gradient-primary overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex justify-between items-center p-4 flex-shrink-0 bg-gradient-primary/95 backdrop-blur border-b border-white/10">
        <div>
          <h1 
            className="text-2xl font-outfit font-black leading-tight logo-chunky cursor-pointer hover:scale-105 transition-transform"
            onClick={() => router.push('/')}
          >
            <div className="gradient-text">CHOOSING SUCKS</div>
          </h1>
          <p className="text-white/70 text-sm font-semibold">
            Let's figure out where to eat
          </p>
        </div>
        <div className="p-2 rounded-xl">
          <Utensils className="h-6 w-6 text-white/70" />
        </div>
      </div>

      {/* Main Content - Takes remaining space */}
      <div className="flex-1 relative overflow-hidden">
        {locationState === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-electric-purple/20 to-hot-pink/20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white/70">Finding your location...</p>
            </div>
          </div>
        )}

        {showLocationSearch && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <LocationSearch
              onLocationSelect={handleLocationSelect}
              onRetryLocation={requestLocation}
              className="w-full max-w-md"
            />
          </div>
        )}

        {isLocationReady && (
          <MapInterface
            center={mapCenter}
            radius={searchRadius}
            onCenterChange={setMapCenter}
            onRadiusChange={setSearchRadius}
            className="h-full w-full"
          />
        )}
      </div>

      {/* Bottom Actions - Fixed */}
      <div className="flex-shrink-0 p-4 bg-gradient-primary/95 backdrop-blur border-t border-white/10">
        <div className="flex gap-3 max-w-md mx-auto">
          <DetailsDrawer
            selectedPriceLevels={selectedPriceLevels}
            onPriceLevelsChange={setSelectedPriceLevels}
            requireNames={requireNames}
            onRequireNamesChange={setRequireNames}
            matchRequirement={matchRequirement}
            onMatchRequirementChange={setMatchRequirement}
            multipleMatches={multipleMatches}
            onMultipleMatchesChange={setMultipleMatches}
            inviteCount={inviteCount}
            onInviteCountChange={setInviteCount}
            customCount={customCount}
            onCustomCountChange={setCustomCount}
            showCustomInput={showCustomInput}
            onShowCustomInputChange={setShowCustomInput}
          />
          
          <button
            onClick={handleCreateSession}
            disabled={loading || !isLocationReady}
            className="flex-1 btn-gradient text-xl py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating...
              </span>
            ) : (
              '🚀 Start Swiping'
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-20 left-4 right-4 bg-red-500/90 backdrop-blur text-white p-4 rounded-xl text-center z-50"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}