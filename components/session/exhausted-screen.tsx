import { Users, HandMetal } from 'lucide-react'
import type { Tables } from '@/types/supabase'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect } from 'react'
import { env } from '@/lib/utils/env'

interface ExhaustedScreenProps {
  session: Tables<'sessions'>
  sessionStatus: {
    invitedCount: number
    joinedCount: number
    submittedCount: number
  }
}

export default function ExhaustedScreen({ session, sessionStatus }: ExhaustedScreenProps) {
  const { joinedCount, submittedCount } = sessionStatus
  const waitingCount = joinedCount - submittedCount
  const isMultiPerson = env.features.multiPersonSessions

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

  return (
    <div className="h-screen bg-gradient-primary flex flex-col justify-center items-center p-4" style={{ height: '100dvh' }}>
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
            <HandMetal className="w-20 h-20 text-white" />
          </motion.div>
          <h1 className="text-3xl font-outfit font-bold gradient-text">
            Your votes are in
          </h1>
        </div>

        {/* Status card */}
        {waitingMessage && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4">
            <div className="text-white/70">
              <p className="text-2xl font-outfit font-bold text-white">
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
                  <motion.div className="text-4xl font-outfit font-bold gradient-text">
                    {rounded}
                  </motion.div>
                  <div className="text-white/50 text-sm">Decided</div>
                </div>
                <div className="text-3xl text-white/20">/</div>
                <div className="text-center">
                  <div className="text-4xl font-outfit font-bold text-white">
                    {joinedCount}
                  </div>
                  <div className="text-white/50 text-sm">Total</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Encouraging message */}
        <div className="bg-gradient-electric p-4 rounded-xl">
          <p className="text-white text-sm font-medium">
            {waitingCount > 0 
              ? "We'll let you know as soon as everyone's done" 
              : "Calculating your matches now..."
            }
          </p>
        </div>
      </motion.div>
    </div>
  )
}