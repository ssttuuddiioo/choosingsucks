'use client'

import { useState } from 'react'
import { X, Search } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils/cn'

const POPULAR_TAGS = {
  Cuisines: [
    'Italian', 'Mexican', 'Chinese', 'Japanese', 'Thai',
    'Indian', 'Mediterranean', 'American', 'Korean', 'Vietnamese',
  ],
  Dietary: [
    'Vegetarian', 'Vegan', 'Gluten-free', 'Halal', 'Kosher',
  ],
  Vibes: [
    'Outdoor seating', 'Pet friendly', 'Late night', 'Brunch',
  ],
}

interface FilterModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  keywords: string[]
  onKeywordsChange: (keywords: string[]) => void
  selectedPriceLevels: number[]
  onPriceLevelsChange: (levels: number[]) => void
}

export default function FilterModal({
  open,
  onOpenChange,
  keywords,
  onKeywordsChange,
  selectedPriceLevels,
  onPriceLevelsChange,
}: FilterModalProps) {
  const [keywordInput, setKeywordInput] = useState('')

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

  const toggleTag = (tag: string) => {
    const lower = tag.toLowerCase()
    if (keywords.includes(lower)) {
      removeKeyword(lower)
    } else {
      onKeywordsChange([...keywords, lower])
    }
  }

  const togglePriceLevel = (level: number) => {
    onPriceLevelsChange(
      selectedPriceLevels.includes(level)
        ? selectedPriceLevels.filter(l => l !== level)
        : [...selectedPriceLevels, level].sort()
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addKeyword(keywordInput)
    }
  }

  const activeFilterCount = keywords.length + selectedPriceLevels.length

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed inset-x-4 top-[10%] bottom-[10%] mx-auto max-w-md bg-warm-cream rounded-2xl shadow-2xl z-[101] flex flex-col overflow-hidden data-[state=open]:animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-warm-gray100">
            <Dialog.Title className="text-lg font-bold text-warm-black">
              Filters
            </Dialog.Title>
            <Dialog.Close className="p-1.5 rounded-full hover:bg-warm-gray100 transition-colors">
              <X className="w-5 h-5 text-warm-gray500" />
            </Dialog.Close>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
            {/* Keyword search */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-warm-gray700">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-gray300" />
                <input
                  type="text"
                  placeholder="Add keyword (sushi, rooftop, etc.)"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={() => {
                    if (keywordInput.trim()) addKeyword(keywordInput)
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-warm-gray200 rounded-xl text-warm-black placeholder-warm-gray300 focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral text-sm"
                />
              </div>

              {/* Active keyword chips */}
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="chip-warm chip-warm-active flex items-center gap-1"
                    >
                      {keyword}
                      <button
                        onClick={() => removeKeyword(keyword)}
                        className="p-0.5 hover:bg-white/20 rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Price range */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-warm-gray700">Price Range</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((level) => (
                  <button
                    key={level}
                    onClick={() => togglePriceLevel(level)}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl font-bold text-base transition-all",
                      selectedPriceLevels.includes(level)
                        ? "bg-coral text-white"
                        : "bg-warm-gray100 text-warm-gray500 hover:bg-warm-gray200"
                    )}
                  >
                    {'$'.repeat(level)}
                  </button>
                ))}
              </div>
            </div>

            {/* Popular tags by category */}
            {Object.entries(POPULAR_TAGS).map(([category, tags]) => (
              <div key={category} className="space-y-2">
                <label className="text-sm font-semibold text-warm-gray700">{category}</label>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "chip-warm",
                        keywords.includes(tag.toLowerCase())
                          ? "chip-warm-active"
                          : "chip-warm-inactive"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-warm-gray100">
            <button
              onClick={() => onOpenChange(false)}
              className="w-full btn-warm text-center"
            >
              Apply Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
