'use client'

import { Utensils, Tv, Wrench, Truck } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const TABS = [
  { id: 'restaurants' as const, label: 'Restaurants', icon: Utensils },
  { id: 'streaming' as const, label: 'Streaming', icon: Tv },
  { id: 'build-your-own' as const, label: 'Build Your Own', icon: Wrench },
  { id: 'delivery' as const, label: 'Delivery', icon: Truck, comingSoon: true },
]

interface CategoryTabBarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export default function CategoryTabBar({ activeTab, onTabChange }: CategoryTabBarProps) {
  return (
    <div
      className="flex-shrink-0 bg-white border-t border-warm-gray100"
      style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
    >
      <div className="flex">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 pt-3 pb-2 transition-colors relative",
                isActive ? "text-coral" : "text-warm-gray300 hover:text-warm-gray500"
              )}
            >
              <div className="relative">
                <Icon className="w-6 h-6" />
                {'comingSoon' in tab && tab.comingSoon && (
                  <span className="absolute -top-1.5 -right-3 bg-orange-burst text-white text-[8px] font-bold px-1 py-0.5 rounded-full leading-none">
                    Soon
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium leading-tight">{tab.label}</span>
              {isActive && (
                <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-coral rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
