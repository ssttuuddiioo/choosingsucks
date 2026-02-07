'use client'

import { useState } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import { env } from '@/lib/utils/env'

interface ZipCodeInputProps {
  onLocationFound: (location: { lat: number; lng: number; name: string }) => void
}

export default function ZipCodeInput({ onLocationFound }: ZipCodeInputProps) {
  const [zipCode, setZipCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    const trimmed = zipCode.trim()
    if (!/^\d{5}$/.test(trimmed)) {
      setError('Enter a 5-digit zip code')
      return
    }

    setLoading(true)
    setError('')

    try {
      const apiKey = env.google.mapsApiKey
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${trimmed}&key=${apiKey}`
      )
      const data = await response.json()

      if (data.status === 'OK' && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location
        const name = data.results[0].formatted_address || trimmed
        onLocationFound({ lat, lng, name })
        setZipCode('')
      } else {
        setError('Zip code not found')
      }
    } catch {
      setError('Failed to look up zip code')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center bg-white rounded-xl shadow-md border border-warm-gray100 overflow-hidden">
        <div className="pl-3">
          <MapPin className="w-4 h-4 text-warm-gray300" />
        </div>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={5}
          placeholder="Zip code"
          value={zipCode}
          onChange={(e) => {
            setZipCode(e.target.value.replace(/\D/g, ''))
            setError('')
          }}
          onKeyDown={handleKeyDown}
          className="w-24 px-2 py-2 text-sm text-warm-black placeholder-warm-gray300 focus:outline-none bg-transparent"
        />
        {loading && <Loader2 className="w-4 h-4 text-coral animate-spin mr-2" />}
      </div>
      {error && (
        <span className="text-xs text-coral-dark">{error}</span>
      )}
    </div>
  )
}
