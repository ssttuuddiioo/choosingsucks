import { Clock, Users } from 'lucide-react'
import type { Tables } from '@/types/supabase'
import { motion } from 'framer-motion'
import { useSpring, animated } from '@react-spring/web'

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

  // Animated counter
  const props = useSpring({
    from: { number: 0 },
    to: { number: submittedCount },
    config: { duration: 1000 }
  })

  const messages = [
    "You've done your part",
    "Your votes are locked in",
    "Decision made on your end",
    "You're all set",
    "Choices submitted"
  ]
  
  const randomMessage = messages[Math.floor(Math.random() * messages.length)]

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 150, damping: 20 }}
        className="glass-card p-8 max-w-md w-full text-center space-y-6"
      >
        {/* Main message */}
        <div className="space-y-3">
          <motion.div 
            className="text-8xl"
            animate={{ rotate: [0, 10, -10, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            ⏳
          </motion.div>
          <h1 className="text-3xl font-outfit font-bold gradient-text">
            {randomMessage}
          </h1>
          <p className="text-white/70 text-lg">
            You've voted on all available options
          </p>
        </div>

        {/* Status card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4">
          {waitingCount > 0 ? (
            <>
              <div className="flex items-center justify-center gap-2">
                <Clock className="h-5 w-5 text-orange-burst animate-pulse" />
                <span className="font-semibold text-white">Still waiting...</span>
              </div>
              
              <div className="text-white/70">
                <p className="text-2xl font-outfit font-bold text-white">
                  {waitingCount} {waitingCount === 1 ? 'person' : 'people'}
                </p>
                <p className="text-sm mt-1">
                  {waitingCount === 1 ? 'is' : 'are'} still choosing (ugh)
                </p>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Users className="h-5 w-5 text-lime-green" />
              <span className="font-semibold text-white">All votes are in!</span>
            </div>
          )}

          {/* Progress visualization */}
          <div className="pt-4">
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <animated.div className="text-4xl font-outfit font-bold gradient-text">
                  {props.number.to(n => Math.floor(n))}
                </animated.div>
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