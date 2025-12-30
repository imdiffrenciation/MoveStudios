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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      badge_settings: {
        Row: {
          badge_amount: number
          id: string
          updated_at: string
        }
        Insert: {
          badge_amount?: number
          id?: string
          updated_at?: string
        }
        Update: {
          badge_amount?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          badge_type: string
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          issued_at: string
          source: string
          transaction_hash: string | null
          user_id: string
        }
        Insert: {
          badge_type?: string
          created_at?: string
          expires_at: string
          id?: string
          is_active?: boolean
          issued_at?: string
          source?: string
          transaction_hash?: string | null
          user_id: string
        }
        Update: {
          badge_type?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          issued_at?: string
          source?: string
          transaction_hash?: string | null
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          media_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          media_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          media_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_preferences: {
        Row: {
          creator_id: string
          id: string
          score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          creator_id: string
          id?: string
          score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          creator_id?: string
          id?: string
          score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          id: string
          media_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          media_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          comments_count: number | null
          content_hash: string | null
          created_at: string
          description: string | null
          engagement_score: number | null
          id: string
          is_protected: boolean | null
          likes_count: number | null
          quality_score: number | null
          tags: string[] | null
          title: string
          type: string
          url: string
          user_id: string
          views_count: number | null
          viral_score: number | null
        }
        Insert: {
          comments_count?: number | null
          content_hash?: string | null
          created_at?: string
          description?: string | null
          engagement_score?: number | null
          id?: string
          is_protected?: boolean | null
          likes_count?: number | null
          quality_score?: number | null
          tags?: string[] | null
          title: string
          type: string
          url: string
          user_id: string
          views_count?: number | null
          viral_score?: number | null
        }
        Update: {
          comments_count?: number | null
          content_hash?: string | null
          created_at?: string
          description?: string | null
          engagement_score?: number | null
          id?: string
          is_protected?: boolean | null
          likes_count?: number | null
          quality_score?: number | null
          tags?: string[] | null
          title?: string
          type?: string
          url?: string
          user_id?: string
          views_count?: number | null
          viral_score?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          default_tip_amount: number | null
          has_active_badge: boolean | null
          id: string
          onboarding_completed: boolean | null
          privy_user_id: string | null
          updated_at: string
          username: string
          wallet_address: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          default_tip_amount?: number | null
          has_active_badge?: boolean | null
          id: string
          onboarding_completed?: boolean | null
          privy_user_id?: string | null
          updated_at?: string
          username: string
          wallet_address?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          default_tip_amount?: number | null
          has_active_badge?: boolean | null
          id?: string
          onboarding_completed?: boolean | null
          privy_user_id?: string | null
          updated_at?: string
          username?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      saves: {
        Row: {
          created_at: string
          id: string
          media_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          media_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saves_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      seen_posts: {
        Row: {
          id: string
          media_id: string
          seen_at: string
          user_id: string
        }
        Insert: {
          id?: string
          media_id: string
          seen_at?: string
          user_id: string
        }
        Update: {
          id?: string
          media_id?: string
          seen_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seen_posts_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interactions: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          interaction_type: string
          media_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          interaction_type: string
          media_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          interaction_type?: string
          media_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interactions_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interests: {
        Row: {
          created_at: string
          id: string
          interest: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interest: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interest?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          id: string
          score: number
          tag: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          score?: number
          tag: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          score?: number
          tag?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      deactivate_expired_badges: { Args: never; Returns: undefined }
      increment_view_count: { Args: { media_id: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
