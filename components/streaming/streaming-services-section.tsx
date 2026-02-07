'use client'

import { motion } from 'framer-motion'
import { STREAMING_SERVICES } from '@/lib/constants/streaming'

interface StreamingServicesSectionProps {
  selectedServices: number[]
  onServicesChange: (services: number[]) => void
}

export default function StreamingServicesSection({
  selectedServices,
  onServicesChange
}: StreamingServicesSectionProps) {
  
  const toggleService = (serviceId: number) => {
    if (selectedServices.includes(serviceId)) {
      // Don't allow removing if it's the only one selected
      if (selectedServices.length > 1) {
        onServicesChange(selectedServices.filter(id => id !== serviceId))
      }
    } else {
      onServicesChange([...selectedServices, serviceId])
    }
  }

  return (
    <motion.div 
      className="space-y-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {STREAMING_SERVICES.map((service, index) => (
          <motion.button
            key={service.id}
            onClick={() => toggleService(service.id)}
            className={`
              p-6 rounded-xl transition-all duration-300 transform
              flex items-center justify-center
              min-h-[100px] cursor-pointer
              ${selectedServices.includes(service.id)
                ? 'ring-4 ring-coral/40 shadow-lg bg-white'
                : 'hover:ring-2 hover:ring-warm-gray200 bg-warm-gray100 filter grayscale opacity-50'
              }
              hover:scale-102
            `}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + (index * 0.05) }}
          >
            <img 
              src={service.logo} 
              alt={service.name}
              className={`object-contain transition-all duration-300 ${
                ['Disney+', 'Amazon Prime'].includes(service.name)
                  ? 'h-16' // Larger for Disney+ and Prime Video
                  : 'h-12' // Standard height for others
              }`}
              style={{ maxWidth: '80px' }}
              onError={(e) => {
                // Fallback to text if logo fails to load
                e.currentTarget.style.display = 'none'
                const parent = e.currentTarget.parentElement!
                parent.innerHTML = `<span class="text-gray-900 font-bold text-sm">${service.name}</span>`
              }}
            />
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}
