'use client'

import { motion } from 'framer-motion'
import { STREAMING_SERVICES } from '@/lib/constants/streaming'

interface StreamingServicesSectionProps {
  selectedServices: number[]
  useAllServices: boolean
  onServicesChange: (services: number[]) => void
  onAllServicesToggle: (useAll: boolean) => void
}

export default function StreamingServicesSection({
  selectedServices,
  useAllServices,
  onServicesChange,
  onAllServicesToggle
}: StreamingServicesSectionProps) {
  
  const toggleService = (serviceId: number) => {
    if (useAllServices) return // Can't select individual services when "ALL" is active
    
    if (selectedServices.includes(serviceId)) {
      onServicesChange(selectedServices.filter(id => id !== serviceId))
    } else {
      onServicesChange([...selectedServices, serviceId])
    }
  }

  const handleAllToggle = () => {
    const newUseAll = !useAllServices
    onAllServicesToggle(newUseAll)
    
    if (newUseAll) {
      // When enabling "ALL", clear individual selections
      onServicesChange([])
    }
  }

  return (
    <motion.div 
      className="bg-white/10 rounded-2xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-white text-xl font-bold">Streaming Services</h2>
        <button 
          onClick={handleAllToggle}
          className={`
            px-4 py-2 rounded-full font-bold transition-all duration-300 transform
            ${useAllServices 
              ? 'bg-gradient-electric text-white shadow-lg scale-105' 
              : 'bg-white/20 text-white hover:bg-white/30 hover:scale-102'
            }
          `}
        >
          ALL SERVICES
        </button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {STREAMING_SERVICES.map((service, index) => (
          <motion.button
            key={service.id}
            onClick={() => toggleService(service.id)}
            disabled={useAllServices}
            className={`
              p-4 rounded-xl transition-all duration-300 transform
              flex flex-col items-center justify-center gap-2
              min-h-[80px] font-bold text-sm
              ${(selectedServices.includes(service.id) || useAllServices)
                ? 'bg-gradient-electric text-white shadow-lg' 
                : 'bg-white/20 text-white hover:bg-white/30'
              }
              ${useAllServices ? 'opacity-75' : 'hover:scale-102'}
              ${useAllServices ? 'cursor-default' : 'cursor-pointer'}
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
      
      {!useAllServices && selectedServices.length === 0 && (
        <p className="text-white/60 text-sm mt-4 text-center">
          Select streaming services or choose "ALL SERVICES" above
        </p>
      )}
    </motion.div>
  )
}
