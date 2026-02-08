'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Loader2, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer'
import ChatMessage from './ChatMessage'
import ChatPlacesResult from './ChatPlacesResult'
import { cn } from '@/lib/utils/cn'
import { createBrowserClient } from '@/lib/utils/supabase-client'
import { getClientFingerprint } from '@/lib/utils/session'
import type { FeaturedPlace } from './FeaturedCard'

type TextMessage = {
  role: 'user' | 'assistant'
  type: 'text'
  content: string
}

type PlacesMessage = {
  role: 'assistant'
  type: 'places'
  content: string
  places: FeaturedPlace[]
}

type Message = TextMessage | PlacesMessage

const PROMPT_CHIPS = [
  'Friends night out',
  'Quick bite, date night',
  'Intimate bar for conversation',
  'Family dinner',
  'Work lunch',
  'Surprise me',
]

interface ChatDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userLocation: { lat: number; lng: number } | null
}

export default function ChatDrawer({ open, onOpenChange, userLocation }: ChatDrawerProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<FeaturedPlace[] | null>(null)
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<Set<string>>(new Set())
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping, isSearching])

  // Reset state when drawer closes
  useEffect(() => {
    if (!open) {
      setMessages([])
      setInputValue('')
      setIsTyping(false)
      setIsSearching(false)
      setSearchResults(null)
      setSelectedPlaceIds(new Set())
      setIsCreatingSession(false)
    }
  }, [open])

  const hasUserSentMessage = messages.some((m) => m.role === 'user')

  const handleSend = async (text: string) => {
    if (!text.trim()) return

    const userMsg: TextMessage = { role: 'user', type: 'text', content: text.trim() }
    const newMessages: Message[] = [...messages, userMsg]
    setMessages(newMessages)
    setInputValue('')
    setIsTyping(true)

    try {
      // Only send text messages to the chat API
      const chatMessages = newMessages
        .filter((m): m is TextMessage => m.type === 'text')
        .map((m) => ({ role: m.role, content: m.content }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatMessages }),
      })
      const data = await response.json()

      if (data.content) {
        setMessages((prev) => [...prev, { role: 'assistant', type: 'text', content: data.content }])
      } else {
        const friendlyError = data.error?.includes('unavailable') || data.error?.includes('configured')
          ? "Chat is temporarily unavailable. Please try again later."
          : "Something went wrong. Try again?"
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', type: 'text', content: friendlyError },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', type: 'text', content: "Sorry, I couldn't connect. Try again?" },
      ])
    }

    setIsTyping(false)
  }

  const handleSearch = async () => {
    if (!userLocation) return
    setIsSearching(true)

    try {
      // Step 1: Extract filters from conversation
      const textMessages = messages
        .filter((m): m is TextMessage => m.type === 'text')
        .map((m) => ({ role: m.role, content: m.content }))

      const extractRes = await fetch('/api/chat-extract-filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: textMessages }),
      })
      const filters = await extractRes.json()

      // Step 2: Search places with extracted filters
      const placesRes = await fetch('/api/discover-places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: userLocation.lat,
          lng: userLocation.lng,
          radius: 2.5,
          keywords: filters.keywords || [],
          selectedPriceLevels: filters.selectedPriceLevels || [1, 2, 3],
          minRating: filters.minRating || undefined,
        }),
      })
      const placesData = await placesRes.json()
      const places: FeaturedPlace[] = placesData.places || []

      // Step 3: Show results inline
      const resultMessage: PlacesMessage = {
        role: 'assistant',
        type: 'places',
        content:
          places.length > 0
            ? `I found ${places.length} spot${places.length !== 1 ? 's' : ''} that match what you described!`
            : "Hmm, I couldn't find restaurants matching those criteria nearby. Try broadening what you're looking for?",
        places,
      }
      setMessages((prev) => [...prev, resultMessage])
      setSearchResults(places)
      setSelectedPlaceIds(new Set(places.map((p) => p.placeId)))
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', type: 'text', content: "Sorry, something went wrong while searching. Try again?" },
      ])
    }

    setIsSearching(false)
  }

  const handleTogglePlace = (placeId: string) => {
    setSelectedPlaceIds((prev) => {
      const next = new Set(prev)
      if (next.has(placeId)) {
        next.delete(placeId)
      } else {
        next.add(placeId)
      }
      return next
    })
  }

  const handleCreateSession = async () => {
    if (!searchResults || selectedPlaceIds.size === 0 || !userLocation) return
    setIsCreatingSession(true)

    try {
      const supabase = createBrowserClient()

      // 1. Create session
      const { data: session, error: sessionError } = await (supabase as any)
        .from('sessions')
        .insert({
          place_search_center: `POINT(${userLocation.lng} ${userLocation.lat})`,
          search_radius_miles: 2.5,
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

      // 3. Insert selected places as candidates
      const selectedPlaces = searchResults.filter((p) => selectedPlaceIds.has(p.placeId))
      const candidateInserts = selectedPlaces.map((place) => ({
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

      // 4. Navigate to session
      onOpenChange(false)
      router.push(`/session/${session.id}`)
    } catch (err) {
      console.error('Error creating session from chat:', err)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', type: 'text', content: "Couldn't create the session. Try again?" },
      ])
      setIsCreatingSession(false)
    }
  }

  const showChips = messages.length === 0

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-warm-cream border-warm-gray200" style={{ height: '75dvh' }}>
        <DrawerHeader className="text-left pb-2">
          <DrawerTitle className="font-outfit text-warm-black">
            Let&apos;s talk about it
          </DrawerTitle>
          <DrawerDescription className="text-warm-gray500 text-sm">
            Describe what you&apos;re looking for
          </DrawerDescription>
        </DrawerHeader>

        {/* Messages area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 space-y-3 min-h-[120px]">
          {/* Prompt chips (shown when no messages yet) */}
          {showChips && (
            <div className="flex flex-wrap gap-2 pb-2">
              {PROMPT_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSend(chip)}
                  className="px-3.5 py-2 bg-white border border-warm-gray200 rounded-full text-sm text-warm-gray700 hover:border-coral hover:text-coral transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Chat messages */}
          {messages.map((msg, i) => {
            if (msg.type === 'places') {
              return (
                <ChatPlacesResult
                  key={i}
                  content={msg.content}
                  places={msg.places}
                  selected={selectedPlaceIds}
                  onToggle={handleTogglePlace}
                />
              )
            }
            return <ChatMessage key={i} role={msg.role} content={msg.content} />
          })}

          {/* Typing indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-warm-gray100 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-warm-gray300"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Searching indicator */}
          {isSearching && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-warm-gray100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2 text-sm text-warm-gray500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Searching for restaurants...
              </div>
            </motion.div>
          )}

          {/* "Start swipe session" CTA after results */}
          {searchResults && searchResults.length > 0 && !isCreatingSession && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex justify-center pt-1 pb-2"
            >
              <button
                onClick={handleCreateSession}
                disabled={selectedPlaceIds.size === 0}
                className="px-6 py-2.5 bg-coral text-white text-sm font-semibold rounded-full hover:bg-coral-dark active:scale-95 transition-all disabled:opacity-40"
              >
                Start swipe session{selectedPlaceIds.size > 0 ? ` (${selectedPlaceIds.size})` : ''}
              </button>
            </motion.div>
          )}

          {isCreatingSession && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center pt-1 pb-2"
            >
              <div className="flex items-center gap-2 text-sm text-warm-gray500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Setting up your session...
              </div>
            </motion.div>
          )}
        </div>

        {/* Bottom bar: search CTA + input */}
        <div className="flex-shrink-0 border-t border-warm-gray200">
          {/* Zone A: Search CTA — shown after user has sent a message */}
          {hasUserSentMessage && !isTyping && !searchResults && !isSearching && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-4 pt-3"
            >
              <button
                onClick={handleSearch}
                disabled={!userLocation}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-coral text-white text-sm font-bold rounded-full hover:bg-coral-dark active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm"
              >
                <Search className="w-4 h-4" />
                Let&apos;s see what that can bring up
              </button>
            </motion.div>
          )}

          {/* Divider: "or keep chatting" — only when both zones are visible */}
          {hasUserSentMessage && !isTyping && !searchResults && !isSearching && (
            <div className="flex items-center gap-3 px-6 py-1.5">
              <div className="flex-1 h-px bg-warm-gray200" />
              <span className="text-xs text-warm-gray300">or keep chatting</span>
              <div className="flex-1 h-px bg-warm-gray200" />
            </div>
          )}

          {/* Zone B: Input bar — hidden after results are shown */}
          {!searchResults && (
            <div
              className="flex items-center gap-2 px-4 py-2"
              style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend(inputValue)
                  }
                }}
                placeholder={hasUserSentMessage ? 'Tell me more...' : 'What sounds good?'}
                className="flex-1 bg-white border border-warm-gray200 rounded-full px-4 py-2.5 text-sm text-warm-black placeholder:text-warm-gray300 focus:outline-none focus:border-coral transition-colors"
                disabled={isTyping || isSearching}
              />
              <button
                onClick={() => handleSend(inputValue)}
                disabled={isTyping || isSearching || !inputValue.trim()}
                className={cn(
                  'w-10 h-10 flex items-center justify-center rounded-full transition-all',
                  inputValue.trim() && !isTyping && !isSearching
                    ? 'bg-coral text-white active:scale-95'
                    : 'bg-warm-gray100 text-warm-gray300'
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Safe area padding when input is hidden */}
          {searchResults && (
            <div style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }} />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
