const WATCHMODE_BASE_URL = 'https://api.watchmode.com/v1'

export interface WatchmodeTitle {
  id: number
  title: string
  original_title: string
  plot_overview: string
  type: 'movie' | 'tv_series' | 'tv_miniseries' | 'tv_special'
  runtime_minutes?: number
  year: number
  end_year?: number
  release_date: string
  imdb_id: string
  tmdb_id: number
  tmdb_type: string
  genre_names: string[]
  user_rating: number
  critic_score?: number
  us_rating?: string
  poster: string
  posterLarge?: string
  backdrop: string
  trailer?: string
  original_language: string
  similar_titles: number[]
  networks?: string[]
  sources: WatchmodeSource[]
}

export interface WatchmodeSource {
  source_id: number
  name: string
  type: 'sub' | 'buy' | 'rent' | 'free'
  region: string
  ios_url?: string
  android_url?: string
  web_url: string
  format: '4K' | 'HD' | 'SD'
  price?: number
  seasons?: number
  episodes?: number
}

export interface WatchmodeListResponse {
  titles: WatchmodeTitle[]
  total_results: number
  total_pages: number
}

export class WatchmodeClient {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async searchTitles(params: {
    types?: string // 'movie,tv_series' or specific type
    source_ids?: string // comma-separated source IDs
    genres?: string // comma-separated genre names
    sort_by?: 'popularity_desc' | 'rating_desc' | 'release_date_desc' | 'title_asc'
    limit?: number
    page?: number
  }): Promise<WatchmodeListResponse> {
    const searchParams = new URLSearchParams({
      apiKey: this.apiKey,
      sort_by: params.sort_by || 'popularity_desc',
      limit: (params.limit || 20).toString(),
      page: (params.page || 1).toString(),
    })

    if (params.types) {
      searchParams.append('types', params.types)
    }

    if (params.source_ids) {
      searchParams.append('source_ids', params.source_ids)
    }

    if (params.genres) {
      searchParams.append('genres', params.genres)
    }

    const url = `${WATCHMODE_BASE_URL}/list-titles/?${searchParams}`
    
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Watchmode API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Watchmode API error:', error)
      throw error
    }
  }

  async getTitleDetails(titleId: number): Promise<WatchmodeTitle> {
    const url = `${WATCHMODE_BASE_URL}/title/${titleId}/details/?apiKey=${this.apiKey}`
    
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Watchmode API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Watchmode API error:', error)
      throw error
    }
  }

  async getSources(): Promise<any[]> {
    const url = `${WATCHMODE_BASE_URL}/sources/?apiKey=${this.apiKey}`
    
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Watchmode API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Watchmode API error:', error)
      throw error
    }
  }
}
