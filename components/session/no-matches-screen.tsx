import { RefreshCw, MapPin, Utensils, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Tables } from '@/types/supabase'

interface NoMatchesScreenProps {
  session: Tables<'sessions'>
  onStartOver?: () => void
  onExpandSearch?: () => void
}

export default function NoMatchesScreen({ session, onStartOver, onExpandSearch }: NoMatchesScreenProps) {
  // Fun "no match" messages
  const noMatchMessages = [
    "Tough crowd! 🤷‍♀️",
    "No unanimous winners this time!",
    "Your group has... diverse tastes!",
    "Democracy is hard! 😅",
    "Plot twist: No perfect match!"
  ]
  
  const randomMessage = noMatchMessages[Math.floor(Math.random() * noMatchMessages.length)]

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Main message */}
        <div className="space-y-3">
          <div className="text-6xl">🤔</div>
          <h1 className="text-2xl font-bold text-gray-900">{randomMessage}</h1>
          <p className="text-gray-600">
            Nobody agreed on the same restaurant. But hey, that's what makes choosing fun!
          </p>
        </div>

        {/* Options card */}
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">What now?</h2>
          
          <div className="space-y-3">
            <Button
              onClick={onStartOver}
              className="w-full"
              size="lg"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Start Over
            </Button>
            
            <Button
              onClick={onExpandSearch}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <MapPin className="mr-2 h-4 w-4" />
              Try Different Area
            </Button>
          </div>
        </div>

        {/* Helpful suggestions */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-center gap-2 text-gray-700">
            <Utensils className="h-4 w-4" />
            <span className="font-medium text-sm">Suggestions</span>
          </div>
          
          <div className="text-sm text-gray-600 space-y-2">
            <p>• Try being less picky this round 😉</p>
            <p>• Consider expanding your search radius</p>
            <p>• Maybe grab food trucks instead?</p>
          </div>
        </div>

        {/* Back to host option */}
        <Button
          onClick={() => window.location.href = '/'}
          variant="ghost"
          className="text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Start New Session
        </Button>
      </div>
    </div>
  )
}
