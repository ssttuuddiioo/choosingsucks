'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Copy } from 'lucide-react'

interface SessionCreatedScreenProps {
  sessionId: string
  shareLink: string
  onJoinSession: () => void
}

export default function SessionCreatedScreen({ 
  sessionId, 
  shareLink, 
  onJoinSession 
}: SessionCreatedScreenProps) {
  const [linkCopied, setLinkCopied] = useState(false)

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card p-8 max-w-md w-full text-center space-y-6"
      >
        <div className="space-y-2">
          <h1 className="text-3xl font-outfit font-bold text-gray-900">Session Created!</h1>
          <p className="text-gray-600">Share this link with your group</p>
        </div>

        <button
          onClick={handleCopyLink}
          className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all ${
            linkCopied
              ? "bg-gradient-lime text-white shadow-lg"
              : "btn-gradient"
          }`}
        >
          <Copy className="h-5 w-5" />
          {linkCopied ? "Link Copied!" : "Copy Link"}
        </button>

        <button
          onClick={onJoinSession}
          className="btn-gradient-pink w-full text-xl py-4"
        >
          Join Session
        </button>
        
        <p className="text-xs text-gray-400">choosing.sucks</p>
      </motion.div>
    </div>
  )
}
