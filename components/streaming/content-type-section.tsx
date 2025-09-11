'use client'

import { motion } from 'framer-motion'
import { ContentType } from '@/lib/constants/streaming'

interface ContentTypeSectionProps {
  contentType: ContentType
  onContentTypeChange: (type: ContentType) => void
}

export default function ContentTypeSection({ 
  contentType, 
  onContentTypeChange 
}: ContentTypeSectionProps) {
  const options = [
    { value: 'tv_series' as ContentType, label: 'TV Shows' },
    { value: 'movie' as ContentType, label: 'Movies' },
    { value: 'both' as ContentType, label: 'Both' },
  ]

  return (
    <motion.div 
      className="bg-white/10 rounded-2xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <h2 className="text-white text-xl font-bold mb-4">What do you want to watch?</h2>
      <div className="flex gap-3">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onContentTypeChange(option.value)}
            className={`
              px-6 py-3 rounded-xl font-bold transition-all duration-300
              ${contentType === option.value
                ? 'bg-gradient-electric text-white shadow-lg transform scale-105' 
                : 'bg-white/20 text-white hover:bg-white/30 hover:scale-102'
              }
            `}
          >
            {option.label}
          </button>
        ))}
      </div>
    </motion.div>
  )
}
