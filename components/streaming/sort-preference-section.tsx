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
    { value: 'new_releases' as SortPreference, label: 'New Releases', description: 'Latest movies and shows' },
    { value: 'most_popular' as SortPreference, label: 'Most Popular', description: 'Trending content' },
  ]

  return (
    <motion.div 
      className="bg-white/10 rounded-2xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      <h2 className="text-white text-xl font-bold mb-4">Content Discovery</h2>
      <div className="flex gap-3">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onSortChange(option.value)}
            className={`
              flex-1 p-4 rounded-xl font-bold transition-all duration-300 text-center
              ${sortBy === option.value
                ? 'bg-gradient-electric text-white shadow-lg transform scale-105' 
                : 'bg-white/20 text-white hover:bg-white/30 hover:scale-102'
              }
            `}
          >
            <div className="text-base mb-1">{option.label}</div>
            <div className="text-xs opacity-80">{option.description}</div>
          </button>
        ))}
      </div>
    </motion.div>
  )
}
