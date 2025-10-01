export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      analytics_global: {
        Row: {
          created_at: string | null
          event: string
          id: number
          meta: Json | null
          place_id: string | null
          zip_code: string | null
        }
        Insert: {
          created_at?: string | null
          event: string
          id?: number
          meta?: Json | null
          place_id?: string | null
          zip_code?: string | null
        }
        Update: {
          created_at?: string | null
          event?: string
          id?: number
          meta?: Json | null
          place_id?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      candidates: {
        Row: {
          availability_info: Json | null
          backdrop: string | null
          category: string | null
          content_type: string
          created_at: string | null
          critic_score: number | null
          cuisines: string[] | null
          description: string | null
          external_id: string | null
          genre_names: string[] | null
          id: string
          image_url: string | null
          is_active: boolean | null
          lat: number
          lng: number
          metadata: Json | null
          name: string
          original_title: string | null
          photo_ref: string | null
          place_id: string
          plot_overview: string | null
          poster: string | null
          price_level: number | null
          price_range: string | null
          rating: number | null
          runtime_minutes: number | null
          session_id: string
          sources: Json | null
          tags: string[] | null
          title: string | null
          trailer: string | null
          url: string | null
          us_rating: string | null
          user_rating: number | null
          user_ratings_total: number | null
          year: number | null
        }
        Insert: {
          availability_info?: Json | null
          backdrop?: string | null
          category?: string | null
          content_type?: string
          created_at?: string | null
          critic_score?: number | null
          cuisines?: string[] | null
          description?: string | null
          external_id?: string | null
          genre_names?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          lat: number
          lng: number
          metadata?: Json | null
          name: string
          original_title?: string | null
          photo_ref?: string | null
          place_id: string
          plot_overview?: string | null
          poster?: string | null
          price_level?: number | null
          price_range?: string | null
          rating?: number | null
          runtime_minutes?: number | null
          session_id: string
          sources?: Json | null
          tags?: string[] | null
          title?: string | null
          trailer?: string | null
          url?: string | null
          us_rating?: string | null
          user_rating?: number | null
          user_ratings_total?: number | null
          year?: number | null
        }
        Update: {
          availability_info?: Json | null
          backdrop?: string | null
          category?: string | null
          content_type?: string
          created_at?: string | null
          critic_score?: number | null
          cuisines?: string[] | null
          description?: string | null
          external_id?: string | null
          genre_names?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          lat?: number
          lng?: number
          metadata?: Json | null
          name?: string
          original_title?: string | null
          photo_ref?: string | null
          place_id?: string
          plot_overview?: string | null
          poster?: string | null
          price_level?: number | null
          price_range?: string | null
          rating?: number | null
          runtime_minutes?: number | null
          session_id?: string
          sources?: Json | null
          tags?: string[] | null
          title?: string | null
          trailer?: string | null
          url?: string | null
          us_rating?: string | null
          user_rating?: number | null
          user_ratings_total?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          client_fingerprint: string | null
          display_name: string | null
          id: string
          is_host: boolean | null
          joined_at: string | null
          session_id: string
          submitted_at: string | null
        }
        Insert: {
          client_fingerprint?: string | null
          display_name?: string | null
          id?: string
          is_host?: boolean | null
          joined_at?: string | null
          session_id: string
          submitted_at?: string | null
        }
        Update: {
          client_fingerprint?: string | null
          display_name?: string | null
          id?: string
          is_host?: boolean | null
          joined_at?: string | null
          session_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          ai_enhancement_enabled: boolean | null
          allow_multiple_matches: boolean | null
          category: string | null
          created_at: string | null
          host_notify_email: string | null
          host_notify_phone: string | null
          id: string
          invite_count_hint: number | null
          match_place_id: string | null
          match_reason: string | null
          match_requirement: string | null
          place_search_center: unknown | null
          preferences: Json | null
          radius_m: number | null
          require_names: boolean | null
          search_radius_miles: number | null
          status: Database["public"]["Enums"]["session_status"] | null
          zip_code: string | null
        }
        Insert: {
          ai_enhancement_enabled?: boolean | null
          allow_multiple_matches?: boolean | null
          category?: string | null
          created_at?: string | null
          host_notify_email?: string | null
          host_notify_phone?: string | null
          id?: string
          invite_count_hint?: number | null
          match_place_id?: string | null
          match_reason?: string | null
          match_requirement?: string | null
          place_search_center?: unknown | null
          preferences?: Json | null
          radius_m?: number | null
          require_names?: boolean | null
          search_radius_miles?: number | null
          status?: Database["public"]["Enums"]["session_status"] | null
          zip_code?: string | null
        }
        Update: {
          ai_enhancement_enabled?: boolean | null
          allow_multiple_matches?: boolean | null
          category?: string | null
          created_at?: string | null
          host_notify_email?: string | null
          host_notify_phone?: string | null
          id?: string
          invite_count_hint?: number | null
          match_place_id?: string | null
          match_reason?: string | null
          match_requirement?: string | null
          place_search_center?: unknown | null
          preferences?: Json | null
          radius_m?: number | null
          require_names?: boolean | null
          search_radius_miles?: number | null
          status?: Database["public"]["Enums"]["session_status"] | null
          zip_code?: string | null
        }
        Relationships: []
      }
      swipes: {
        Row: {
          candidate_id: string
          created_at: string | null
          id: string
          participant_id: string
          session_id: string
          vote: number
        }
        Insert: {
          candidate_id: string
          created_at?: string | null
          id?: string
          participant_id: string
          session_id: string
          vote: number
        }
        Update: {
          candidate_id?: string
          created_at?: string | null
          id?: string
          participant_id?: string
          session_id?: string
          vote?: number
        }
        Relationships: [
          {
            foreignKeyName: "swipes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swipes_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swipes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      rps_games: {
        Row: {
          created_at: string
          id: string
          round_number: number
          session_id: string
          status: string
          updated_at: string
          winner_participant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          round_number?: number
          session_id: string
          status?: string
          updated_at?: string
          winner_participant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          round_number?: number
          session_id?: string
          status?: string
          updated_at?: string
          winner_participant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rps_games_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rps_games_winner_participant_id_fkey"
            columns: ["winner_participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      rps_moves: {
        Row: {
          created_at: string
          game_id: string
          id: string
          move: string
          participant_id: string
          round_number: number
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          move: string
          participant_id: string
          round_number: number
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          move?: string
          participant_id?: string
          round_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "rps_moves_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "rps_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rps_moves_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      find_session_matches: {
        Args: { p_session_id: string }
        Returns: {
          candidate_id: string
          name: string
          place_id: string
          total_participants: number
          yes_count: number
        }[]
      }
      get_session_status: {
        Args: { p_session_id: string }
        Returns: {
          category: string
          invited_count: number
          joined_count: number
          remaining_candidates: number
          session_id: string
          status: string
          submitted_count: number
          total_candidates: number
        }[]
      }
    }
    Enums: {
      session_status: "active" | "matched" | "closed"
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never
