'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Loader2, Utensils, ArrowLeft, Share2 } from 'lucide-react'
import { createBrowserClient } from '@/lib/utils/supabase-client'
import { generateShareToken } from '@/lib/utils/session'
import { analytics } from '@/lib/utils/analytics'
import { motion, AnimatePresence } from 'framer-motion'

// New components
import MapInterface, { MapInterfaceRef } from '@/components/restaurant-setup/MapInterface'
import LocationSearch, { loadGoogleMapsPlaces } from '@/components/restaurant-setup/LocationSearch'
import DetailsDrawer from '@/components/restaurant-setup/DetailsDrawer'
import { useLocationPermission, LocationState } from '@/components/restaurant-setup/LocationPermission'

export default function RestaurantSetupPage() {
  const router = useRouter()
  const mapRef = useRef<MapInterfaceRef>(null)
  
  // Location state
  const { state: locationState, location, requestLocation, setManualLocation } = useLocationPermission()
  const [mapCenter, setMapCenter] = useState({ lat: 47.6062, lng: -122.3321 }) // Default to Seattle
  
  // Session configuration
  const [selectedPriceLevels, setSelectedPriceLevels] = useState<number[]>([2, 3])
  const [keywords, setKeywords] = useState<string[]>([])
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
  const [hasShared, setHasShared] = useState(false)
  
  // Update map center when location is obtained
  useEffect(() => {
    if (location?.coordinates) {
      console.debug('[RestaurantsPage] Location ready, updating map center', location.coordinates)
      setMapCenter(location.coordinates)
    }
  }, [location])

  // Load Google Maps Places API for location search
  useEffect(() => {
    if (locationState === 'denied' || locationState === 'unavailable') {
      console.debug('[RestaurantsPage] Loading Places API due to state', locationState)
      loadGoogleMapsPlaces().catch((err) => {
        console.error('[RestaurantsPage] Failed to load Places API', err)
      })
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
    // Get current map state
    const mapState = mapRef.current?.getCurrentMapState()
    if (!mapState) {
      setError('Please wait for the map to load')
      console.warn('[RestaurantsPage] Map state not ready when creating session')
      return
    }

    setLoading(true)
    setError('')

    try {
      const supabase = createBrowserClient()
      
      // Create session with current map center and calculated radius
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          place_search_center: `POINT(${mapState.center.lng} ${mapState.center.lat})`,
          search_radius_miles: mapState.radius,
          require_names: requireNames,
          invite_count_hint: inviteCount ? parseInt(inviteCount) : 2,
          match_requirement: matchRequirement,
          allow_multiple_matches: multipleMatches,
        })
        .select()
        .single()

      if (sessionError) throw sessionError
      console.debug('[RestaurantsPage] Session created', { id: session.id })

      // Create host participant
      const { error: participantError } = await supabase
        .from('participants')
        .insert({
          session_id: session.id,
          is_host: true,
        })

      if (participantError) throw participantError
      console.debug('[RestaurantsPage] Host participant created')

      // Generate share token
      const shareToken = generateShareToken()
      const fullShareLink = `${window.location.origin}/session/${session.id}?t=${shareToken}`
      
      setSessionId(session.id)
      setShareLink(fullShareLink)
      setSessionCreated(true)

      // Track analytics
      analytics.sessionCreated(session.id, location?.name || 'Map Location')

      // Trigger places search with current map state
      const placesResponse = await fetch('/api/places-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          lat: mapState.center.lat,
          lng: mapState.center.lng,
          radius: mapState.radius,
          selectedPriceLevels,
          keywords,
        })
      })

      if (!placesResponse.ok) {
        console.error('[RestaurantsPage] Failed to fetch places', { status: placesResponse.status })
      } else {
        console.debug('[RestaurantsPage] Places search kicked off')
      }

    } catch (err) {
      console.error('[RestaurantsPage] Error creating session', err)
      setError('Failed to create session. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setLinkCopied(true)
      setHasShared(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my restaurant choosing session!',
          text: 'Help me decide where to eat - swipe through restaurants together!',
          url: shareLink,
        })
        // Mark as shared when share sheet is opened (even if user cancels)
        setHasShared(true)
      } catch (err) {
        // User cancelled or share failed
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err)
          // Fallback to copy
          handleCopyLink()
        }
      }
    } else {
      // Fallback to copy if Web Share API not available
      handleCopyLink()
    }
  }

  // Show success screen after session creation
  if (sessionCreated) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-8 max-w-md w-full text-center space-y-6"
        >
          <div className="space-y-2">
            <h1 className="text-3xl font-outfit font-bold text-white">Session Created!</h1>
            <p className="text-white/70 text-lg">
              {!hasShared ? "First, share this link with your group" : "Great! Now join the session"}
            </p>
          </div>

          {/* Share buttons - prominent when not shared yet */}
          <motion.div 
            className="flex gap-3"
            animate={{ 
              scale: hasShared ? 0.95 : 1,
              opacity: hasShared ? 0.7 : 1 
            }}
          >
            <button
              onClick={handleShare}
              className="flex-1 btn-gradient flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all"
            >
              <Share2 className="h-5 w-5" />
              Share
            </button>
            
            <button
              onClick={handleCopyLink}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all ${
                linkCopied
                  ? "bg-gradient-lime text-white shadow-lg"
                  : "btn-gradient"
              }`}
            >
              <Copy className="h-5 w-5" />
              {linkCopied ? "Copied!" : "Copy"}
            </button>
          </motion.div>

          {/* Join button - only enabled after sharing */}
          <motion.button
            onClick={() => router.push(`/session/${sessionId}`)}
            disabled={!hasShared}
            className={`w-full text-xl py-4 rounded-xl font-semibold transition-all ${
              hasShared 
                ? "btn-gradient-pink" 
                : "bg-white/10 text-white/40 cursor-not-allowed"
            }`}
            animate={{ 
              scale: hasShared ? 1.02 : 1,
            }}
            whileTap={hasShared ? { scale: 0.98 } : {}}
          >
            {hasShared ? "Join Session" : "Share link first to join"}
          </motion.button>
          
          {/* Helper text */}
          {!hasShared && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-white/50"
            >
              💡 You need at least 2 people to make a decision!
            </motion.p>
          )}
          
          <p className="text-xs text-white/30">choosing.sucks</p>
        </motion.div>
      </div>
    )
  }

  const isLocationReady = locationState === 'granted' || locationState === 'manual'
  const showLocationSearch = locationState === 'denied' || locationState === 'unavailable'

  return (
    <div className="min-h-screen flex flex-col bg-gradient-primary no-overscroll" style={{ minHeight: '100dvh' }}>
      {/* Header - Fixed */}
      <div className="flex justify-between items-center p-4 flex-shrink-0 bg-gradient-primary backdrop-blur border-b border-white/10 relative z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 
              className="text-lg sm:text-xl md:text-2xl font-outfit font-black leading-tight logo-chunky cursor-pointer hover:scale-105 transition-transform whitespace-nowrap"
              onClick={() => router.push('/')}
            >
              <span className="gradient-text">CHOOSING </span>
              <span className="text-white">RESTAURANTS </span>
              <span className="gradient-text">SUCKS</span>
            </h1>
            <p className="text-white/70 text-sm font-semibold">
              Set your preferences and we'll find the perfect match
            </p>
          </div>
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
            ref={mapRef}
            center={mapCenter}
            className="h-full w-full"
          />
        )}
                </div>

      {/* Bottom Actions - Fixed */}
      <div className="flex-shrink-0 p-4 bg-gradient-primary/95 backdrop-blur border-t border-white/10" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        <div className="flex gap-3 max-w-md mx-auto">
          <DetailsDrawer
            selectedPriceLevels={selectedPriceLevels}
            onPriceLevelsChange={setSelectedPriceLevels}
            keywords={keywords}
            onKeywordsChange={setKeywords}
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
            className="flex-1 btn-gradient-pink text-xl py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating...
              </span>
            ) : (
              'Start Swipe Session'
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