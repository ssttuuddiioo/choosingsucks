'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Copy, Loader2, MapPin, ChevronDown, Utensils } from 'lucide-react'
import { createBrowserClient } from '@/lib/utils/supabase-client'
import { formatZipCode, isValidZipCode, generateShareToken } from '@/lib/utils/session'
import { analytics } from '@/lib/utils/analytics'
import { cn } from '@/lib/utils/cn'
import { useGeolocation } from '@/lib/hooks/use-geolocation'
import { motion, AnimatePresence } from 'framer-motion'

export default function HostSetupPage() {
  const router = useRouter()
  const [zipCode, setZipCode] = useState('')
  const [showCustomize, setShowCustomize] = useState(false)
  const [requireNames, setRequireNames] = useState(false)
  const [inviteCount, setInviteCount] = useState('2')
  const [customCount, setCustomCount] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifyPhone, setNotifyPhone] = useState('')
  const [matchRequirement, setMatchRequirement] = useState<'all' | 'majority'>('all')
  const [multipleMatches, setMultipleMatches] = useState(false)
  const [selectedPriceLevels, setSelectedPriceLevels] = useState<number[]>([2, 3]) // Default: $$ and $$$ selected
  const [loading, setLoading] = useState(false)

  const togglePriceLevel = (level: number) => {
    setSelectedPriceLevels(prev => 
      prev.includes(level) 
        ? prev.filter(l => l !== level)
        : [...prev, level].sort()
    )
  }
  const [error, setError] = useState('')
  const [sessionCreated, setSessionCreated] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [shareLink, setShareLink] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  
  const geolocation = useGeolocation()

  // Auto-detect location on component mount
  useEffect(() => {
    if (!zipCode) {
      geolocation.getCurrentLocation()
    }
  }, [])

  // Update ZIP code when geolocation succeeds
  useEffect(() => {
    if (geolocation.zipCode && !zipCode) {
      setZipCode(geolocation.zipCode)
    }
  }, [geolocation.zipCode, zipCode])

  const handleCreateSession = async () => {
    if (!isValidZipCode(zipCode)) {
      setError('Please enter a valid 5-digit ZIP code')
      return
    }

    setLoading(true)
    setError('')

    try {
      const supabase = createBrowserClient()
      
      // Get coordinates for ZIP code
      const geoResponse = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zipCode })
      })
      
      if (!geoResponse.ok) {
        throw new Error('Failed to get location data')
      }
      
      const { lat, lng } = await geoResponse.json()
      
      // Create session
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          zip_code: zipCode,
          place_search_center: `POINT(${lng} ${lat})`,
          require_names: requireNames,
          invite_count_hint: inviteCount ? parseInt(inviteCount) : null,
          host_notify_email: notifyEmail || null,
          host_notify_phone: notifyPhone || null,
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
      analytics.sessionCreated(session.id, zipCode)

      // Trigger places search
      const placesResponse = await fetch('/api/places-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          lat,
          lng,
          selectedPriceLevels, // Pass the selected price levels
        })
      })

      if (!placesResponse.ok) {
        console.error('Failed to fetch places')
      }

      // Don't auto-redirect - let host manually join after sharing

    } catch (err) {
      console.error('Error creating session:', err)
      setError('Failed to create session. Please try again.')
      setLoading(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setLinkCopied(true)
      // Reset after 2 seconds
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

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
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all",
              linkCopied
                ? "bg-gradient-lime text-white shadow-lg"
                : "btn-gradient"
            )}
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
          
          <p className="text-xs text-white/30">
            choosing.sucks
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-card p-8 max-w-md w-full space-y-8"
      >
        {/* Header */}
        <div className="text-left relative">
          {/* Restaurant Icon - Top Right */}
          <motion.div
            className="absolute -top-2 -right-2 p-3 rounded-xl"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
          >
            <Utensils className="h-6 w-6 text-white/70" />
          </motion.div>

          {/* Logo - Smaller */}
          <div>
            <h1 
              className="text-4xl font-outfit font-black leading-[0.9] tracking-tight logo-chunky cursor-pointer hover:scale-105 transition-transform"
              onClick={() => router.push('/')}
            >
              <motion.div 
                className="gradient-text"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                CHOOSING
              </motion.div>
              <motion.div 
                className="gradient-text"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                SUCKS
              </motion.div>
            </h1>
          </div>
          
          {/* New tagline */}
          <motion.p 
            className="text-white/70 text-xl font-semibold mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Let's figure out where to eat
          </motion.p>
        </div>

        {/* Form Grid - Consistent Layout */}
        <div className="space-y-6">
          {/* ZIP Code */}
          <div className="flex items-center gap-4">
            <div className="text-lg font-black text-white/90 leading-tight w-20">
              ZIP
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                inputMode="numeric"
                placeholder={geolocation.loading ? "Detecting..." : "Enter ZIP"}
                value={zipCode}
                onChange={(e) => setZipCode(formatZipCode(e.target.value))}
                maxLength={5}
                className="input-gradient w-full text-center text-xl font-bold pr-12"
                disabled={geolocation.loading}
              />
              <button
                onClick={() => geolocation.getCurrentLocation()}
                disabled={geolocation.loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/70 hover:text-white transition-all hover:scale-105 active:scale-95"
              >
                {geolocation.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        
          {/* Error Message */}
          {geolocation.error && (
            <div className="flex items-center gap-4">
              <div className="w-20"></div>
              <p className="text-xs text-orange-burst flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {geolocation.error}
              </p>
            </div>
          )}

          {/* Details Toggle */}
          <div className="flex items-center gap-4">
            <div className="text-lg font-black text-white/90 leading-tight w-20">
              Details
            </div>
            <div className="flex-1">
              <button
                onClick={() => setShowCustomize(!showCustomize)}
                className={cn(
                  "w-full py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center",
                  showCustomize
                    ? "bg-gradient-electric text-white shadow-lg"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                )}
              >
                <motion.div
                  animate={{ rotate: showCustomize ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-5 w-5" />
                </motion.div>
              </button>
            </div>
          </div>

          {/* Expandable Customize Section */}
          <AnimatePresence>
            {showCustomize && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-6 overflow-hidden"
              >
                {/* How Many People */}
                <div className="flex items-center gap-4">
                  <div className="text-lg font-black text-white/90 leading-tight w-20">
                    <div>How many</div>
                    <div>people?</div>
                  </div>
                  <div className="flex gap-2 flex-1">
                    {[2, 3, 4, 5, 6].map((count) => (
                      <button
                        key={count}
                        onClick={() => {
                          setInviteCount(count.toString())
                          setShowCustomInput(false)
                          setCustomCount('')
                        }}
                        className={cn(
                          "flex-1 py-3 rounded-xl font-bold text-lg transition-all",
                          inviteCount === count.toString()
                            ? "bg-gradient-pink text-white shadow-lg scale-105"
                            : "bg-white/10 text-white/70 hover:bg-white/20"
                        )}
                      >
                        {count}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setShowCustomInput(true)
                        setInviteCount('')
                      }}
                      className={cn(
                        "flex-1 py-3 rounded-xl font-bold text-lg transition-all",
                        showCustomInput
                          ? "bg-gradient-pink text-white shadow-lg scale-105"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      )}
                    >
                      7+
                    </button>
                  </div>
                </div>
                
                {/* Custom Count Input */}
                <AnimatePresence>
                  {showCustomInput && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="flex items-center gap-4"
                    >
                      <div className="w-20"></div>
                      <div className="flex-1">
                        <input
                          type="number"
                          min="2"
                          max="20"
                          placeholder="Enter number (2-20)"
                          value={customCount}
                          onChange={(e) => {
                            const value = e.target.value
                            setCustomCount(value)
                            if (value && parseInt(value) >= 2 && parseInt(value) <= 20) {
                              setInviteCount(value)
                            }
                          }}
                          className="input-gradient w-full text-center"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Require Names */}
                <div className="flex items-center gap-4">
                  <div className="text-lg font-black text-white/90 leading-tight w-20">
                    <div>Require</div>
                    <div>names?</div>
                  </div>
                  <div className="flex gap-2 flex-1">
                    <button
                      onClick={() => setRequireNames(false)}
                      className={cn(
                        "flex-1 py-3 px-4 rounded-xl font-semibold transition-all",
                        !requireNames 
                          ? "bg-gradient-pink text-white shadow-lg scale-105" 
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      )}
                    >
                      No
                    </button>
                    <button
                      onClick={() => setRequireNames(true)}
                      className={cn(
                        "flex-1 py-3 px-4 rounded-xl font-semibold transition-all",
                        requireNames 
                          ? "bg-gradient-pink text-white shadow-lg scale-105" 
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      )}
                    >
                      Yes
                    </button>
                  </div>
                </div>

                {/* Price Filter */}
                <div className="flex items-center gap-4">
                  <div className="text-lg font-black text-white/90 leading-tight w-20">
                    <div>Price</div>
                    <div>range</div>
                  </div>
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3, 4].map((level) => (
                      <button
                        key={level}
                        onClick={() => togglePriceLevel(level)}
                        className={cn(
                          "flex-1 py-3 rounded-xl font-bold text-xl transition-all",
                          selectedPriceLevels.includes(level)
                            ? "bg-gradient-pink text-white shadow-lg scale-105"
                            : "bg-white/10 text-white/70 hover:bg-white/20"
                        )}
                      >
                        {'$'.repeat(level)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Match Type */}
                <div className="flex items-center gap-4">
                  <div className="text-lg font-black text-white/90 leading-tight w-20">
                    <div>Matches</div>
                    <div>Required</div>
                  </div>
                  <div className="flex gap-2 flex-1">
                    <button
                      onClick={() => setMatchRequirement('all')}
                      className={cn(
                        "flex-1 py-3 px-4 rounded-xl font-semibold transition-all",
                        matchRequirement === 'all'
                          ? "bg-gradient-pink text-white shadow-lg scale-105"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      )}
                    >
                      100%
                    </button>
                    <button
                      onClick={() => setMatchRequirement('majority')}
                      className={cn(
                        "flex-1 py-3 px-4 rounded-xl font-semibold transition-all",
                        matchRequirement === 'majority'
                          ? "bg-gradient-pink text-white shadow-lg scale-105"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      )}
                    >
                      50%
                    </button>
                  </div>
                </div>

                {/* How Many Matches */}
                <div className="flex items-center gap-4">
                  <div className="text-lg font-black text-white/90 leading-tight w-20">
                    <div># of</div>
                    <div>matches</div>
                  </div>
                  <div className="flex gap-2 flex-1">
                    <button
                      onClick={() => setMultipleMatches(false)}
                      className={cn(
                        "flex-1 py-3 px-4 rounded-xl font-semibold transition-all",
                        !multipleMatches
                          ? "bg-gradient-pink text-white shadow-lg scale-105"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      )}
                    >
                      First match
                    </button>
                    <button
                      onClick={() => setMultipleMatches(true)}
                      className={cn(
                        "flex-1 py-3 px-4 rounded-xl font-semibold transition-all",
                        multipleMatches
                          ? "bg-gradient-pink text-white shadow-lg scale-105"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      )}
                    >
                      All matches
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error Message */}
        {error && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-orange-burst text-center"
          >
            {error}
          </motion.p>
        )}

        {/* Create Button */}
        <button
          onClick={handleCreateSession}
          disabled={loading || !zipCode}
          className="btn-gradient w-full text-xl py-5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Creating...
            </span>
          ) : (
            'Start a swipe session'
          )}
        </button>
      </motion.div>
    </div>
  )
}