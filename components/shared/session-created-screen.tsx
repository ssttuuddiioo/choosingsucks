'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Share2 } from 'lucide-react'

interface SessionCreatedScreenProps {
  sessionId: string
  shareLink: string
  onJoinSession: () => void
  categoryName?: string
}

export default function SessionCreatedScreen({ 
  sessionId, 
  shareLink, 
  onJoinSession,
  categoryName = 'session'
}: SessionCreatedScreenProps) {
  const [linkCopied, setLinkCopied] = useState(false)
  const [hasShared, setHasShared] = useState(false)

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setLinkCopied(true)
      setHasShared(true) // Mark as shared when copied
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join my ${categoryName} session!`,
          text: `Help me decide - swipe together!`,
          url: shareLink,
        })
        // Mark as shared when share sheet is opened (even if user cancels)
        setHasShared(true)
      } catch (err) {
        // User cancelled or share failed
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err)
          // Fallback to copy
          handleCopyLink()
        }
      }
    } else {
      // Fallback to copy if Web Share API not available
      handleCopyLink()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="p-8 max-w-md w-full text-center space-y-6"
      >
        <div className="space-y-2">
          <h1 className="text-3xl font-outfit font-bold text-white">Session Created!</h1>
          <p className="text-white/70 text-lg">
            {!hasShared ? "First, share this link with your group" : "Great! Now join the session"}
          </p>
        </div>

        {/* Share buttons - prominent when not shared yet */}
        <motion.div 
          className="flex gap-3"
          animate={{ 
            scale: hasShared ? 0.95 : 1,
            opacity: hasShared ? 0.7 : 1 
          }}
        >
          <button
            onClick={handleShare}
            className="flex-1 btn-gradient flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all"
          >
            <Share2 className="h-5 w-5" />
            Share
          </button>
          
          <button
            onClick={handleCopyLink}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all ${
              linkCopied
                ? "bg-gradient-lime text-white shadow-lg"
                : "btn-gradient"
            }`}
          >
            <Copy className="h-5 w-5" />
            {linkCopied ? "Copied!" : "Copy"}
          </button>
        </motion.div>

        {/* Join button - only enabled after sharing */}
        <motion.button
          onClick={onJoinSession}
          disabled={!hasShared}
          className={`w-full text-xl py-4 rounded-xl font-semibold transition-all ${
            hasShared 
              ? "btn-gradient-pink" 
              : "bg-white/10 text-white/40 cursor-not-allowed"
          }`}
          animate={{ 
            scale: hasShared ? 1.02 : 1,
          }}
          whileTap={hasShared ? { scale: 0.98 } : {}}
        >
          {hasShared ? "Join Session" : "Share link first to join"}
        </motion.button>
        
        {/* Helper text */}
        {!hasShared && (
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-white/50"
          >
            💡 You need at least 2 people to make a decision!
          </motion.p>
        )}
        
        <p className="text-xs text-white/30">choosing.sucks</p>
      </motion.div>
    </div>
  )
}
