'use client'

import { useState } from 'react'
import { Filter, X } from 'lucide-react'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { cn } from '@/lib/utils/cn'
import { env } from '@/lib/utils/env'

interface DetailsDrawerProps {
  selectedPriceLevels: number[]
  onPriceLevelsChange: (levels: number[]) => void
  keywords: string[]
  onKeywordsChange: (keywords: string[]) => void
  requireNames: boolean
  onRequireNamesChange: (require: boolean) => void
  matchRequirement: 'all' | 'majority'
  onMatchRequirementChange: (requirement: 'all' | 'majority') => void
  multipleMatches: boolean
  onMultipleMatchesChange: (multiple: boolean) => void
  inviteCount: string
  onInviteCountChange: (count: string) => void
  customCount: string
  onCustomCountChange: (count: string) => void
  showCustomInput: boolean
  onShowCustomInputChange: (show: boolean) => void
}

export default function DetailsDrawer({
  selectedPriceLevels,
  onPriceLevelsChange,
  keywords,
  onKeywordsChange,
  requireNames,
  onRequireNamesChange,
  matchRequirement,
  onMatchRequirementChange,
  multipleMatches,
  onMultipleMatchesChange,
  inviteCount,
  onInviteCountChange,
  customCount,
  onCustomCountChange,
  showCustomInput,
  onShowCustomInputChange,
}: DetailsDrawerProps) {
  const [open, setOpen] = useState(false)
  const [keywordInput, setKeywordInput] = useState('')

  const togglePriceLevel = (level: number) => {
    onPriceLevelsChange(
      selectedPriceLevels.includes(level)
        ? selectedPriceLevels.filter(l => l !== level)
        : [...selectedPriceLevels, level].sort()
    )
  }

  const addKeyword = (keyword: string) => {
    const trimmed = keyword.trim().toLowerCase()
    if (trimmed && !keywords.includes(trimmed)) {
      onKeywordsChange([...keywords, trimmed])
    }
    setKeywordInput('')
  }

  const removeKeyword = (keyword: string) => {
    onKeywordsChange(keywords.filter(k => k !== keyword))
  }

  const handleKeywordKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addKeyword(keywordInput)
    }
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button className="flex items-center gap-2 px-4 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors">
          <Filter className="h-5 w-5" />
          Filters
        </button>
      </DrawerTrigger>
      
      <DrawerContent className="bg-gradient-primary border-white/20">
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader className="pb-4">
          </DrawerHeader>
          
          <div className="p-4 pb-0 space-y-6">
            {/* Price Range */}
            <div className="space-y-3">
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((level) => (
                  <button
                    key={level}
                    onClick={() => togglePriceLevel(level)}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-bold text-xl transition-all",
                      selectedPriceLevels.includes(level)
                        ? "bg-gradient-pink text-white shadow-lg"
                        : "bg-white/10 text-white/70 hover:bg-white/20"
                    )}
                  >
                    {'$'.repeat(level)}
                  </button>
                ))}
              </div>
            </div>


            {/* Keywords Filter */}
            <div className="space-y-3">
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Add keywords (sushi, gluten-free, etc.)"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={handleKeywordKeyPress}
                  onBlur={() => {
                    if (keywordInput.trim()) {
                      addKeyword(keywordInput)
                    }
                  }}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-electric-purple/50 focus:border-transparent"
                />
                
                {/* Keywords Tags */}
                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword) => (
                      <div
                        key={keyword}
                        className="flex items-center gap-1 px-3 py-1 bg-gradient-pink text-white text-sm rounded-full"
                      >
                        <span>{keyword}</span>
                        <button
                          onClick={() => removeKeyword(keyword)}
                          className="p-0.5 hover:bg-white/20 rounded-full transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Multi-person options - only show if feature flag is enabled */}
            {env.features.multiPersonSessions && (
              <>
                {/* How Many People */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">How many people?</h3>
                  <div className="flex gap-2">
                    {[2, 3, 4, 5, 6].map((count) => (
                      <button
                        key={count}
                        onClick={() => {
                          onInviteCountChange(count.toString())
                          onShowCustomInputChange(false)
                          onCustomCountChange('')
                        }}
                        className={cn(
                          "flex-1 py-3 rounded-xl font-bold text-lg transition-all",
                          inviteCount === count.toString()
                            ? "bg-gradient-pink text-white shadow-lg"
                            : "bg-white/10 text-white/70 hover:bg-white/20"
                        )}
                      >
                        {count}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        onShowCustomInputChange(true)
                        onInviteCountChange('')
                      }}
                      className={cn(
                        "flex-1 py-3 rounded-xl font-bold text-lg transition-all",
                        showCustomInput
                          ? "bg-gradient-pink text-white shadow-lg"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      )}
                    >
                      7+
                    </button>
                  </div>
                  
                  {/* Custom Count Input */}
                  {showCustomInput && (
                    <input
                      type="number"
                      min="2"
                      max="20"
                      placeholder="Enter number (2-20)"
                      value={customCount}
                      onChange={(e) => {
                        const value = e.target.value
                        onCustomCountChange(value)
                        if (value && parseInt(value) >= 2 && parseInt(value) <= 20) {
                          onInviteCountChange(value)
                        }
                      }}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-electric-purple/50 focus:border-transparent text-center"
                    />
                  )}
                </div>

                {/* Require Names */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">Require names?</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onRequireNamesChange(false)}
                      className={cn(
                        "flex-1 py-3 px-4 rounded-xl font-semibold transition-all",
                        !requireNames
                          ? "bg-gradient-pink text-white shadow-lg"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      )}
                    >
                      No
                    </button>
                    <button
                      onClick={() => onRequireNamesChange(true)}
                      className={cn(
                        "flex-1 py-3 px-4 rounded-xl font-semibold transition-all",
                        requireNames
                          ? "bg-gradient-pink text-white shadow-lg"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      )}
                    >
                      Yes
                    </button>
                  </div>
                </div>

                {/* Match Requirement */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">Matches Required</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onMatchRequirementChange('all')}
                      className={cn(
                        "flex-1 py-3 px-4 rounded-xl font-semibold transition-all",
                        matchRequirement === 'all'
                          ? "bg-gradient-pink text-white shadow-lg"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      )}
                    >
                      100%
                    </button>
                    <button
                      onClick={() => onMatchRequirementChange('majority')}
                      className={cn(
                        "flex-1 py-3 px-4 rounded-xl font-semibold transition-all",
                        matchRequirement === 'majority'
                          ? "bg-gradient-pink text-white shadow-lg"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      )}
                    >
                      50%
                    </button>
                  </div>
                </div>

                {/* Number of Matches */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white"># of matches</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onMultipleMatchesChange(false)}
                      className={cn(
                        "flex-1 py-3 px-4 rounded-xl font-semibold transition-all",
                        !multipleMatches
                          ? "bg-gradient-pink text-white shadow-lg"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      )}
                    >
                      First match
                    </button>
                    <button
                      onClick={() => onMultipleMatchesChange(true)}
                      className={cn(
                        "flex-1 py-3 px-4 rounded-xl font-semibold transition-all",
                        multipleMatches
                          ? "bg-gradient-pink text-white shadow-lg"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      )}
                    >
                      All matches
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <DrawerFooter>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
