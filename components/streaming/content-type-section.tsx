'use client'

import { motion } from 'framer-motion'
import { CONTENT_TYPES } from '@/lib/constants/streaming'

interface ContentTypeSectionProps {
  contentTypes: ('movie' | 'tv_series' | 'tv_miniseries' | 'tv_special')[]
  onContentTypesChange: (types: ('movie' | 'tv_series' | 'tv_miniseries' | 'tv_special')[]) => void
}

export default function ContentTypeSection({ 
  contentTypes, 
  onContentTypesChange 
}: ContentTypeSectionProps) {
  const toggleContentType = (type: 'movie' | 'tv_series' | 'tv_miniseries' | 'tv_special') => {
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
      className="space-y-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <div className="grid grid-cols-2 gap-3">
        {CONTENT_TYPES.map((contentType) => (
          <button
            key={contentType.id}
            onClick={() => toggleContentType(contentType.id as any)}
            className={`
              py-3 px-4 rounded-xl font-bold text-lg transition-all duration-300
              ${contentTypes.includes(contentType.id as any)
                ? 'bg-gradient-electric text-white shadow-lg' 
                : 'bg-white/10 text-white/70 hover:bg-white/20'
              }
            `}
          >
            {contentType.name}
          </button>
        ))}
      </div>
    </motion.div>
  )
}
