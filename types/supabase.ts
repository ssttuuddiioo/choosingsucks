export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string
          created_at: string
          status: 'active' | 'matched' | 'closed'
          category: string | null
          place_search_center: any | null // PostGIS geography type
          search_radius_miles: number | null
          radius_m: number | null
          zip_code: string | null
          require_names: boolean
          invite_count_hint: number | null
          match_requirement: 'all' | 'majority'
          allow_multiple_matches: boolean
          match_place_id: string | null
          match_reason: string | null
          preferences: Json
          host_notify_email: string | null
          host_notify_phone: string | null
          ai_enhancement_enabled: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          status?: 'active' | 'matched' | 'closed'
          category?: string | null
          place_search_center?: any | null
          search_radius_miles?: number | null
          radius_m?: number | null
          zip_code?: string | null
          require_names?: boolean
          invite_count_hint?: number | null
          match_requirement?: 'all' | 'majority'
          allow_multiple_matches?: boolean
          match_place_id?: string | null
          match_reason?: string | null
          preferences?: Json
          host_notify_email?: string | null
          host_notify_phone?: string | null
          ai_enhancement_enabled?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          status?: 'active' | 'matched' | 'closed'
          category?: string | null
          place_search_center?: any | null
          search_radius_miles?: number | null
          radius_m?: number | null
          zip_code?: string | null
          require_names?: boolean
          invite_count_hint?: number | null
          match_requirement?: 'all' | 'majority'
          allow_multiple_matches?: boolean
          match_place_id?: string | null
          match_reason?: string | null
          preferences?: Json
          host_notify_email?: string | null
          host_notify_phone?: string | null
          ai_enhancement_enabled?: boolean
        }
      }
      participants: {
        Row: {
          id: string
          session_id: string
          display_name: string | null
          client_fingerprint: string | null
          is_host: boolean
          joined_at: string
          submitted_at: string | null
        }
        Insert: {
          id?: string
          session_id: string
          display_name?: string | null
          client_fingerprint?: string | null
          is_host?: boolean
          joined_at?: string
          submitted_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          display_name?: string | null
          client_fingerprint?: string | null
          is_host?: boolean
          joined_at?: string
          submitted_at?: string | null
        }
      }
      candidates: {
        Row: {
          id: string
          session_id: string
          created_at: string
          category: string | null
          content_type: string
          place_id: string
          external_id: string | null
          name: string
          title: string | null
          original_title: string | null
          description: string | null
          plot_overview: string | null
          year: number | null
          runtime_minutes: number | null
          rating: number | null
          user_rating: number | null
          user_ratings_total: number | null
          critic_score: number | null
          price_level: number | null
          price_range: string | null
          lat: number
          lng: number
          photo_ref: string | null
          poster: string | null
          backdrop: string | null
          image_url: string | null
          trailer: string | null
          url: string | null
          us_rating: string | null
          cuisines: string[] | null
          genre_names: string[] | null
          tags: string[] | null
          sources: Json | null
          availability_info: Json | null
          metadata: Json
          is_active: boolean
        }
        Insert: {
          id?: string
          session_id: string
          created_at?: string
          category?: string | null
          content_type?: string
          place_id: string
          external_id?: string | null
          name: string
          title?: string | null
          original_title?: string | null
          description?: string | null
          plot_overview?: string | null
          year?: number | null
          runtime_minutes?: number | null
          rating?: number | null
          user_rating?: number | null
          user_ratings_total?: number | null
          critic_score?: number | null
          price_level?: number | null
          price_range?: string | null
          lat: number
          lng: number
          photo_ref?: string | null
          poster?: string | null
          backdrop?: string | null
          image_url?: string | null
          trailer?: string | null
          url?: string | null
          us_rating?: string | null
          cuisines?: string[] | null
          genre_names?: string[] | null
          tags?: string[] | null
          sources?: Json | null
          availability_info?: Json | null
          metadata?: Json
          is_active?: boolean
        }
        Update: {
          id?: string
          session_id?: string
          created_at?: string
          category?: string | null
          content_type?: string
          place_id?: string
          external_id?: string | null
          name?: string
          title?: string | null
          original_title?: string | null
          description?: string | null
          plot_overview?: string | null
          year?: number | null
          runtime_minutes?: number | null
          rating?: number | null
          user_rating?: number | null
          user_ratings_total?: number | null
          critic_score?: number | null
          price_level?: number | null
          price_range?: string | null
          lat?: number
          lng?: number
          photo_ref?: string | null
          poster?: string | null
          backdrop?: string | null
          image_url?: string | null
          trailer?: string | null
          url?: string | null
          us_rating?: string | null
          cuisines?: string[] | null
          genre_names?: string[] | null
          tags?: string[] | null
          sources?: Json | null
          availability_info?: Json | null
          metadata?: Json
          is_active?: boolean
        }
      }
      swipes: {
        Row: {
          id: string
          session_id: string
          participant_id: string
          candidate_id: string
          vote: number
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          participant_id: string
          candidate_id: string
          vote: number
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          participant_id?: string
          candidate_id?: string
          vote?: number
          created_at?: string
        }
      }
      rps_games: {
        Row: {
          id: string
          session_id: string
          round_number: number
          status: 'waiting' | 'playing' | 'finished'
          winner_participant_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          round_number?: number
          status?: 'waiting' | 'playing' | 'finished'
          winner_participant_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          round_number?: number
          status?: 'waiting' | 'playing' | 'finished'
          winner_participant_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      rps_moves: {
        Row: {
          id: string
          game_id: string
          participant_id: string
          round_number: number
          move: 'rock' | 'paper' | 'scissors'
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          participant_id: string
          round_number: number
          move: 'rock' | 'paper' | 'scissors'
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          participant_id?: string
          round_number?: number
          move?: 'rock' | 'paper' | 'scissors'
          created_at?: string
        }
      }
      openai_usage: {
        Row: {
          id: string
          created_at: string
          session_id: string | null
          candidate_id: string | null
          purpose: string
          model: string
          input_tokens: number
          output_tokens: number
          total_tokens: number
          input_cost_usd: number
          output_cost_usd: number
          total_cost_usd: number
          response_time_ms: number | null
          success: boolean
          error_message: string | null
          metadata: Json
        }
        Insert: {
          id?: string
          created_at?: string
          session_id?: string | null
          candidate_id?: string | null
          purpose: string
          model: string
          input_tokens: number
          output_tokens: number
          total_tokens: number
          input_cost_usd: number
          output_cost_usd: number
          total_cost_usd: number
          response_time_ms?: number | null
          success?: boolean
          error_message?: string | null
          metadata?: Json
        }
        Update: {
          id?: string
          created_at?: string
          session_id?: string | null
          candidate_id?: string | null
          purpose?: string
          model?: string
          input_tokens?: number
          output_tokens?: number
          total_tokens?: number
          input_cost_usd?: number
          output_cost_usd?: number
          total_cost_usd?: number
          response_time_ms?: number | null
          success?: boolean
          error_message?: string | null
          metadata?: Json
        }
      }
      analytics_global: {
        Row: {
          id: number
          event: string
          zip_code: string | null
          place_id: string | null
          meta: Json
          created_at: string
        }
        Insert: {
          id?: number
          event: string
          zip_code?: string | null
          place_id?: string | null
          meta?: Json
          created_at?: string
        }
        Update: {
          id?: number
          event?: string
          zip_code?: string | null
          place_id?: string | null
          meta?: Json
          created_at?: string
        }
      }
    }
    Functions: {
      get_session_status: {
        Args: { p_session_id: string }
        Returns: {
          session_id: string
          status: 'active' | 'matched' | 'closed'
          category: string
          invited_count: number
          joined_count: number
          submitted_count: number
          total_candidates: number
          remaining_candidates: number
        }[]
      }
      find_session_matches: {
        Args: { p_session_id: string }
        Returns: {
          candidate_id: string
          place_id: string
          name: string
          yes_count: number
          total_participants: number
        }[]
      }
    }
    Enums: {
      session_status: 'active' | 'matched' | 'closed'
    }
  }
}

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
