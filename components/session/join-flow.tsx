'use client'

import { useState } from 'react'
import type { Tables } from '@/types/supabase'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

interface JoinFlowProps {
  session: Tables<'sessions'>
  onJoin: (name?: string) => Promise<void>
}

export default function JoinFlow({ session, onJoin }: JoinFlowProps) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="glass-card p-8 max-w-md w-full space-y-6"
      >
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-outfit font-bold gradient-text">
            Help us choose
          </h1>
          <p className="text-white/70">
            Because choosing where to eat sucks
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {session.require_names && (
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-white/90">
                What should we call you?
              </label>
              <input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-gradient w-full text-lg"
                autoFocus
              />
            </div>
          )}

          {!session.require_names && (
            <div className="text-center py-4">
              <p className="text-white/50 text-sm">
                This session is anonymous
              </p>
              <p className="text-white/70 text-lg font-semibold mt-2">
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
            className="btn-gradient-pink w-full text-xl py-5 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all hover:scale-105 active:scale-95"
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
          <p className="text-xs text-white/30">
            Powered by choosing.sucks
          </p>
        </div>
      </motion.div>
    </div>
  )
}