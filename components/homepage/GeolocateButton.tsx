'use client'

import { LocateFixed, Loader2 } from 'lucide-react'

interface GeolocateButtonProps {
  onClick: () => void
  loading?: boolean
}

export default function GeolocateButton({ onClick, loading }: GeolocateButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-10 h-10 bg-white rounded-full shadow-md border border-warm-gray100 flex items-center justify-center hover:bg-warm-gray100 transition-colors disabled:opacity-50"
      aria-label="Use my current location"
    >
      {loading ? (
        <Loader2 className="w-5 h-5 text-coral animate-spin" />
      ) : (
        <LocateFixed className="w-5 h-5 text-warm-gray700" />
      )}
    </button>
  )
}
