'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Filter, Loader2, Truck } from 'lucide-react'

import MapInterface, { MapInterfaceRef } from '@/components/restaurant-setup/MapInterface'
import { useLocationPermission } from '@/components/restaurant-setup/LocationPermission'
import SessionCreatedScreen from '@/components/shared/session-created-screen'
import StarRating from '@/components/homepage/StarRating'
import FilterModal from '@/components/homepage/FilterModal'
import CategoryTabBar from '@/components/homepage/CategoryTabBar'
import ZipCodeInput from '@/components/homepage/ZipCodeInput'
import GeolocateButton from '@/components/homepage/GeolocateButton'

import ContentTypeSection from '@/components/streaming/content-type-section'
import StreamingServicesSection from '@/components/streaming/streaming-services-section'
import GenresSection from '@/components/streaming/genres-section'
import SortPreferenceSection from '@/components/streaming/sort-preference-section'

import { createBrowserClient } from '@/lib/utils/supabase-client'
import { generateShareToken, getClientFingerprint } from '@/lib/utils/session'
import { getRandomTagline } from '@/lib/utils/taglines'
import { cn } from '@/lib/utils/cn'
import {
  StreamingPreferences,
  SortPreference,
  DEFAULT_PREFERENCES,
} from '@/lib/constants/streaming'

const DEFAULT_CENTER = { lat: 40.7128, lng: -74.0060 } // NYC

export default function HomePage() {
  const router = useRouter()
  const mapRef = useRef<MapInterfaceRef>(null)

  // Tab
  const [activeTab, setActiveTab] = useState('restaurants')

  // Solo vs Friends
  const [sessionMode, setSessionMode] = useState<'solo' | 'friends'>('solo')

  // Location (no auto-request — map starts at NYC)
  const { state: locationState, location, requestLocation, setManualLocation } = useLocationPermission({ autoRequest: false })
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER)

  // Restaurant filters
  const [keywords, setKeywords] = useState<string[]>([])
  const [selectedPriceLevels, setSelectedPriceLevels] = useState<number[]>([2, 3])
  const [starRating, setStarRating] = useState(0)
  const [filterModalOpen, setFilterModalOpen] = useState(false)

  // Streaming preferences
  const [preferences, setPreferences] = useState<StreamingPreferences>(DEFAULT_PREFERENCES)

  // Session
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionCreated, setSessionCreated] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [shareLink, setShareLink] = useState('')

  // Tagline
  const [tagline, setTagline] = useState('')
  useEffect(() => { setTagline(getRandomTagline()) }, [])

  // Update map center when geolocation resolves
  useEffect(() => {
    if (location?.coordinates) {
      setMapCenter(location.coordinates)
    }
  }, [location])

  const handleZipCodeLocation = (loc: { lat: number; lng: number; name: string }) => {
    setMapCenter({ lat: loc.lat, lng: loc.lng })
    setManualLocation({ coordinates: { lat: loc.lat, lng: loc.lng }, name: loc.name })
  }

  // --- Restaurant session ---
  const handleCreateRestaurantSession = async () => {
    const mapState = mapRef.current?.getCurrentMapState()
    if (!mapState) {
      setError('Please wait for the map to load')
      return
    }

    setLoading(true)
    setError('')

    try {
      const supabase = createBrowserClient()
      const isSolo = sessionMode === 'solo'

      const { data: session, error: sessionError } = await (supabase as any)
        .from('sessions')
        .insert({
          place_search_center: `POINT(${mapState.center.lng} ${mapState.center.lat})`,
          search_radius_miles: mapState.radius,
          require_names: false,
          invite_count_hint: isSolo ? 1 : 2,
          match_requirement: 'all',
          allow_multiple_matches: !isSolo,
        })
        .select()
        .single()

      if (sessionError) throw sessionError

      await (supabase as any)
        .from('participants')
        .insert({
          session_id: session.id,
          is_host: true,
          client_fingerprint: getClientFingerprint(),
        })

      // Trigger places search in background
      fetch('/api/places-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          lat: mapState.center.lat,
          lng: mapState.center.lng,
          radius: mapState.radius,
          selectedPriceLevels,
          keywords,
          minRating: starRating > 0 ? starRating : undefined,
        }),
      })

      if (isSolo) {
        // Solo: go straight to swiping
        router.push(`/session/${session.id}`)
      } else {
        // Friends: show share screen
        const shareToken = generateShareToken()
        const fullShareLink = `${window.location.origin}/session/${session.id}?t=${shareToken}`
        setSessionId(session.id)
        setShareLink(fullShareLink)
        setSessionCreated(true)
      }
    } catch (err) {
      console.error('Error creating restaurant session', err)
      setError('Failed to create session. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // --- Streaming session ---
  const handleCreateStreamingSession = async () => {
    if (preferences.contentTypes.length === 0 || preferences.streamingServices.length === 0) {
      setError('Select at least one content type and streaming service')
      return
    }

    setLoading(true)
    setError('')

    try {
      const isSolo = sessionMode === 'solo'
      const newSessionId = crypto.randomUUID()

      fetch('/api/streaming-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: newSessionId, preferences }),
      })

      if (isSolo) {
        router.push(`/streaming/${newSessionId}`)
      } else {
        const shareToken = generateShareToken()
        const newShareLink = `${window.location.origin}/streaming/${newSessionId}?t=${shareToken}`
        setSessionId(newSessionId)
        setShareLink(newShareLink)
        setSessionCreated(true)
      }
    } catch (err) {
      console.error('Error creating streaming session', err)
      setError('Failed to create session. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleStartSession = () => {
    if (activeTab === 'restaurants') handleCreateRestaurantSession()
    else if (activeTab === 'streaming') handleCreateStreamingSession()
    else if (activeTab === 'build-your-own') router.push('/build-your-own')
  }

  const handleJoinSession = () => {
    router.push(activeTab === 'streaming' ? `/streaming/${sessionId}` : `/session/${sessionId}`)
  }

  // --- Session created (friends mode only) ---
  if (sessionCreated) {
    return (
      <SessionCreatedScreen
        sessionId={sessionId}
        shareLink={shareLink}
        onJoinSession={handleJoinSession}
        categoryName={activeTab}
      />
    )
  }

  const canStart =
    activeTab === 'restaurants' ||
    (activeTab === 'streaming' && preferences.contentTypes.length > 0 && preferences.streamingServices.length > 0) ||
    activeTab === 'build-your-own'

  const activeFilterCount = keywords.length + selectedPriceLevels.length + (starRating > 0 ? 1 : 0)

  return (
    <div className="h-screen flex flex-col bg-warm-cream text-warm-black" style={{ height: '100dvh' }}>
      {/* Header */}
      <header className="flex-shrink-0 px-4 pt-4 pb-2">
        <h1 className="text-2xl font-outfit font-black tracking-tight text-center">
          <span className="text-coral">CHOOSING</span>
          <span className="text-warm-gray300">.</span>
          <span className="text-coral">SUCKS</span>
        </h1>
        <p className="text-warm-gray500 text-xs text-center font-medium mt-0.5">
          {tagline}
        </p>
      </header>

      {/* Main content */}
      <main className="flex-1 relative overflow-hidden min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === 'restaurants' && (
            <motion.div
              key="restaurants"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0"
            >
              <MapInterface
                ref={mapRef}
                center={mapCenter}
                className="h-full w-full"
                theme="warm"
              />

              {/* Top bar: zip code + geolocate + toggle */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <ZipCodeInput onLocationFound={handleZipCodeLocation} />
                  <GeolocateButton
                    onClick={requestLocation}
                    loading={locationState === 'loading'}
                  />
                </div>
                {/* Solo / Friends toggle */}
                <div className="flex bg-white/90 backdrop-blur rounded-full shadow-md p-0.5">
                  <button
                    onClick={() => setSessionMode('solo')}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-semibold transition-all",
                      sessionMode === 'solo'
                        ? "bg-coral text-white"
                        : "text-warm-gray500 hover:text-warm-gray700"
                    )}
                  >
                    Just Me
                  </button>
                  <button
                    onClick={() => setSessionMode('friends')}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-semibold transition-all",
                      sessionMode === 'friends'
                        ? "bg-coral text-white"
                        : "text-warm-gray500 hover:text-warm-gray700"
                    )}
                  >
                    With Friends
                  </button>
                </div>
              </div>

              {/* Floating controls at bottom of map */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2">
                {/* Filter + Stars */}
                <div className="flex items-center gap-2 bg-white/90 backdrop-blur rounded-full shadow-md px-3 py-1.5">
                  <button
                    onClick={() => setFilterModalOpen(true)}
                    className="w-9 h-9 flex items-center justify-center text-warm-gray700 rounded-lg hover:bg-warm-gray100 transition-colors relative"
                  >
                    <Filter className="w-5 h-5" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-coral text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                  <StarRating value={starRating} onChange={setStarRating} size={24} />
                </div>
                {/* CTA */}
                <button
                  onClick={handleStartSession}
                  disabled={loading || !canStart}
                  className="btn-warm px-8 py-3 text-base shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Hold on...
                    </span>
                  ) : (
                    'Decide Already'
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'streaming' && (
            <motion.div
              key="streaming"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 overflow-y-auto px-4 py-4 space-y-4"
            >
              <SortPreferenceSection
                sortBy={preferences.sortBy}
                onSortChange={(sortBy: SortPreference) => setPreferences(prev => ({ ...prev, sortBy }))}
              />
              <ContentTypeSection
                contentTypes={preferences.contentTypes}
                onContentTypesChange={(contentTypes) => setPreferences(prev => ({ ...prev, contentTypes }))}
              />
              <StreamingServicesSection
                selectedServices={preferences.streamingServices}
                onServicesChange={(streamingServices) => setPreferences(prev => ({ ...prev, streamingServices }))}
              />
              <GenresSection
                selectedGenres={preferences.genres}
                onGenresChange={(genres) => setPreferences(prev => ({ ...prev, genres }))}
              />
            </motion.div>
          )}

          {activeTab === 'build-your-own' && (
            <motion.div
              key="byo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex items-center justify-center px-6"
            >
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-warm-gray100 rounded-2xl flex items-center justify-center mx-auto">
                  <span className="text-3xl">🛠</span>
                </div>
                <h2 className="text-lg font-bold text-warm-black">Build Your Own</h2>
                <p className="text-warm-gray500 text-sm">
                  Create a custom list of options and let your group decide.
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'delivery' && (
            <motion.div
              key="delivery"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex items-center justify-center px-6"
            >
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-warm-gray100 rounded-2xl flex items-center justify-center mx-auto">
                  <Truck className="w-8 h-8 text-warm-gray300" />
                </div>
                <h2 className="text-lg font-bold text-warm-black">Delivery</h2>
                <p className="text-warm-gray500 text-sm">
                  Coming soon! Swipe through delivery options together.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom controls — CTA for streaming/byo (restaurants controls are on the map) */}
      {activeTab !== 'restaurants' && (
      <div className="flex-shrink-0 bg-white border-t border-warm-gray100 px-4 py-2.5">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          {activeTab === 'streaming' && (
            <>
              {/* Solo/friends toggle for streaming */}
              <div className="flex bg-warm-gray100 rounded-full p-0.5">
                <button
                  onClick={() => setSessionMode('solo')}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                    sessionMode === 'solo' ? "bg-coral text-white" : "text-warm-gray500"
                  )}
                >
                  Just Me
                </button>
                <button
                  onClick={() => setSessionMode('friends')}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                    sessionMode === 'friends' ? "bg-coral text-white" : "text-warm-gray500"
                  )}
                >
                  With Friends
                </button>
              </div>
              <div className="flex-1" />
              <button
                onClick={handleStartSession}
                disabled={loading || !canStart}
                className="btn-warm text-sm py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Hold on...
                  </span>
                ) : (
                  'Decide Already'
                )}
              </button>
            </>
          )}

          {activeTab === 'build-your-own' && (
            <button
              onClick={handleStartSession}
              className="flex-1 btn-warm text-sm py-2.5"
            >
              Get Started
            </button>
          )}
        </div>
      </div>
      )}

      {/* Tab bar */}
      <CategoryTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Filter modal */}
      <FilterModal
        open={filterModalOpen}
        onOpenChange={setFilterModalOpen}
        keywords={keywords}
        onKeywordsChange={setKeywords}
        selectedPriceLevels={selectedPriceLevels}
        onPriceLevelsChange={setSelectedPriceLevels}
      />

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-36 left-4 right-4 bg-coral-dark text-white p-3 rounded-xl text-center text-sm z-50 cursor-pointer"
            onClick={() => setError('')}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
