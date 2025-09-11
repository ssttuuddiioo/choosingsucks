export interface StreamingService {
  id: number
  name: string
  logo?: string
}

export interface Genre {
  id: number
  name: string
}

// Major streaming services supported by Watchmode API
export const STREAMING_SERVICES: StreamingService[] = [
  { id: 203, name: 'Netflix' },
  { id: 157, name: 'Hulu' },
  { id: 390, name: 'Disney+' },
  { id: 26, name: 'Amazon Prime' },
  { id: 387, name: 'HBO Max' },
  { id: 444, name: 'Paramount+' },
  { id: 371, name: 'Apple TV+' },
  { id: 73, name: 'Peacock' },
  { id: 279, name: 'Crunchyroll' },
  { id: 372, name: 'Starz' },
  { id: 43, name: 'Showtime' },
  { id: 78, name: 'Tubi' },
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

export type ContentType = 'movie' | 'tv_series' | 'both'

export interface StreamingPreferences {
  contentType: ContentType
  streamingServices: number[]
  genres: number[]
  useAllServices: boolean
}

export const DEFAULT_PREFERENCES: StreamingPreferences = {
  contentType: 'both',
  streamingServices: [],
  genres: [],
  useAllServices: true,
}
