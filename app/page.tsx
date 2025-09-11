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
    name: 'Delivery',
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
    <div className="min-h-screen bg-gradient-primary flex flex-col items-center justify-center p-4 overflow-hidden">
      <div className="max-w-md md:max-w-3xl lg:max-w-5xl w-full space-y-6 md:space-y-10 flex-shrink-0">
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
          className="grid grid-cols-2 md:grid-cols-4 md:grid-rows-2 gap-4 md:gap-6 lg:gap-8 md:max-w-5xl md:mx-auto"
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
                aria-label={category.comingSoon ? `${category.name} - Coming Soon` : `Start ${category.name} session`}
                className={`
                  relative overflow-hidden rounded-2xl p-6 md:p-8 lg:p-10
                  aspect-square md:aspect-[4/3]
                  flex flex-col items-center justify-center gap-3 md:gap-4
                  font-bold text-lg md:text-xl lg:text-2xl transition-all duration-300
                  focus:outline-none focus:ring-4 focus:ring-electric-purple/50
                  ${category.comingSoon 
                    ? 'bg-white/10 text-white hover:bg-white/15 cursor-pointer' 
                    : 'bg-gradient-electric text-white shadow-lg hover:scale-105 active:scale-95 cursor-pointer'
                  }
                `}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ 
                  delay: 0.8 + (index * 0.05),
                  duration: 0.3,
                  ease: "easeOut"
                }}
              >
                {/* Icon */}
                <IconComponent className="h-8 w-8 md:h-12 md:w-12 lg:h-14 lg:w-14" />
                
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

      </div>
    </div>
  )
}
