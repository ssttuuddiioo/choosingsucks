import { RefreshCw, MapPin, Utensils, ArrowLeft, Zap, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FaRegHandPeace, FaRegHandPaper } from "react-icons/fa"
import { PiHandFist } from "react-icons/pi"
import { motion } from 'framer-motion'
import type { Tables } from '@/types/supabase'

type Move = 'rock' | 'paper' | 'scissors'

interface NoMatchesScreenProps {
  session: Tables<'sessions'>
  participant?: Tables<'participants'>
  onStartOver?: () => void
  onExpandSearch?: () => void
  onRockPaperScissors?: () => void
  onRPSMove?: (move: Move) => void
  onNewSession?: () => void
}

export default function NoMatchesScreen({ session, participant, onStartOver, onExpandSearch, onRockPaperScissors, onRPSMove, onNewSession }: NoMatchesScreenProps) {
  // Fun "no match" messages
  const noMatchMessages = [
    "Tough crowd!",
    "No unanimous winners this time!",
    "Your group has... diverse tastes!",
    "Democracy is hard!",
    "Plot twist: No perfect match!"
  ]
  
  const randomMessage = noMatchMessages[Math.floor(Math.random() * noMatchMessages.length)]

  const moveIcons = {
    rock: PiHandFist,
    paper: FaRegHandPaper,
    scissors: FaRegHandPeace,
  }

  const moveNames = {
    rock: 'Rock',
    paper: 'Paper', 
    scissors: 'Scissors',
  }

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full text-center space-y-6"
      >
        {/* Main message */}
        <div className="space-y-3">
          <div className="text-6xl text-white/30">×</div>
          <h1 className="text-2xl font-outfit font-bold gradient-text">{randomMessage}</h1>
          <p className="text-white/70 text-lg">
            Nobody agreed on the same restaurant. Let's settle this!
          </p>
        </div>

        {/* Rock Paper Scissors - Direct Play */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Choose your weapon:</h2>
          
          {/* RPS Icons - Direct tap to play */}
          <div className="grid grid-cols-3 gap-4">
            {(['rock', 'paper', 'scissors'] as Move[]).map((move) => {
              const Icon = moveIcons[move]
              return (
                <motion.button
                  key={move}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onRPSMove?.(move)}
                  className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/30 transition-colors group"
                >
                  <Icon className="w-12 h-12 text-white mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <div className="text-white font-medium text-sm">{moveNames[move]}</div>
                </motion.button>
              )
            })}
          </div>
          
          <p className="text-white/60 text-sm">
            Tap to play! Winner gets to choose where you eat.
          </p>
        </div>

        {/* Alternative options */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 space-y-3">
          <h3 className="text-white/90 font-medium text-sm">Or try something else:</h3>
          
          <div className="space-y-2">
            {onNewSession && (
              <Button
                onClick={onNewSession}
                className="w-full bg-gradient-electric text-white font-semibold"
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Start Fresh Session
              </Button>
            )}
            
            <Button
              onClick={onStartOver}
              variant="outline"
              className="w-full border-white/20 text-white/90 hover:bg-white/10"
              size="sm"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Same Restaurants Again
            </Button>
          </div>
        </div>

        {/* Back to home */}
        <Button
          onClick={() => window.location.href = '/'}
          variant="ghost"
          className="text-white/50 hover:text-white/70"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </motion.div>
    </div>
  )
}
