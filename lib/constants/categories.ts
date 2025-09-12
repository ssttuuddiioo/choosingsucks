// Future-proof category configuration for all planned features

export type CategoryType = 
  | 'restaurants' 
  | 'streaming' 
  | 'delivery' 
  | 'movies' 
  | 'music' 
  | 'gifts' 
  | 'activities' 
  | 'dates'

export type ContentType = 
  | 'restaurant'
  | 'movie' 
  | 'tv_series'
  | 'delivery_food'
  | 'movie_theater'
  | 'music_song'
  | 'music_artist'
  | 'music_album'
  | 'gift_item'
  | 'activity'
  | 'date_idea'

export interface CategoryConfig {
  id: CategoryType
  name: string
  contentTypes: ContentType[]
  isActive: boolean
  comingSoon?: boolean
  apiSources?: string[]
  defaultPreferences?: Record<string, any>
  features?: {
    hasLocation?: boolean
    hasPricing?: boolean
    hasRating?: boolean
    hasGenres?: boolean
    hasAvailability?: boolean
    requiresAge?: boolean
  }
}

export const CATEGORY_CONFIGS: Record<CategoryType, CategoryConfig> = {
  restaurants: {
    id: 'restaurants',
    name: 'Restaurants',
    contentTypes: ['restaurant'],
    isActive: true,
    apiSources: ['google_places', 'yelp'],
    features: {
      hasLocation: true,
      hasPricing: true,
      hasRating: true,
      hasGenres: true, // cuisines
    },
    defaultPreferences: {
      radius: 2.5,
      priceRange: [1, 2, 3, 4],
      requiresReservations: false
    }
  },
  
  streaming: {
    id: 'streaming',
    name: 'Streaming',
    contentTypes: ['movie', 'tv_series'],
    isActive: true,
    apiSources: ['watchmode'],
    features: {
      hasRating: true,
      hasGenres: true,
      hasAvailability: true, // streaming services
    },
    defaultPreferences: {
      contentTypes: ['movie', 'tv_series'],
      streamingServices: [],
      genres: [],
      sortBy: 'popularity_desc'
    }
  },
  
  delivery: {
    id: 'delivery',
    name: 'Delivery',
    contentTypes: ['delivery_food'],
    isActive: false,
    comingSoon: true,
    apiSources: ['doordash', 'ubereats', 'grubhub'],
    features: {
      hasLocation: true,
      hasPricing: true,
      hasRating: true,
      hasAvailability: true, // delivery time
    },
    defaultPreferences: {
      maxDeliveryTime: 45,
      priceRange: [1, 2, 3, 4],
      deliveryFeeMax: 5
    }
  },
  
  movies: {
    id: 'movies',
    name: 'Movies',
    contentTypes: ['movie_theater'],
    isActive: false,
    comingSoon: true,
    apiSources: ['fandango', 'atom_tickets'],
    features: {
      hasLocation: true,
      hasRating: true,
      hasGenres: true,
      hasAvailability: true, // showtimes
      requiresAge: true
    },
    defaultPreferences: {
      radius: 15,
      maxDistance: 25,
      preferredTimes: ['evening'],
      genres: []
    }
  },
  
  music: {
    id: 'music',
    name: 'Music',
    contentTypes: ['music_song', 'music_artist', 'music_album'],
    isActive: false,
    comingSoon: true,
    apiSources: ['spotify', 'apple_music', 'youtube_music'],
    features: {
      hasRating: true,
      hasGenres: true,
      hasAvailability: true, // streaming availability
    },
    defaultPreferences: {
      contentTypes: ['music_song'],
      genres: [],
      decade: 'all',
      explicit: true
    }
  },
  
  gifts: {
    id: 'gifts',
    name: 'Gift Ideas',
    contentTypes: ['gift_item'],
    isActive: false,
    comingSoon: true,
    apiSources: ['amazon', 'etsy', 'uncommon_goods'],
    features: {
      hasPricing: true,
      hasRating: true,
      hasAvailability: true, // in stock
    },
    defaultPreferences: {
      priceRange: [10, 500],
      occasion: 'general',
      recipient: 'anyone',
      categories: []
    }
  },
  
  activities: {
    id: 'activities',
    name: 'Activities',
    contentTypes: ['activity'],
    isActive: false,
    comingSoon: true,
    apiSources: ['eventbrite', 'meetup', 'yelp'],
    features: {
      hasLocation: true,
      hasPricing: true,
      hasRating: true,
      hasAvailability: true, // event times
    },
    defaultPreferences: {
      radius: 25,
      priceRange: [0, 100],
      timeOfDay: ['morning', 'afternoon', 'evening'],
      indoor: true,
      outdoor: true
    }
  },
  
  dates: {
    id: 'dates',
    name: 'Date Ideas',
    contentTypes: ['date_idea'],
    isActive: false,
    comingSoon: true,
    apiSources: ['yelp', 'eventbrite', 'foursquare'],
    features: {
      hasLocation: true,
      hasPricing: true,
      hasRating: true,
      hasAvailability: true,
    },
    defaultPreferences: {
      radius: 15,
      priceRange: [1, 3],
      vibe: ['romantic', 'fun', 'adventurous'],
      timeOfDay: ['evening']
    }
  }
}

// Helper functions
export const getActiveCategories = (): CategoryConfig[] => {
  return Object.values(CATEGORY_CONFIGS).filter(config => config.isActive)
}

export const getCategoryConfig = (categoryId: CategoryType): CategoryConfig => {
  return CATEGORY_CONFIGS[categoryId]
}

export const getContentTypesForCategory = (categoryId: CategoryType): ContentType[] => {
  return CATEGORY_CONFIGS[categoryId]?.contentTypes || []
}

export const getCategoriesWithFeature = (feature: keyof CategoryConfig['features']): CategoryConfig[] => {
  return Object.values(CATEGORY_CONFIGS).filter(config => config.features?.[feature])
}

// Database migration helpers
export const getAllContentTypes = (): ContentType[] => {
  return Object.values(CATEGORY_CONFIGS)
    .flatMap(config => config.contentTypes)
    .filter((type, index, array) => array.indexOf(type) === index) // unique
}

export const getAllApiSources = (): string[] => {
  return Object.values(CATEGORY_CONFIGS)
    .flatMap(config => config.apiSources || [])
    .filter((source, index, array) => array.indexOf(source) === index) // unique
}
