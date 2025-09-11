import { nanoid } from 'nanoid'

// Generate a short, URL-safe token
export function generateShareToken(): string {
  return nanoid(8)
}

// Generate a participant token
export function generateParticipantToken(): string {
  return nanoid(16)
}

// Get or create a client fingerprint
export function getClientFingerprint(): string {
  if (typeof window === 'undefined') return ''
  
  const key = 'foonder_client_id'
  let fingerprint = localStorage.getItem(key)
  
  if (!fingerprint) {
    fingerprint = nanoid(24)
    localStorage.setItem(key, fingerprint)
  }
  
  return fingerprint
}

// Store participant token
export function storeParticipantToken(sessionId: string, token: string): void {
  if (typeof window === 'undefined') return
  
  const key = `foonder_participant_${sessionId}`
  localStorage.setItem(key, token)
  
  // Also set as cookie for SSR
  document.cookie = `${key}=${token}; path=/; max-age=86400; samesite=lax`
}

// Get participant token
export function getParticipantToken(sessionId: string): string | null {
  if (typeof window === 'undefined') return null
  
  const key = `foonder_participant_${sessionId}`
  return localStorage.getItem(key)
}

// Location utilities for coordinate-based sessions
export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
}

export function isValidCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}


