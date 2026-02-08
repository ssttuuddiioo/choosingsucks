'use client'

import { Compass, MessageCircle, Star, User } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const TABS = [
  { id: 'discover' as const, label: 'Discover', icon: Compass },
  { id: 'chat' as const, label: 'Chat', icon: MessageCircle },
  { id: 'reviews' as const, label: 'Reviews', icon: Star },
  { id: 'profile' as const, label: 'Profile', icon: User },
]

export type MoreTab = (typeof TABS)[number]['id']

interface MoreBottomNavProps {
  activeTab: MoreTab
  onTabChange: (tab: MoreTab) => void
}

export default function MoreBottomNav({ activeTab, onTabChange }: MoreBottomNavProps) {
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
                'flex-1 flex flex-col items-center gap-1 pt-3 pb-2 transition-colors relative',
                isActive ? 'text-coral' : 'text-warm-gray300 hover:text-warm-gray500'
              )}
            >
              <Icon className="w-6 h-6" />
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
