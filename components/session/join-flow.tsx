'use client'

import { useState } from 'react'
import type { Tables } from '@/types/supabase'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

interface JoinFlowProps {
  session: Tables<'sessions'>
  onJoin: (name?: string) => Promise<void>
}

const categoryTaglines = {
  restaurants: "Because choosing where to eat sucks",
  streaming: "Because choosing what to watch sucks",
  'build-your-own': "Because choosing sucks"
}

export default function JoinFlow({ session, onJoin }: JoinFlowProps) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Get category-specific tagline
  const category = (session.category || 'restaurants') as keyof typeof categoryTaglines
  const tagline = categoryTaglines[category] || categoryTaglines.restaurants

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!!session.require_names && !name.trim()) {
      setError('Name required for this session')
      return
    }

    setLoading(true)
    setError('')

    try {
      await onJoin(name.trim() || undefined)
    } catch (err) {
      setError('Failed to join. Try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-warm-cream flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="bg-white rounded-2xl shadow-md border border-warm-gray100 p-8 max-w-md w-full space-y-6"
      >
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-outfit font-bold text-coral">
            Help us choose
          </h1>
          <p className="text-warm-gray500">
            {tagline}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {session.require_names && (
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-warm-gray700">
                What should we call you?
              </label>
              <input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-lg px-4 py-3 bg-warm-bg border border-warm-gray200 rounded-xl text-warm-black placeholder-warm-gray300 focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral"
                autoFocus
              />
            </div>
          )}

          {!session.require_names && (
            <div className="text-center py-4">
              <p className="text-warm-gray300 text-sm">
                This session is anonymous
              </p>
              <p className="text-warm-gray700 text-lg font-semibold mt-2">
                Ready to help pick a place?
              </p>
            </div>
          )}

          {error && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-orange-burst text-center font-medium"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading || (!!session.require_names && !name.trim())}
            className="btn-warm w-full text-xl py-5 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all hover:scale-105 active:scale-95"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Joining...
              </span>
            ) : (
              "I'm in"
            )}
          </button>
        </form>

        <div className="text-center">
          <p className="text-xs text-warm-gray300">
            Powered by choosing.sucks
          </p>
        </div>
      </motion.div>
    </div>
  )
}