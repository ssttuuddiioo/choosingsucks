import { useState, useEffect } from 'react'

interface GeolocationState {
  loading: boolean
  error: string | null
  coordinates: { lat: number; lng: number } | null
  zipCode: string | null
}

interface GeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
}

export function useGeolocation(options: GeolocationOptions = {}) {
  const [state, setState] = useState<GeolocationState>({
    loading: false,
    error: null,
    coordinates: null,
    zipCode: null
  })

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by this browser'
      }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000, // 5 minutes
      ...options
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, defaultOptions)
      })

      const coordinates = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }

      setState(prev => ({ ...prev, coordinates }))

      // Get ZIP code from coordinates
      try {
        const response = await fetch('/api/reverse-geocode', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(coordinates),
        })

        if (response.ok) {
          const data = await response.json()
          setState(prev => ({
            ...prev,
            zipCode: data.zipCode,
            loading: false
          }))
        } else {
          throw new Error('Failed to get ZIP code')
        }
      } catch (zipError) {
        console.error('ZIP code lookup failed:', zipError)
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Could not determine ZIP code from location'
        }))
      }
    } catch (error) {
      let errorMessage = 'Failed to get location'
      
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out'
            break
        }
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
    }
  }

  const reset = () => {
    setState({
      loading: false,
      error: null,
      coordinates: null,
      zipCode: null
    })
  }

  return {
    ...state,
    getCurrentLocation,
    reset
  }
}
