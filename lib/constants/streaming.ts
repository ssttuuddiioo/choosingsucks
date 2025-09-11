export interface StreamingService {
  id: number
  name: string
  logo: string
  backgroundColor: string
}

export interface Genre {
  id: number
  name: string
}

// Major streaming services supported by Watchmode API
export const STREAMING_SERVICES: StreamingService[] = [
  { id: 203, name: 'Netflix', logo: '/streaming/Netflix_Large.png', backgroundColor: '#000000' },
  { id: 157, name: 'Hulu', logo: '/streaming/hulu.webp', backgroundColor: '#1CE783' },
  { id: 390, name: 'Disney+', logo: '/streaming/disney+.png', backgroundColor: '#113CCF' },
  { id: 26, name: 'Amazon Prime', logo: '/streaming/prime video.png', backgroundColor: '#00A8E1' },
  { id: 387, name: 'HBO Max', logo: '/streaming/hbo max.png', backgroundColor: '#000000' },
  { id: 444, name: 'Paramount+', logo: '/streaming/paramoung plus.png', backgroundColor: '#0064FF' },
  { id: 371, name: 'Apple TV+', logo: '/streaming/apple tv plus.png', backgroundColor: '#000000' },
  { id: 73, name: 'Peacock', logo: '/streaming/peacock.svg', backgroundColor: '#000000' },
  { id: 279, name: 'Crunchyroll', logo: '/streaming/Crunchyroll_logo_2012v.png', backgroundColor: '#FF6500' },
  { id: 372, name: 'Starz', logo: '/streaming/starz.png', backgroundColor: '#000000' },
  { id: 43, name: 'Showtime', logo: '/streaming/showtime.png', backgroundColor: '#FF0000' },
  { id: 78, name: 'Tubi', logo: '/streaming/tubi logo.png', backgroundColor: '#FFE500' },
]

// Content genres (using Watchmode API genre IDs)
export const GENRES: Genre[] = [
  { id: 1, name: 'Action' },
  { id: 2, name: 'Adventure' },
  { id: 3, name: 'Animation' },
  { id: 4, name: 'Comedy' },
  { id: 5, name: 'Crime' },
  { id: 6, name: 'Documentary' },
  { id: 7, name: 'Drama' },
  { id: 8, name: 'Family' },
  { id: 9, name: 'Fantasy' },
  { id: 11, name: 'Horror' },
  { id: 13, name: 'Mystery' },
  { id: 14, name: 'Romance' },
  { id: 15, name: 'Science Fiction' },
  { id: 17, name: 'Thriller' },
  { id: 18, name: 'War' },
  { id: 19, name: 'Western' },
]

export type SortPreference = 'new_releases' | 'most_popular'

export interface StreamingPreferences {
  contentTypes: ('movie' | 'tv_series')[]
  streamingServices: number[]
  genres: number[]
  sortBy: SortPreference
}

export const DEFAULT_PREFERENCES: StreamingPreferences = {
  contentTypes: ['movie', 'tv_series'], // Both selected by default
  streamingServices: [203, 157, 390, 26, 387, 444, 371, 73], // Major services selected by default
  genres: [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 13, 14, 15, 17, 18, 19], // All genres selected by default
  sortBy: 'new_releases', // Default to new releases
}
