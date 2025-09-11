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
      onGenresChange(selectedGenres.filter(id => id !== genreId))
    } else {
      onGenresChange([...selectedGenres, genreId])
    }
  }

  return (
    <motion.div 
      className="bg-white/10 rounded-2xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <h2 className="text-white text-xl font-bold mb-4">Genres (Optional)</h2>
      <div className="flex flex-wrap gap-2">
        {GENRES.map((genre, index) => (
          <motion.button
            key={genre.id}
            onClick={() => toggleGenre(genre.id)}
            className={`
              px-4 py-2 rounded-full font-bold text-sm transition-all duration-300 transform
              ${selectedGenres.includes(genre.id)
                ? 'bg-gradient-electric text-white shadow-lg scale-105' 
                : 'bg-white/20 text-white hover:bg-white/30 hover:scale-102'
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
      
      {selectedGenres.length === 0 && (
        <p className="text-white/60 text-sm mt-4 text-center">
          Leave empty to see all genres, or select specific ones
        </p>
      )}
      
      {selectedGenres.length > 0 && (
        <p className="text-white/80 text-sm mt-4 text-center">
          {selectedGenres.length} genre{selectedGenres.length > 1 ? 's' : ''} selected
        </p>
      )}
    </motion.div>
  )
}
