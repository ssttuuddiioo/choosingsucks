'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Loader2, Play } from 'lucide-react'
import { ReactNode } from 'react'

interface SetupPageTemplateProps {
  title: {
    choosing: string // "CHOOSING"
    subject: string // "FOOD" or "SHOWS" 
    sucks: string   // "SUCKS"
  }
  subtitle: string
  icon: ReactNode
  children: ReactNode // The setup sections (content type, services, genres, etc.)
  onStartSession: () => void
  canStartSession: boolean
  isCreatingSession: boolean
  sessionButtonText: string
  loadingText: string
  errorMessage?: string
}

export default function SetupPageTemplate({
  title,
  subtitle,
  icon,
  children,
  onStartSession,
  canStartSession,
  isCreatingSession,
  sessionButtonText,
  loadingText,
  errorMessage
}: SetupPageTemplateProps) {
  const router = useRouter()

  return (
    <div className="h-screen flex flex-col bg-gradient-primary overflow-hidden" style={{ height: '100dvh' }}>
      {/* Header - Fixed */}
      <div className="flex justify-between items-center p-4 flex-shrink-0 bg-gradient-primary backdrop-blur border-b border-white/10 relative z-20">
        <div>
          <h1 
            className="text-2xl font-outfit font-black leading-tight logo-chunky cursor-pointer hover:scale-105 transition-transform"
            onClick={() => router.push('/')}
          >
            <div>
              <span className="gradient-text">{title.choosing} </span>
              <span className="text-white">{title.subject} </span>
              <span className="gradient-text">{title.sucks}</span>
            </div>
          </h1>
          <p className="text-white/70 text-sm font-semibold">
            {subtitle}
          </p>
        </div>
        <div className="p-2 rounded-xl">
          {icon}
        </div>
      </div>
      
      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          {/* Setup Sections */}
          <div className="space-y-6">
            {children}
          </div>

          {/* Start Button */}
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <button
              onClick={onStartSession}
              disabled={!canStartSession || isCreatingSession}
              className={`
                w-full py-4 rounded-2xl font-bold text-xl transition-all duration-300 transform
                flex items-center justify-center gap-3
                ${canStartSession && !isCreatingSession
                  ? 'bg-gradient-electric text-white shadow-lg hover:scale-105 active:scale-95' 
                  : 'bg-white/20 text-white/50 cursor-not-allowed'
                }
              `}
            >
              {isCreatingSession ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  {loadingText}
                </>
              ) : (
                <>
                  <Play className="h-6 w-6" />
                  {sessionButtonText}
                </>
              )}
            </button>

            {!canStartSession && errorMessage && (
              <p className="text-white/60 text-sm text-center">
                {errorMessage}
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
