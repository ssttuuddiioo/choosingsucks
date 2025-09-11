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
      className="bg-white/10 rounded-2xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="mb-4">
        <h2 className="text-white text-xl font-bold">Streaming Services</h2>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {STREAMING_SERVICES.map((service, index) => (
          <motion.button
            key={service.id}
            onClick={() => toggleService(service.id)}
            className={`
              p-4 rounded-xl transition-all duration-300 transform
              flex flex-col items-center justify-center gap-2
              min-h-[80px] font-bold text-sm cursor-pointer
              ${selectedServices.includes(service.id)
                ? 'bg-gradient-electric text-white shadow-lg' 
                : 'bg-white/20 text-white hover:bg-white/30'
              }
              hover:scale-102
            `}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + (index * 0.05) }}
          >
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-xs">
              {service.name.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-center leading-tight">{service.name}</span>
          </motion.button>
        ))}
      </div>
      
      {selectedServices.length === 0 && (
        <p className="text-white/60 text-sm mt-4 text-center">
          Select at least one streaming service
        </p>
      )}
    </motion.div>
  )
}
