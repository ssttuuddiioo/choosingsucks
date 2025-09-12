'use client'

import { motion } from 'framer-motion'
import { GENRES } from '@/lib/constants/streaming'

interface GenresSectionProps {
  selectedGenres: number[]
  onGenresChange: (genres: number[]) => void
}

export default function GenresSection({ 
  selectedGenres, 
  onGenresChange 
}: GenresSectionProps) {
  
  const toggleGenre = (genreId: number) => {
    if (selectedGenres.includes(genreId)) {
      // Don't allow removing if it's the only one selected
      if (selectedGenres.length > 1) {
        onGenresChange(selectedGenres.filter(id => id !== genreId))
      }
    } else {
      onGenresChange([...selectedGenres, genreId])
    }
  }

  return (
    <motion.div 
      className="space-y-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {GENRES.map((genre, index) => (
          <motion.button
            key={genre.id}
            onClick={() => toggleGenre(genre.id)}
            className={`
              py-3 px-4 rounded-xl font-bold text-sm transition-all duration-300
              ${selectedGenres.includes(genre.id)
                ? 'bg-gradient-pink text-white shadow-lg' 
                : 'bg-white/10 text-white/70 hover:bg-white/20'
              }
            `}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + (index * 0.02) }}
          >
            {genre.name}
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}
