"use client"

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Home, Link2, Info } from 'lucide-react'

interface InvalidSessionScreenProps {
  message?: string
}

export default function InvalidSessionScreen({ message }: InvalidSessionScreenProps) {
  const router = useRouter()

  const handleStartNew = () => {
    router.push('/restaurants')
  }

  const handleHome = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 20 }}
        className="glass-card p-8 max-w-md w-full text-center space-y-6"
      >
        <div className="space-y-3">
          <motion.div
            className="text-8xl"
            animate={{ rotate: [0, -6, 6, -6, 0] }}
            transition={{ duration: 1.6, repeat: 0 }}
          >
            🧭
          </motion.div>
          <h1 className="text-3xl font-outfit font-bold gradient-text">
            Oops—link problem
          </h1>
          <p className="text-white/70">
            {message || 'That session link is expired or never existed.'}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleStartNew}
            className="btn-gradient-pink w-full text-lg py-4"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Link2 className="h-5 w-5" />
              Start a new session
            </span>
          </button>

          <button
            onClick={handleHome}
            className="bg-white/10 hover:bg-white/20 text-white w-full text-lg py-4 rounded-2xl font-semibold transition-all"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Home className="h-5 w-5" />
              Go to home
            </span>
          </button>
        </div>

        <div className="text-xs text-white/40 flex items-center justify-center gap-1">
          <Info className="h-3.5 w-3.5" />
          If someone shared this with you, ask them for a fresh link.
        </div>
      </motion.div>
    </div>
  )
}


