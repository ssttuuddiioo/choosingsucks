'use client'

import { useState, useEffect } from 'react'

export type LocationState = 
  | 'loading'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'manual'

interface LocationData {
  coordinates: { lat: number; lng: number }
  name: string
}

interface UseLocationPermissionReturn {
  state: LocationState
  location: LocationData | null
  error: string | null
  requestLocation: () => void
  setManualLocation: (location: LocationData) => void
}

export function useLocationPermission(): UseLocationPermissionReturn {
  const [state, setState] = useState<LocationState>('loading')
  const [location, setLocation] = useState<LocationData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const requestLocation = async () => {
    if (!navigator.geolocation) {
      setState('unavailable')
      setError('Geolocation is not supported by this browser')
      return
    }

    setState('loading')
    setError(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000, // 5 minutes
          }
        )
      })

      const coordinates = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }

      // Try to get a readable location name
      try {
        const response = await fetch('/api/reverse-geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(coordinates),
        })

        let locationName = 'Current Location'
        if (response.ok) {
          const data = await response.json()
          locationName = data.city || data.zipCode || 'Current Location'
        }

        setLocation({
          coordinates,
          name: locationName
        })
        setState('granted')
      } catch (reverseGeocodeError) {
        // Even if reverse geocoding fails, we still have coordinates
        setLocation({
          coordinates,
          name: 'Current Location'
        })
        setState('granted')
      }
    } catch (error) {
      let errorMessage = 'Failed to get location'
      
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied'
            setState('denied')
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable'
            setState('unavailable')
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out'
            setState('denied')
            break
        }
      } else {
        setState('denied')
      }

      setError(errorMessage)
    }
  }

  const setManualLocation = (locationData: LocationData) => {
    setLocation(locationData)
    setState('manual')
    setError(null)
  }

  // Auto-request location on mount
  useEffect(() => {
    requestLocation()
  }, [])

  return {
    state,
    location,
    error,
    requestLocation,
    setManualLocation
  }
}
