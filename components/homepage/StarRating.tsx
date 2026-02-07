'use client'

import { useCallback, useRef } from 'react'

interface StarRatingProps {
  value: number
  onChange: (rating: number) => void
  size?: number
}

export default function StarRating({ value, onChange, size = 32 }: StarRatingProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const handleStarClick = useCallback((e: React.MouseEvent<HTMLButtonElement>, starIndex: number) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const isLeftHalf = clickX < rect.width / 2

    const newValue = isLeftHalf ? starIndex + 0.5 : starIndex + 1

    // Toggle off if tapping the same value
    onChange(newValue === value ? 0 : newValue)
  }, [value, onChange])

  return (
    <div ref={containerRef} className="flex items-center gap-0.5">
      {[0, 1, 2, 3, 4].map((starIndex) => {
        const fillLevel = Math.min(1, Math.max(0, value - starIndex))

        return (
          <button
            key={starIndex}
            type="button"
            onClick={(e) => handleStarClick(e, starIndex)}
            className="relative cursor-pointer p-0.5 focus:outline-none"
            style={{ width: size, height: size }}
            aria-label={`Rate ${starIndex + 1} stars`}
          >
            {/* Empty star (background) */}
            <svg viewBox="0 0 24 24" className="w-full h-full">
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill="#D4D4CF"
                stroke="none"
              />
            </svg>

            {/* Filled star (overlay) */}
            {fillLevel > 0 && (
              <svg
                viewBox="0 0 24 24"
                className="absolute inset-0 w-full h-full p-0.5"
                style={{
                  clipPath: fillLevel >= 1
                    ? 'none'
                    : 'inset(0 50% 0 0)',
                }}
              >
                <path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  fill="#E07A5F"
                  stroke="none"
                />
              </svg>
            )}
          </button>
        )
      })}

      {value > 0 && (
        <span className="ml-1.5 text-sm font-semibold text-warm-gray700 tabular-nums">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  )
}
