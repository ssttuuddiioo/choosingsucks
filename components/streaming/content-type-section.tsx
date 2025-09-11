'use client'

import { motion } from 'framer-motion'

interface ContentTypeSectionProps {
  contentTypes: ('movie' | 'tv_series')[]
  onContentTypesChange: (types: ('movie' | 'tv_series')[]) => void
}

export default function ContentTypeSection({ 
  contentTypes, 
  onContentTypesChange 
}: ContentTypeSectionProps) {
  const options = [
    { value: 'tv_series' as const, label: 'TV Shows' },
    { value: 'movie' as const, label: 'Movies' },
  ]

  const toggleContentType = (type: 'movie' | 'tv_series') => {
    if (contentTypes.includes(type)) {
      // Don't allow removing if it's the only one selected
      if (contentTypes.length > 1) {
        onContentTypesChange(contentTypes.filter(t => t !== type))
      }
    } else {
      onContentTypesChange([...contentTypes, type])
    }
  }

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
            onClick={() => toggleContentType(option.value)}
            className={`
              px-6 py-3 rounded-xl font-bold transition-all duration-300
              ${contentTypes.includes(option.value)
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
