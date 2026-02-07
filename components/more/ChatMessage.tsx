'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[80%] px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-coral text-white rounded-2xl rounded-br-sm'
            : 'bg-warm-gray100 text-warm-black rounded-2xl rounded-bl-sm'
        )}
      >
        {content}
      </div>
    </motion.div>
  )
}
