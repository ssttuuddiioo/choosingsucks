'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, User, Info } from 'lucide-react'

import MapInterface, { type MapInterfaceRef, type MapState } from '@/components/restaurant-setup/MapInterface'
import { useLocationPermission } from '@/components/restaurant-setup/LocationPermission'
import GeolocateButton from '@/components/homepage/GeolocateButton'
import MoreBottomNav, { type MoreTab } from '@/components/more/MoreBottomNav'
import ModeCategoryButtons from '@/components/more/ModeCategoryButtons'
import MapFilterBar from '@/components/more/MapFilterBar'
import FeaturedSection from '@/components/more/FeaturedSection'
import ChatDrawer from '@/components/more/ChatDrawer'
import PlaceholderTab from '@/components/more/PlaceholderTab'
import type { FeaturedPlace } from '@/components/more/FeaturedCard'

const DEFAULT_CENTER = { lat: 40.7128, lng: -74.006 } // NYC

export default function MorePage() {
  const router = useRouter()
  const mapRef = useRef<MapInterfaceRef>(null)

  // Tab state
  const [activeTab, setActiveTab] = useState<MoreTab>('discover')
  const [activeMode, setActiveMode] = useState('restaurant')
  const [chatOpen, setChatOpen] = useState(false)

  // Map + location
  const { state: locationState, location, requestLocation } = useLocationPermission({ autoRequest: false })
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER)

  // Filters
  const [starRating, setStarRating] = useState(0)
  const [selectedPriceLevels] = useState<number[]>([1, 2, 3])

  // Places data
  const [nearbyPlaces, setNearbyPlaces] = useState<FeaturedPlace[]>([])
  const [placesLoading, setPlacesLoading] = useState(false)

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
      // Deduplicate: skip if same center+radius+rating
      const key = `${state.center.lat.toFixed(4)},${state.center.lng.toFixed(4)},${state.radius},${starRating}`
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
    [starRating, selectedPriceLevels]
  )

  // Debounced map state change handler
  const handleMapStateChange = useCallback(
    (state: MapState) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => fetchPlaces(state), 800)
    },
    [fetchPlaces]
  )

  // Re-fetch when star rating changes
  useEffect(() => {
    const state = mapRef.current?.getCurrentMapState()
    if (state) {
      lastFetchRef.current = '' // force re-fetch
      fetchPlaces(state)
    }
  }, [starRating, fetchPlaces])

  const filterCount = (selectedPriceLevels.length < 4 ? 1 : 0) + (starRating > 0 ? 1 : 0)

  return (
    <div
      className="flex flex-col bg-warm-cream text-warm-black"
      style={{ height: '100dvh' }}
    >
      {/* Header */}
      <header className="flex-shrink-0 px-5 pt-safe">
        <div className="pt-4 pb-3 flex items-center justify-between">
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
              className="space-y-5 pb-4"
            >
              {/* What do you need to decide on? */}
              <section className="px-5">
                <p className="text-sm font-medium text-warm-gray500 mb-3">
                  What do you need to decide on?
                </p>
                <ModeCategoryButtons
                  activeMode={activeMode}
                  onModeChange={setActiveMode}
                />
              </section>

              {/* Where do you want to eat? + Map */}
              <section className="px-5 space-y-3">
                <p className="text-sm font-medium text-warm-gray500">
                  Where do you want to eat?
                </p>
                <div
                  className="rounded-2xl overflow-hidden border border-warm-gray200"
                  style={{ height: '40vh', minHeight: 200, maxHeight: 320 }}
                >
                  <MapInterface
                    ref={mapRef}
                    center={mapCenter}
                    className="h-full w-full"
                    theme="warm"
                    onMapStateChange={handleMapStateChange}
                  />
                </div>
                <MapFilterBar
                  starRating={starRating}
                  onStarRatingChange={setStarRating}
                  onReady={() => router.push('/')}
                  filterCount={filterCount}
                />
              </section>

              {/* Hot and new */}
              <FeaturedSection places={nearbyPlaces} loading={placesLoading} />

              {/* Let's talk about it */}
              <section className="px-5">
                <button
                  onClick={() => setChatOpen(true)}
                  className="w-full flex items-center justify-between px-4 py-3.5 bg-white rounded-xl border border-warm-gray200 hover:border-coral transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-coral" />
                    <span className="text-sm font-medium text-warm-gray700 group-hover:text-coral transition-colors">
                      Let&apos;s talk about it
                    </span>
                  </div>
                  <svg
                    className="w-4 h-4 text-warm-gray300 group-hover:text-coral transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </section>
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

          {activeTab === 'about' && (
            <motion.div
              key="about"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex min-h-[60vh]"
            >
              <PlaceholderTab
                title="About"
                description="The story behind choosing.sucks"
                icon={<Info className="w-7 h-7 text-warm-gray300" />}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom nav */}
      <MoreBottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Chat drawer */}
      <ChatDrawer open={chatOpen} onOpenChange={setChatOpen} userLocation={mapCenter} />
    </div>
  )
}
