'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface SwipePageHeaderProps {
  currentIndex: number
  totalCount: number
  backUrl: string
  showSessionInfo?: boolean
  sessionInfo?: {
    joinedCount: number
    invitedCount: number
    submittedCount: number
  }
}

export default function SwipePageHeader({ 
  currentIndex, 
  totalCount, 
  backUrl,
  showSessionInfo = false,
  sessionInfo
}: SwipePageHeaderProps) {
  const router = useRouter()

  if (showSessionInfo && sessionInfo) {
    // Restaurant-style session header with participant info
    return (
      <div className="bg-black/20 backdrop-blur-md border-0 rounded-none px-4 py-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base">{sessionInfo.joinedCount} of {sessionInfo.invitedCount}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="font-bold text-base">{sessionInfo.submittedCount} matches</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-gradient-orange text-white px-3 py-2 rounded-full font-bold text-sm">
                {totalCount - currentIndex}
              </div>
              
              <button
                onClick={() => router.push(backUrl)}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all transform hover:scale-110 active:scale-95"
                title="Back to setup"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Simple streaming-style header with just progress and back button
  return (
    <div className="flex-shrink-0 p-4 flex justify-between items-center">
      <button
        onClick={() => router.push(backUrl)}
        className="text-white/70 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-6 w-6" />
      </button>
      <div className="text-white/70 text-sm">
        {currentIndex + 1} of {totalCount}
      </div>
    </div>
  )
}
