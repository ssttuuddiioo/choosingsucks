'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Share2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setLinkCopied(true)
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
    <div className="min-h-screen bg-warm-cream flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="p-8 max-w-md w-full text-center space-y-6"
      >
        <div className="space-y-2">
          <h1 className="text-3xl font-outfit font-bold text-warm-black">Session Created!</h1>
          <p className="text-warm-gray500 text-lg">
            Share this with your group
          </p>
        </div>

        {/* QR Code Display - Always visible */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-md border border-warm-gray100 p-6 space-y-3 flex flex-col items-center"
        >
          <p className="text-sm text-warm-gray500 text-center">
            Scan to join the session
          </p>
          <div className="bg-white p-4 rounded-xl">
            <QRCodeSVG 
              value={shareLink} 
              size={200}
              level="H"
              includeMargin={false}
            />
          </div>
          <p className="text-xs text-warm-gray300 text-center">
            Anyone with a QR scanner can join!
          </p>
        </motion.div>

        {/* Share buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleShare}
            className="flex-1 btn-warm flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all"
          >
            <Share2 className="h-5 w-5" />
            Share
          </button>

          <button
            onClick={handleCopyLink}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all ${
              linkCopied
                ? "bg-coral text-white shadow-lg"
                : "bg-warm-gray100 text-warm-gray700 hover:bg-warm-gray200"
            }`}
          >
            <Copy className="h-5 w-5" />
            {linkCopied ? "Copied!" : "Copy"}
          </button>
        </div>

        {/* Join button */}
        <motion.button
          onClick={onJoinSession}
          className="w-full text-xl py-4 rounded-xl font-semibold btn-warm transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Join Session
        </motion.button>
        
        {/* Helper text */}
        <motion.p 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-warm-gray500"
        >
          You need at least 2 people to make a decision!
        </motion.p>

        <p className="text-xs text-warm-gray300">choosing.sucks</p>
      </motion.div>
    </div>
  )
}
