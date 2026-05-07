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
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      assessments: {
        Row: {
          athlete_id: string
          created_at: string | null
          date: string
          id: string
          metrics: Json
          test_type: string
          user_id: string
        }
        Insert: {
          athlete_id: string
          created_at?: string | null
          date: string
          id?: string
          metrics: Json
          test_type: string
          user_id: string
        }
        Update: {
          athlete_id?: string
          created_at?: string | null
          date?: string
          id?: string
          metrics?: Json
          test_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      athletes: {
        Row: {
          adherence: number | null
          age: number | null
          created_at: string | null
          gender: string | null
          id: string
          name: string
          one_rm: Json | null
          team_id: string | null
          user_id: string
        }
        Insert: {
          adherence?: number | null
          age?: number | null
          created_at?: string | null
          gender?: string | null
          id?: string
          name: string
          one_rm?: Json | null
          team_id?: string | null
          user_id: string
        }
        Update: {
          adherence?: number | null
          age?: number | null
          created_at?: string | null
          gender?: string | null
          id?: string
          name?: string
          one_rm?: Json | null
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "athletes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          body_parts: string[] | null
          categories: string[] | null
          created_at: string | null
          description: string | null
          equipment: string[] | null
          id: string
          name: string
          options: Json | null
          tags: string[] | null
          tracking_type: string | null
          user_id: string | null
          video_url: string | null
        }
        Insert: {
          body_parts?: string[] | null
          categories?: string[] | null
          created_at?: string | null
          description?: string | null
          equipment?: string[] | null
          id: string
          name: string
          options?: Json | null
          tags?: string[] | null
          tracking_type?: string | null
          user_id?: string | null
          video_url?: string | null
        }
        Update: {
          body_parts?: string[] | null
          categories?: string[] | null
          created_at?: string | null
          description?: string | null
          equipment?: string[] | null
          id?: string
          name?: string
          options?: Json | null
          tags?: string[] | null
          tracking_type?: string | null
          user_id?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      scheduled_sessions: {
        Row: {
          actual_duration: number | null
          created_at: string | null
          date: string
          exercise_ids: string[] | null
          id: string
          load: string | null
          notes: string | null
          planned_duration: number | null
          status: string | null
          target_id: string
          target_type: string | null
          title: string | null
          training_phase: string | null
          user_id: string
        }
        Insert: {
          actual_duration?: number | null
          created_at?: string | null
          date: string
          exercise_ids?: string[] | null
          id?: string
          load?: string | null
          notes?: string | null
          planned_duration?: number | null
          status?: string | null
          target_id: string
          target_type?: string | null
          title?: string | null
          training_phase?: string | null
          user_id: string
        }
        Update: {
          actual_duration?: number | null
          created_at?: string | null
          date?: string
          exercise_ids?: string[] | null
          id?: string
          load?: string | null
          notes?: string | null
          planned_duration?: number | null
          status?: string | null
          target_id?: string
          target_type?: string | null
          title?: string | null
          training_phase?: string | null
          user_id?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          sport: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          sport?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          sport?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          account_type: string | null
          created_at: string | null
          id: string
          role: string | null
        }
        Insert: {
          account_type?: string | null
          created_at?: string | null
          id: string
          role?: string | null
        }
        Update: {
          account_type?: string | null
          created_at?: string | null
          id?: string
          role?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
