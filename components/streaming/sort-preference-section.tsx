'use client'

import { motion } from 'framer-motion'
import { SortPreference } from '@/lib/constants/streaming'

interface SortPreferenceSectionProps {
  sortBy: SortPreference
  onSortChange: (sort: SortPreference) => void
}

export default function SortPreferenceSection({ 
  sortBy, 
  onSortChange 
}: SortPreferenceSectionProps) {
  const options = [
    { value: 'new_releases' as SortPreference, label: 'New Releases' },
    { value: 'most_popular' as SortPreference, label: 'Most Popular' },
  ]

  return (
    <motion.div 
      className="space-y-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      <div className="flex gap-3">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onSortChange(option.value)}
            className={`
              flex-1 py-3 rounded-xl font-bold text-xl transition-all duration-300
              ${sortBy === option.value
                ? 'bg-coral text-white shadow-md'
                : 'bg-warm-gray100 text-warm-gray700 hover:bg-warm-gray200'
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
