'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Gift, ArrowLeft } from 'lucide-react'

export default function GiftsPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card p-8 max-w-md w-full text-center space-y-6"
      >
        <div className="space-y-4">
          <Gift className="h-16 w-16 mx-auto text-white" />
          <h1 className="text-3xl font-outfit font-bold gradient-text">Gift Ideas</h1>
          <p className="text-white/70 text-lg">Coming soon! We're working on making gift choices suck less too.</p>
        </div>

        <button
          onClick={() => router.push('/')}
          className="btn-gradient w-full flex items-center justify-center gap-2"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Categories
        </button>
      </motion.div>
    </div>
  )
}
