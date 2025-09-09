'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { 
  Utensils, 
  Truck, 
  Tv, 
  Film, 
  Music, 
  Gift, 
  Calendar,
  Heart
} from 'lucide-react'

interface Category {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  isActive: boolean
  comingSoon?: boolean
}

const categories: Category[] = [
  {
    id: 'restaurants',
    name: 'Restaurants',
    icon: Utensils,
    isActive: true,
  },
  {
    id: 'delivery',
    name: 'Food Delivery',
    icon: Truck,
    isActive: true,
    comingSoon: true,
  },
  {
    id: 'streaming',
    name: 'TV Shows',
    icon: Tv,
    isActive: true,
    comingSoon: true,
  },
  {
    id: 'movies',
    name: 'Movies',
    icon: Film,
    isActive: true,
    comingSoon: true,
  },
  {
    id: 'music',
    name: 'Music',
    icon: Music,
    isActive: true,
    comingSoon: true,
  },
  {
    id: 'gifts',
    name: 'Gift Ideas',
    icon: Gift,
    isActive: true,
    comingSoon: true,
  },
  {
    id: 'activities',
    name: 'Activities',
    icon: Calendar,
    isActive: true,
    comingSoon: true,
  },
  {
    id: 'dates',
    name: 'Date Ideas',
    icon: Heart,
    isActive: true,
    comingSoon: true,
  },
]

export default function CategoryLandingPage() {
  const router = useRouter()

  const handleCategoryClick = (category: Category) => {
    if (category.isActive) {
      // Route to the category page
      router.push(`/${category.id}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-primary flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center space-y-2"
        >
          {/* Logo */}
          <h1 className="text-5xl font-outfit font-black leading-[0.9] tracking-tight">
            <motion.div 
              className="gradient-text"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              CHOOSING
            </motion.div>
            <motion.div 
              className="gradient-text"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              SUCKS
            </motion.div>
          </h1>
          
          {/* Subtitle */}
          <motion.p 
            className="text-white/70 text-lg font-semibold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Let's make it simple
          </motion.p>
        </motion.div>

        {/* Category Grid */}
        <motion.div 
          className="grid grid-cols-2 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          {categories.map((category, index) => {
            const IconComponent = category.icon
            
            return (
              <motion.button
                key={category.id}
                onClick={() => handleCategoryClick(category)}
                disabled={false}
                className={`
                  relative overflow-hidden rounded-2xl p-6 aspect-square
                  flex flex-col items-center justify-center gap-3
                  font-bold text-lg transition-all duration-300
                  ${category.comingSoon 
                    ? 'bg-white/10 text-white hover:bg-white/15 cursor-pointer' 
                    : 'bg-gradient-electric text-white shadow-lg hover:scale-105 active:scale-95 cursor-pointer'
                  }
                `}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ 
                  delay: 0.8 + (index * 0.1),
                  type: "spring",
                  stiffness: 300,
                  damping: 20
                }}
                whileHover={category.isActive ? { scale: 1.05 } : {}}
                whileTap={category.isActive ? { scale: 0.95 } : {}}
              >
                {/* Icon */}
                <IconComponent className="h-8 w-8" />
                
                {/* Category Name */}
                <span className="text-center leading-tight">
                  {category.name}
                </span>
                
                {/* Coming Soon Badge */}
                {category.comingSoon && (
                  <div className="absolute top-2 right-2 bg-gradient-orange text-white text-xs px-2 py-1 rounded-full font-bold">
                    Soon
                  </div>
                )}
                
              </motion.button>
            )
          })}
        </motion.div>

        {/* Footer */}
        <motion.div 
          className="text-center space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <p className="text-white/50 text-sm">
            Tap a category to start choosing
          </p>
          <p className="text-white/30 text-xs">
            More categories coming soon
          </p>
        </motion.div>
      </div>
    </div>
  )
}
