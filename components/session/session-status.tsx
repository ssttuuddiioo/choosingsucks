import { Users, CheckCircle, Clipboard, Check } from 'lucide-react'
import type { Tables } from '@/types/supabase'
import { cn } from '@/lib/utils/cn'
import { generateShareToken } from '@/lib/utils/session'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SessionStatusProps {
  session: Tables<'sessions'>
  sessionStatus: {
    invitedCount: number
    joinedCount: number
    submittedCount: number
  }
  remainingCount?: number
}

export default function SessionStatus({ session, sessionStatus, remainingCount }: SessionStatusProps) {
  const { invitedCount, joinedCount, submittedCount } = sessionStatus
  const progress = joinedCount > 0 ? (submittedCount / joinedCount) * 100 : 0
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    // Generate a new share token for security
    const shareToken = generateShareToken()
    const shareUrl = `${window.location.origin}/session/${session.id}?t=${shareToken}`
    
    // Always copy to clipboard
    copyToClipboard(shareUrl)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="bg-black/20 backdrop-blur-md border-0 rounded-none px-4 py-4">
      <div className="max-w-md mx-auto">
        {/* Status info - improved typography */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-electric-purple" />
              <span className="font-bold text-base">{joinedCount} humans</span>
            </div>
            
            <div className="flex items-center gap-2">
              <CheckCircle className={cn(
                "h-5 w-5",
                submittedCount === joinedCount && joinedCount > 0 ? "text-lime-green" : "text-white/50"
              )} />
              <span className="font-bold text-base">{submittedCount} matches</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {remainingCount !== undefined && remainingCount > 0 && (
              <div className="bg-gradient-orange text-white px-3 py-2 rounded-full font-bold text-sm">
                {remainingCount}
              </div>
            )}
            
            <button
              onClick={handleShare}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all transform hover:scale-110 active:scale-95"
              title="Copy session link"
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.div
                    key="copied"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Check className="h-5 w-5 text-lime-green" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="clipboard"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Clipboard className="h-5 w-5 text-white" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* Waiting message - brand voice */}
        {invitedCount > 0 && joinedCount < invitedCount && (
          <div className="text-sm text-white/60 text-center font-medium mt-3">
            Waiting for {invitedCount - joinedCount} more indecisive {invitedCount - joinedCount === 1 ? 'human' : 'humans'}
          </div>
        )}
      </div>
    </div>
  )
}