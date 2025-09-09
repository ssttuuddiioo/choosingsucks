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

// Format ZIP code
export function formatZipCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, 5)
}

// Validate ZIP code
export function isValidZipCode(zip: string): boolean {
  return /^\d{5}$/.test(zip)
}


