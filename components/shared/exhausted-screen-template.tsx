'use client'

import { Users, HandMetal, Tv, Utensils, Music, Gift, Calendar, Heart, Copy, Check } from 'lucide-react'
import type { Tables } from '@/types/supabase'
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { env } from '@/lib/utils/env'
import { generateShareToken } from '@/lib/utils/session'

interface ExhaustedScreenTemplateProps {
  session: Tables<'sessions'>
  sessionStatus: {
    invitedCount: number
    joinedCount: number
    submittedCount: number
  }
  category: 'restaurants' | 'streaming' | 'music' | 'gifts' | 'activities' | 'dates'
}

const categoryConfig = {
  restaurants: {
    icon: Utensils,
    title: 'Your votes are in',
    calculating: 'Calculating your matches now...',
    waiting: "We'll let you know as soon as everyone's done"
  },
  streaming: {
    icon: Tv,
    title: 'Your votes are in',
    calculating: 'Calculating your matches now...',
    waiting: "We'll let you know as soon as everyone's done"
  },
  music: {
    icon: Music,
    title: 'Your votes are in',
    calculating: 'Calculating your matches now...',
    waiting: "We'll let you know as soon as everyone's done"
  },
  gifts: {
    icon: Gift,
    title: 'Your votes are in',
    calculating: 'Calculating your matches now...',
    waiting: "We'll let you know as soon as everyone's done"
  },
  activities: {
    icon: Calendar,
    title: 'Your votes are in',
    calculating: 'Calculating your matches now...',
    waiting: "We'll let you know as soon as everyone's done"
  },
  dates: {
    icon: Heart,
    title: 'Your votes are in',
    calculating: 'Calculating your matches now...',
    waiting: "We'll let you know as soon as everyone's done"
  }
}

export default function ExhaustedScreenTemplate({ 
  session, 
  sessionStatus, 
  category 
}: ExhaustedScreenTemplateProps) {
  const { joinedCount, submittedCount } = sessionStatus
  const waitingCount = joinedCount - submittedCount
  const isMultiPerson = env.features.multiPersonSessions
  const config = categoryConfig[category]
  const [copied, setCopied] = useState(false)

  // Animated counter using Framer Motion
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => Math.round(latest))

  useEffect(() => {
    const controls = animate(count, submittedCount, { duration: 1 })
    return controls.stop
  }, [count, submittedCount])

  // Dynamic messaging based on 2-person vs multi-person mode
  const getWaitingMessage = () => {
    if (waitingCount === 0) return null
    
    if (isMultiPerson) {
      return {
        count: `${waitingCount} ${waitingCount === 1 ? 'person' : 'people'}`,
        action: `${waitingCount === 1 ? 'is' : 'are'} still choosing (ugh)`
      }
    } else {
      // For 2-person mode, it's always "1 person"
      return {
        count: '1 person',
        action: 'is still choosing (ugh)'
      }
    }
  }

  const waitingMessage = getWaitingMessage()

  const handleShare = async () => {
    const shareToken = generateShareToken()
    const shareUrl = `${window.location.origin}/${category === 'restaurants' ? 'session' : category}/${session.id}?t=${shareToken}`
    
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="h-screen bg-warm-cream flex flex-col justify-center items-center p-4" style={{ height: '100dvh' }}>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 150, damping: 20 }}
        className="w-full max-w-md text-center space-y-6"
      >
        {/* Main message */}
        <div className="space-y-3">
          <motion.div 
            className="flex justify-center"
            animate={{ rotate: [0, 10, -10, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <HandMetal className="w-20 h-20 text-coral" />
          </motion.div>
          <h1 className="text-3xl font-outfit font-bold text-warm-black">
            {config.title}
          </h1>
        </div>

        {/* Status card */}
        {waitingMessage && (
          <div className="bg-white rounded-2xl shadow-md border border-warm-gray100 p-6 space-y-4">
            <div className="text-warm-gray500">
              <p className="text-2xl font-outfit font-bold text-warm-black">
                {waitingMessage.count}
              </p>
              <p className="text-sm mt-1">
                {waitingMessage.action}
              </p>
            </div>

            {/* Progress visualization */}
            <div className="pt-4">
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <motion.div className="text-4xl font-outfit font-bold text-coral">
                    {rounded}
                  </motion.div>
                  <div className="text-warm-gray300 text-sm">Decided</div>
                </div>
                <div className="text-3xl text-warm-gray200">/</div>
                <div className="text-center">
                  <div className="text-4xl font-outfit font-bold text-warm-black">
                    {isMultiPerson ? joinedCount : 2}
                  </div>
                  <div className="text-warm-gray300 text-sm">Total</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Encouraging message */}
        <div className="bg-coral/10 p-4 rounded-xl">
          <p className="text-coral text-sm font-medium">
            {waitingCount > 0 
              ? config.waiting
              : config.calculating
            }
          </p>
        </div>

        {/* Share button - especially useful when waiting for others */}
        {waitingCount > 0 && (
          <button
            onClick={handleShare}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all ${
              copied
                ? "bg-coral text-white shadow-lg"
                : "bg-warm-gray100 text-warm-gray700 hover:bg-warm-gray200"
            }`}
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div
                  key="copied"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-2"
                >
                  <Check className="h-5 w-5" />
                  Link Copied!
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-5 w-5" />
                  Share Session
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        )}
      </motion.div>
    </div>
  )
}
