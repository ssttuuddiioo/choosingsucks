'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, User } from 'lucide-react'

import MapInterface, { type MapInterfaceRef, type MapState } from '@/components/restaurant-setup/MapInterface'
import { useLocationPermission } from '@/components/restaurant-setup/LocationPermission'
import SessionCreatedScreen from '@/components/shared/session-created-screen'
import GeolocateButton from '@/components/homepage/GeolocateButton'
import MoreBottomNav, { type MoreTab } from '@/components/more/MoreBottomNav'
import MapFilterBar from '@/components/more/MapFilterBar'
import FeaturedSection from '@/components/more/FeaturedSection'
import ChatDrawer from '@/components/more/ChatDrawer'
import PlaceholderTab from '@/components/more/PlaceholderTab'
import FilterModal from '@/components/homepage/FilterModal'
import type { FeaturedPlace } from '@/components/more/FeaturedCard'
import { createBrowserClient } from '@/lib/utils/supabase-client'
import { generateShareToken, getClientFingerprint } from '@/lib/utils/session'

const DEFAULT_CENTER = { lat: 40.7258, lng: -73.9981 } // NYC 10012 (SoHo/NoHo)

export default function MorePage() {
  const router = useRouter()
  const mapRef = useRef<MapInterfaceRef>(null)

  // Tab state
  const [activeTab, setActiveTab] = useState<MoreTab>('discover')
  const [chatOpen, setChatOpen] = useState(false)

  // Map + location
  const { state: locationState, location, requestLocation } = useLocationPermission({ autoRequest: false })
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER)

  // Filters
  const [starRating, setStarRating] = useState(0)
  const [selectedPriceLevels, setSelectedPriceLevels] = useState<number[]>([])
  const [keywords, setKeywords] = useState<string[]>([])
  const [filterModalOpen, setFilterModalOpen] = useState(false)

  // Places data
  const [nearbyPlaces, setNearbyPlaces] = useState<FeaturedPlace[]>([])
  const [placesLoading, setPlacesLoading] = useState(false)

  // Session creation
  const [sessionLoading, setSessionLoading] = useState(false)
  const [sessionCreated, setSessionCreated] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [shareLink, setShareLink] = useState('')

  // Debounce ref for map state changes
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastFetchRef = useRef<string>('')

  // Update map center when geolocation resolves
  useEffect(() => {
    if (location?.coordinates) {
      setMapCenter(location.coordinates)
    }
  }, [location])

  // Fetch nearby places
  const fetchPlaces = useCallback(
    async (state: MapState) => {
      // Deduplicate: skip if same center+radius+rating+keywords
      const key = `${state.center.lat.toFixed(4)},${state.center.lng.toFixed(4)},${state.radius},${starRating},${keywords.join(',')}`
      if (key === lastFetchRef.current) return
      lastFetchRef.current = key

      setPlacesLoading(true)
      try {
        const body: Record<string, unknown> = {
          lat: state.center.lat,
          lng: state.center.lng,
          radius: state.radius,
          selectedPriceLevels,
        }
        if (starRating > 0) {
          body.minRating = starRating
        }
        if (keywords.length > 0) {
          body.keywords = keywords
        }

        const res = await fetch('/api/discover-places', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        setNearbyPlaces(data.places || [])
      } catch {
        console.error('Failed to fetch nearby places')
      }
      setPlacesLoading(false)
    },
    [starRating, selectedPriceLevels, keywords]
  )

  // Debounced map state change handler
  const handleMapStateChange = useCallback(
    (state: MapState) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => fetchPlaces(state), 800)
    },
    [fetchPlaces]
  )

  // Re-fetch when filters change
  useEffect(() => {
    const state = mapRef.current?.getCurrentMapState()
    if (state) {
      lastFetchRef.current = '' // force re-fetch
      fetchPlaces(state)
    }
  }, [starRating, selectedPriceLevels, keywords, fetchPlaces])

  const filterCount = (selectedPriceLevels.length > 0 ? 1 : 0) + (starRating > 0 ? 1 : 0) + keywords.length

  // Create session from current map state + discovered places
  const handleHelpDecide = async () => {
    const mapState = mapRef.current?.getCurrentMapState()
    if (!mapState) return

    setSessionLoading(true)
    try {
      const supabase = createBrowserClient()

      // 1. Create session
      const { data: session, error: sessionError } = await (supabase as any)
        .from('sessions')
        .insert({
          place_search_center: `POINT(${mapState.center.lng} ${mapState.center.lat})`,
          search_radius_miles: mapState.radius,
          require_names: false,
          invite_count_hint: 2,
          match_requirement: 'all',
          allow_multiple_matches: true,
        })
        .select()
        .single()

      if (sessionError) throw sessionError

      // 2. Create host participant
      await (supabase as any).from('participants').insert({
        session_id: session.id,
        is_host: true,
        client_fingerprint: getClientFingerprint(),
      })

      // 3. Populate candidates
      if (nearbyPlaces.length > 0) {
        // Insert discovered places directly as candidates
        const candidateInserts = nearbyPlaces.map((place) => ({
          session_id: session.id,
          place_id: place.placeId,
          name: place.name,
          rating: place.rating,
          price_level: place.priceLevel,
          photo_ref: place.photoRef,
          lat: place.lat,
          lng: place.lng,
          content_type: 'restaurant',
        }))
        await (supabase as any).from('candidates').insert(candidateInserts)
      } else {
        // Fallback: trigger places search in background
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
      }

      // 4. Show share screen
      const shareToken = generateShareToken()
      const fullShareLink = `${window.location.origin}/session/${session.id}?t=${shareToken}`
      setSessionId(session.id)
      setShareLink(fullShareLink)
      setSessionCreated(true)
    } catch (err) {
      console.error('Error creating session:', err)
    } finally {
      setSessionLoading(false)
    }
  }

  if (sessionCreated) {
    return (
      <SessionCreatedScreen
        sessionId={sessionId}
        shareLink={shareLink}
        onJoinSession={() => router.push(`/session/${sessionId}`)}
        categoryName="restaurants"
      />
    )
  }

  return (
    <div
      className="flex flex-col bg-warm-cream text-warm-black"
      style={{ height: '100dvh' }}
    >
      {/* Header */}
      <header className="flex-shrink-0 px-5 pt-safe">
        <div className="pt-2 pb-1 flex items-center justify-between">
          <h1 className="font-outfit font-bold text-xl">
            <span className="text-coral">Choosing sucks,</span>{' '}
            <span className="text-warm-gray500">we know</span>
          </h1>
          <GeolocateButton
            onClick={requestLocation}
            loading={locationState === 'loading'}
          />
        </div>
      </header>

      {/* Content area */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'discover' && (
            <motion.div
              key="discover"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-3 pb-2"
            >
              {/* Map */}
              <section className="px-5 space-y-2">
                <p className="text-sm font-medium text-warm-gray500">
                  Where do you want to eat?
                </p>
                <div
                  className="rounded-2xl overflow-hidden border border-warm-gray200"
                  style={{ height: '32vh', minHeight: 160, maxHeight: 256 }}
                >
                  <MapInterface
                    ref={mapRef}
                    center={mapCenter}
                    className="h-full w-full"
                    theme="warm"
                    onMapStateChange={handleMapStateChange}
                    places={nearbyPlaces}
                  />
                </div>
                <MapFilterBar
                  starRating={starRating}
                  onStarRatingChange={setStarRating}
                  onReady={handleHelpDecide}
                  filterCount={filterCount}
                  onFilterClick={() => setFilterModalOpen(true)}
                  loading={sessionLoading}
                />
              </section>

              {/* Hot and new */}
              <FeaturedSection places={nearbyPlaces} loading={placesLoading} />

            </motion.div>
          )}

          {activeTab === 'reviews' && (
            <motion.div
              key="reviews"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex min-h-[60vh]"
            >
              <PlaceholderTab
                title="Reviews"
                description="Guest reviewers share their favorite spots"
                icon={<Star className="w-7 h-7 text-warm-gray300" />}
              />
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex min-h-[60vh]"
            >
              <PlaceholderTab
                title="Profile"
                description="Your preferences, history, and favorites"
                icon={<User className="w-7 h-7 text-warm-gray300" />}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Bottom nav */}
      <MoreBottomNav activeTab={activeTab} onTabChange={(tab) => {
        if (tab === 'chat') {
          setChatOpen(true)
        } else {
          setActiveTab(tab)
        }
      }} />

      {/* Chat drawer */}
      <ChatDrawer open={chatOpen} onOpenChange={setChatOpen} userLocation={mapCenter} />

      {/* Filter modal */}
      <FilterModal
        open={filterModalOpen}
        onOpenChange={setFilterModalOpen}
        keywords={keywords}
        onKeywordsChange={setKeywords}
        selectedPriceLevels={selectedPriceLevels}
        onPriceLevelsChange={setSelectedPriceLevels}
      />
    </div>
  )
}
