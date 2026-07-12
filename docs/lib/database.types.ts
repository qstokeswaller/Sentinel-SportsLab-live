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
  public: {
    Tables: {
      _seed_athlete_id_map: {
        Row: {
          name: string
          new_id: string
          old_id: string
          position: string | null
        }
        Insert: {
          name: string
          new_id: string
          old_id: string
          position?: string | null
        }
        Update: {
          name?: string
          new_id?: string
          old_id?: string
          position?: string | null
        }
        Relationships: []
      }
      _seed_athlete_profile: {
        Row: {
          athlete_id: string
          mood_baseline: number
          name: string
          pos_group: string
          position: string
          rng_seed: number
          sleep_baseline: number
          soreness_susceptibility: number
          squad_tier: number
          stress_baseline: number
        }
        Insert: {
          athlete_id: string
          mood_baseline: number
          name: string
          pos_group: string
          position: string
          rng_seed: number
          sleep_baseline: number
          soreness_susceptibility: number
          squad_tier: number
          stress_baseline: number
        }
        Update: {
          athlete_id?: string
          mood_baseline?: number
          name?: string
          pos_group?: string
          position?: string
          rng_seed?: number
          sleep_baseline?: number
          soreness_susceptibility?: number
          squad_tier?: number
          stress_baseline?: number
        }
        Relationships: []
      }
      _seed_daily_schedule: {
        Row: {
          day: string
          days_since_last_match: number | null
          days_to_next_match: number | null
          dow: string
          is_match_day: boolean
          notes: string | null
          session_type: string
        }
        Insert: {
          day: string
          days_since_last_match?: number | null
          days_to_next_match?: number | null
          dow: string
          is_match_day: boolean
          notes?: string | null
          session_type: string
        }
        Update: {
          day?: string
          days_since_last_match?: number | null
          days_to_next_match?: number | null
          dow?: string
          is_match_day?: boolean
          notes?: string | null
          session_type?: string
        }
        Relationships: []
      }
      _seed_fixtures: {
        Row: {
          competition: string
          home_away: string
          kickoff_time: string
          match_date: string
          notes: string | null
          opponent: string
        }
        Insert: {
          competition: string
          home_away: string
          kickoff_time: string
          match_date: string
          notes?: string | null
          opponent: string
        }
        Update: {
          competition?: string
          home_away?: string
          kickoff_time?: string
          match_date?: string
          notes?: string | null
          opponent?: string
        }
        Relationships: []
      }
      _seed_load_daily: {
        Row: {
          athlete_id: string
          day: string
          duration_min: number
          notes: string | null
          pos_group: string
          rpe: number
          session_type: string
          sprint_distance_m: number
          total_distance_m: number
        }
        Insert: {
          athlete_id: string
          day: string
          duration_min: number
          notes?: string | null
          pos_group: string
          rpe: number
          session_type: string
          sprint_distance_m: number
          total_distance_m: number
        }
        Update: {
          athlete_id?: string
          day?: string
          duration_min?: number
          notes?: string | null
          pos_group?: string
          rpe?: number
          session_type?: string
          sprint_distance_m?: number
          total_distance_m?: number
        }
        Relationships: []
      }
      _seed_match_lineup: {
        Row: {
          athlete_id: string
          match_date: string
          minutes_played: number
          status: string
        }
        Insert: {
          athlete_id: string
          match_date: string
          minutes_played: number
          status: string
        }
        Update: {
          athlete_id?: string
          match_date?: string
          minutes_played?: number
          status?: string
        }
        Relationships: []
      }
      _seed_pos_gps_profile: {
        Row: {
          comp_rpe: number
          comp_sprint_distance_m: number
          comp_total_distance_m: number
          heavy_rpe: number
          heavy_sprint_distance_m: number
          heavy_total_distance_m: number
          light_rpe: number
          light_sprint_distance_m: number
          light_total_distance_m: number
          match_rpe: number
          match_sprint_distance_m: number
          match_sprint_var: number
          match_total_distance_m: number
          match_total_var: number
          mod_rpe: number
          mod_sprint_distance_m: number
          mod_total_distance_m: number
          pos_group: string
          recovery_rpe: number
          recovery_total_distance_m: number
        }
        Insert: {
          comp_rpe: number
          comp_sprint_distance_m: number
          comp_total_distance_m: number
          heavy_rpe: number
          heavy_sprint_distance_m: number
          heavy_total_distance_m: number
          light_rpe: number
          light_sprint_distance_m: number
          light_total_distance_m: number
          match_rpe: number
          match_sprint_distance_m: number
          match_sprint_var: number
          match_total_distance_m: number
          match_total_var: number
          mod_rpe: number
          mod_sprint_distance_m: number
          mod_total_distance_m: number
          pos_group: string
          recovery_rpe: number
          recovery_total_distance_m: number
        }
        Update: {
          comp_rpe?: number
          comp_sprint_distance_m?: number
          comp_total_distance_m?: number
          heavy_rpe?: number
          heavy_sprint_distance_m?: number
          heavy_total_distance_m?: number
          light_rpe?: number
          light_sprint_distance_m?: number
          light_total_distance_m?: number
          match_rpe?: number
          match_sprint_distance_m?: number
          match_sprint_var?: number
          match_total_distance_m?: number
          match_total_var?: number
          mod_rpe?: number
          mod_sprint_distance_m?: number
          mod_total_distance_m?: number
          pos_group?: string
          recovery_rpe?: number
          recovery_total_distance_m?: number
        }
        Relationships: []
      }
      analytics_scenarios: {
        Row: {
          anchor_inputs: Json | null
          athlete_id: string | null
          coach_actions: string | null
          created_at: string | null
          id: string
          manual_overrides: Json | null
          metric_type: string
          mode: string
          name: string
          notes: string | null
          organisation_id: string
          pinned_days: Json | null
          projection: Json | null
          projection_days: number
          target_ratio: number
          team_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          anchor_inputs?: Json | null
          athlete_id?: string | null
          coach_actions?: string | null
          created_at?: string | null
          id?: string
          manual_overrides?: Json | null
          metric_type?: string
          mode?: string
          name: string
          notes?: string | null
          organisation_id: string
          pinned_days?: Json | null
          projection?: Json | null
          projection_days?: number
          target_ratio?: number
          team_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          anchor_inputs?: Json | null
          athlete_id?: string | null
          coach_actions?: string | null
          created_at?: string | null
          id?: string
          manual_overrides?: Json | null
          metric_type?: string
          mode?: string
          name?: string
          notes?: string | null
          organisation_id?: string
          pinned_days?: Json | null
          projection?: Json | null
          projection_days?: number
          target_ratio?: number
          team_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_scenarios_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          athlete_id: string
          created_at: string | null
          date: string
          id: string
          metrics: Json
          organisation_id: string
          test_type: string
          user_id: string
        }
        Insert: {
          athlete_id: string
          created_at?: string | null
          date: string
          id?: string
          metrics: Json
          organisation_id: string
          test_type: string
          user_id: string
        }
        Update: {
          athlete_id?: string
          created_at?: string | null
          date?: string
          id?: string
          metrics?: Json
          organisation_id?: string
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
          {
            foreignKeyName: "assessments_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_share_sessions: {
        Row: {
          athlete_id: string
          athlete_name: string
          created_at: string
          expires_at: string | null
          id: string
          mode: string
          organisation_id: string
          snapshot_data: Json | null
          user_id: string
        }
        Insert: {
          athlete_id: string
          athlete_name: string
          created_at?: string
          expires_at?: string | null
          id?: string
          mode?: string
          organisation_id: string
          snapshot_data?: Json | null
          user_id: string
        }
        Update: {
          athlete_id?: string
          athlete_name?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          mode?: string
          organisation_id?: string
          snapshot_data?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_share_sessions_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_share_sessions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
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
          goals: string | null
          height_cm: number | null
          id: string
          image_url: string | null
          name: string
          notes: string | null
          one_rm: Json | null
          organisation_id: string
          position: string | null
          sport: string | null
          team_id: string | null
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          adherence?: number | null
          age?: number | null
          created_at?: string | null
          gender?: string | null
          goals?: string | null
          height_cm?: number | null
          id?: string
          image_url?: string | null
          name: string
          notes?: string | null
          one_rm?: Json | null
          organisation_id: string
          position?: string | null
          sport?: string | null
          team_id?: string | null
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          adherence?: number | null
          age?: number | null
          created_at?: string | null
          gender?: string | null
          goals?: string | null
          height_cm?: number | null
          id?: string
          image_url?: string | null
          name?: string
          notes?: string | null
          one_rm?: Json | null
          organisation_id?: string
          position?: string | null
          sport?: string | null
          team_id?: string | null
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "athletes_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athletes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean
          assigned_to_id: string | null
          assigned_to_type: string | null
          assignees: Json
          color: string
          created_at: string | null
          description: string | null
          end_date: string | null
          end_time: string | null
          event_type: string
          id: string
          location: string | null
          organisation_id: string
          start_date: string
          start_time: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          all_day?: boolean
          assigned_to_id?: string | null
          assigned_to_type?: string | null
          assignees?: Json
          color?: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_type: string
          id?: string
          location?: string | null
          organisation_id: string
          start_date: string
          start_time?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          all_day?: boolean
          assigned_to_id?: string | null
          assigned_to_type?: string | null
          assignees?: Json
          color?: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_type?: string
          id?: string
          location?: string | null
          organisation_id?: string
          start_date?: string
          start_time?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_exercises: {
        Row: {
          added_at: string | null
          collection_id: string
          exercise_id: string
          id: string
        }
        Insert: {
          added_at?: string | null
          collection_id: string
          exercise_id: string
          id?: string
        }
        Update: {
          added_at?: string | null
          collection_id?: string
          exercise_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_exercises_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "exercise_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      data_hub_snapshots: {
        Row: {
          created_at: string
          created_by: string | null
          data: Json
          id: string
          name: string | null
          organisation_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data: Json
          id?: string
          name?: string | null
          organisation_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          name?: string | null
          organisation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_hub_snapshots_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_collections: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          last_modified_by: string | null
          name: string
          organisation_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_modified_by?: string | null
          name: string
          organisation_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_modified_by?: string | null
          name?: string
          organisation_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_collections_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
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
          images: string[] | null
          last_modified_by: string | null
          name: string
          options: Json | null
          organisation_id: string | null
          safety_cues: string | null
          source_id: string | null
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
          id?: string
          images?: string[] | null
          last_modified_by?: string | null
          name: string
          options?: Json | null
          organisation_id?: string | null
          safety_cues?: string | null
          source_id?: string | null
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
          images?: string[] | null
          last_modified_by?: string | null
          name?: string
          options?: Json | null
          organisation_id?: string | null
          safety_cues?: string | null
          source_id?: string | null
          tags?: string[] | null
          tracking_type?: string | null
          user_id?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      injury_classifications: {
        Row: {
          athlete_id: string
          body_area: string | null
          body_side: string | null
          classification_date: string
          contact_object: string | null
          contact_type: string | null
          created_at: string | null
          diagnosis: string | null
          id: string
          mechanism: string | null
          notes: string | null
          onset: string | null
          organisation_id: string
          performance_impact: string | null
          problem_type: string | null
          return_date: string | null
          status: string | null
          time_loss_category: string | null
          user_id: string | null
          wellness_response_id: string | null
        }
        Insert: {
          athlete_id: string
          body_area?: string | null
          body_side?: string | null
          classification_date: string
          contact_object?: string | null
          contact_type?: string | null
          created_at?: string | null
          diagnosis?: string | null
          id?: string
          mechanism?: string | null
          notes?: string | null
          onset?: string | null
          organisation_id: string
          performance_impact?: string | null
          problem_type?: string | null
          return_date?: string | null
          status?: string | null
          time_loss_category?: string | null
          user_id?: string | null
          wellness_response_id?: string | null
        }
        Update: {
          athlete_id?: string
          body_area?: string | null
          body_side?: string | null
          classification_date?: string
          contact_object?: string | null
          contact_type?: string | null
          created_at?: string | null
          diagnosis?: string | null
          id?: string
          mechanism?: string | null
          notes?: string | null
          onset?: string | null
          organisation_id?: string
          performance_impact?: string | null
          problem_type?: string | null
          return_date?: string | null
          status?: string | null
          time_loss_category?: string | null
          user_id?: string | null
          wellness_response_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "injury_classifications_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      injury_reports: {
        Row: {
          athlete_id: string
          athlete_name: string
          created_at: string
          date_of_injury: string
          id: string
          organisation_id: string
          report_data: Json
          team_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          athlete_id: string
          athlete_name: string
          created_at?: string
          date_of_injury: string
          id?: string
          organisation_id: string
          report_data?: Json
          team_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          athlete_id?: string
          athlete_name?: string
          created_at?: string
          date_of_injury?: string
          id?: string
          organisation_id?: string
          report_data?: Json
          team_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "injury_reports_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_user_id: string | null
          created_at: string
          id: string
          metadata: Json
          organisation_id: string
          target_email: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          organisation_id: string
          target_email?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          organisation_id?: string
          target_email?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_audit_log_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organisation_id: string
          revoked_at: string | null
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organisation_id: string
          revoked_at?: string | null
          role?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organisation_id?: string
          revoked_at?: string | null
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invitations_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string
          organisation_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          organisation_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          organisation_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          seat_cap: number
          settings: Json
          subscription_period_end: string | null
          subscription_status: string
          tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          seat_cap?: number
          settings?: Json
          subscription_period_end?: string | null
          subscription_status?: string
          tier?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          seat_cap?: number
          settings?: Json
          subscription_period_end?: string | null
          subscription_status?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      planned_tonnage_log: {
        Row: {
          athlete_id: string
          by_body_part: Json
          created_at: string
          date: string
          id: string
          organisation_id: string
          program_day_id: string | null
          source_id: string
          source_type: string
          total_tonnage: number
          user_id: string
        }
        Insert: {
          athlete_id: string
          by_body_part?: Json
          created_at?: string
          date: string
          id?: string
          organisation_id: string
          program_day_id?: string | null
          source_id: string
          source_type: string
          total_tonnage?: number
          user_id: string
        }
        Update: {
          athlete_id?: string
          by_body_part?: Json
          created_at?: string
          date?: string
          id?: string
          organisation_id?: string
          program_day_id?: string | null
          source_id?: string
          source_type?: string
          total_tonnage?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planned_tonnage_log_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          last_modified_by: string | null
          name: string
          organisation_id: string | null
          questions: Json
          team_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          last_modified_by?: string | null
          name: string
          organisation_id?: string | null
          questions?: Json
          team_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          last_modified_by?: string | null
          name?: string
          organisation_id?: string | null
          questions?: Json
          team_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_templates_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_templates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_sessions: {
        Row: {
          actual_duration: number | null
          actual_results: Json | null
          actual_rpe: number | null
          created_at: string | null
          date: string
          exercise_ids: string[] | null
          exercises: Json | null
          id: string
          linked_sessions: Json | null
          load: string | null
          notes: string | null
          organisation_id: string
          planned_duration: number | null
          program_end_date: string | null
          program_id: string | null
          program_meta: Json | null
          session_type: string | null
          status: string | null
          target_id: string
          target_type: string | null
          time: string | null
          title: string | null
          track_tonnage: boolean | null
          training_phase: string | null
          user_id: string
          workout_template_id: string | null
        }
        Insert: {
          actual_duration?: number | null
          actual_results?: Json | null
          actual_rpe?: number | null
          created_at?: string | null
          date: string
          exercise_ids?: string[] | null
          exercises?: Json | null
          id?: string
          linked_sessions?: Json | null
          load?: string | null
          notes?: string | null
          organisation_id: string
          planned_duration?: number | null
          program_end_date?: string | null
          program_id?: string | null
          program_meta?: Json | null
          session_type?: string | null
          status?: string | null
          target_id: string
          target_type?: string | null
          time?: string | null
          title?: string | null
          track_tonnage?: boolean | null
          training_phase?: string | null
          user_id: string
          workout_template_id?: string | null
        }
        Update: {
          actual_duration?: number | null
          actual_results?: Json | null
          actual_rpe?: number | null
          created_at?: string | null
          date?: string
          exercise_ids?: string[] | null
          exercises?: Json | null
          id?: string
          linked_sessions?: Json | null
          load?: string | null
          notes?: string | null
          organisation_id?: string
          planned_duration?: number | null
          program_end_date?: string | null
          program_id?: string | null
          program_meta?: Json | null
          session_type?: string | null
          status?: string | null
          target_id?: string
          target_type?: string | null
          time?: string | null
          title?: string | null
          track_tonnage?: boolean | null
          training_phase?: string | null
          user_id?: string
          workout_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_sessions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "workout_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_sessions_workout_template_id_fkey"
            columns: ["workout_template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          organisation_id: string
          sport: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          organisation_id: string
          sport?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          organisation_id?: string
          sport?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      test_share_sessions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          share_type: string
          snapshot_data: Json
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          share_type: string
          snapshot_data: Json
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          share_type?: string
          snapshot_data?: Json
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      training_attendance: {
        Row: {
          absent_athlete_ids: string[] | null
          attendance_count: number
          attendance_total: number
          created_at: string | null
          date: string
          id: string
          notes: string | null
          organisation_id: string
          session_id: string
          team_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          absent_athlete_ids?: string[] | null
          attendance_count?: number
          attendance_total?: number
          created_at?: string | null
          date: string
          id?: string
          notes?: string | null
          organisation_id: string
          session_id: string
          team_id: string
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          absent_athlete_ids?: string[] | null
          attendance_count?: number
          attendance_total?: number
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          organisation_id?: string
          session_id?: string
          team_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_attendance_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "scheduled_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_loads: {
        Row: {
          athlete_id: string
          created_at: string | null
          date: string
          distance_metres: number | null
          duration_minutes: number | null
          id: string
          metric_type: string
          notes: string | null
          organisation_id: string
          rpe: number | null
          session_type: string | null
          sprint_distance_metres: number | null
          team_id: string | null
          user_id: string
          value: number
        }
        Insert: {
          athlete_id: string
          created_at?: string | null
          date: string
          distance_metres?: number | null
          duration_minutes?: number | null
          id?: string
          metric_type?: string
          notes?: string | null
          organisation_id: string
          rpe?: number | null
          session_type?: string | null
          sprint_distance_metres?: number | null
          team_id?: string | null
          user_id?: string
          value?: number
        }
        Update: {
          athlete_id?: string
          created_at?: string | null
          date?: string
          distance_metres?: number | null
          duration_minutes?: number | null
          id?: string
          metric_type?: string
          notes?: string | null
          organisation_id?: string
          rpe?: number | null
          session_type?: string | null
          sprint_distance_metres?: number | null
          team_id?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_loads_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_data: {
        Row: {
          id: string
          key: string
          organisation_id: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          organisation_id: string
          updated_at?: string
          user_id: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          organisation_id?: string
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "user_data_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          account_type: string | null
          created_at: string | null
          id: string
          onboarding_completed_at: string | null
          role: string | null
        }
        Insert: {
          account_type?: string | null
          created_at?: string | null
          id: string
          onboarding_completed_at?: string | null
          role?: string | null
        }
        Update: {
          account_type?: string | null
          created_at?: string | null
          id?: string
          onboarding_completed_at?: string | null
          role?: string | null
        }
        Relationships: []
      }
      weightroom_sheets: {
        Row: {
          created_at: string
          id: string
          last_modified_by: string | null
          name: string
          notes: string | null
          organisation_id: string
          source_context: Json | null
          team_id: string | null
          updated_at: string
          user_id: string
          visibility: string
          ws_columns: Json
          ws_mode: string
          ws_orientation: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_modified_by?: string | null
          name: string
          notes?: string | null
          organisation_id: string
          source_context?: Json | null
          team_id?: string | null
          updated_at?: string
          user_id: string
          visibility?: string
          ws_columns?: Json
          ws_mode?: string
          ws_orientation?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_modified_by?: string | null
          name?: string
          notes?: string | null
          organisation_id?: string
          source_context?: Json | null
          team_id?: string | null
          updated_at?: string
          user_id?: string
          visibility?: string
          ws_columns?: Json
          ws_mode?: string
          ws_orientation?: string
        }
        Relationships: [
          {
            foreignKeyName: "weightroom_sheets_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      wellness_flags: {
        Row: {
          athlete_id: string
          created_at: string | null
          flag_date: string
          flag_type: string
          id: string
          organisation_id: string
          team_id: string
          threshold_used: string | null
          trigger_field: string
          trigger_value: string | null
          user_id: string | null
          weekly_assigned: boolean | null
          weekly_completed: boolean | null
          weekly_response_id: string | null
        }
        Insert: {
          athlete_id: string
          created_at?: string | null
          flag_date: string
          flag_type: string
          id?: string
          organisation_id: string
          team_id: string
          threshold_used?: string | null
          trigger_field: string
          trigger_value?: string | null
          user_id?: string | null
          weekly_assigned?: boolean | null
          weekly_completed?: boolean | null
          weekly_response_id?: string | null
        }
        Update: {
          athlete_id?: string
          created_at?: string | null
          flag_date?: string
          flag_type?: string
          id?: string
          organisation_id?: string
          team_id?: string
          threshold_used?: string | null
          trigger_field?: string
          trigger_value?: string | null
          user_id?: string | null
          weekly_assigned?: boolean | null
          weekly_completed?: boolean | null
          weekly_response_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wellness_flags_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      wellness_responses: {
        Row: {
          athlete_id: string | null
          availability: string | null
          health_problem_flag: boolean | null
          id: string
          injury_report: Json | null
          organisation_id: string
          questionnaire_template_id: string | null
          readiness: string | null
          responses: Json
          rpe: number | null
          session_date: string
          share_session_id: string | null
          submitted_at: string | null
          team_id: string
          tier: string | null
        }
        Insert: {
          athlete_id?: string | null
          availability?: string | null
          health_problem_flag?: boolean | null
          id?: string
          injury_report?: Json | null
          organisation_id: string
          questionnaire_template_id?: string | null
          readiness?: string | null
          responses?: Json
          rpe?: number | null
          session_date?: string
          share_session_id?: string | null
          submitted_at?: string | null
          team_id: string
          tier?: string | null
        }
        Update: {
          athlete_id?: string | null
          availability?: string | null
          health_problem_flag?: boolean | null
          id?: string
          injury_report?: Json | null
          organisation_id?: string
          questionnaire_template_id?: string | null
          readiness?: string | null
          responses?: Json
          rpe?: number | null
          session_date?: string
          share_session_id?: string | null
          submitted_at?: string | null
          team_id?: string
          tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wellness_responses_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wellness_responses_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wellness_responses_questionnaire_template_id_fkey"
            columns: ["questionnaire_template_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wellness_responses_share_session_id_fkey"
            columns: ["share_session_id"]
            isOneToOne: false
            referencedRelation: "wellness_share_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      wellness_share_sessions: {
        Row: {
          id: string
          organisation_id: string
          shared_at: string
          team_id: string
          template_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          organisation_id: string
          shared_at?: string
          team_id: string
          template_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          organisation_id?: string
          shared_at?: string
          team_id?: string
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wellness_share_sessions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wellness_share_sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_day_exercises: {
        Row: {
          athlete_weight_overrides: Json | null
          created_at: string | null
          day_id: string
          display_fields: string[] | null
          exercise_id: string
          id: string
          intensities: Json | null
          intensity: string | null
          notes: string | null
          order_index: number | null
          organisation_id: string
          reps: string | null
          rest_min: number | null
          rest_sec: number | null
          rir: string | null
          rpe: string | null
          section: string
          sets: string | null
          tempo: string | null
          user_id: string
          weight: string | null
        }
        Insert: {
          athlete_weight_overrides?: Json | null
          created_at?: string | null
          day_id: string
          display_fields?: string[] | null
          exercise_id: string
          id?: string
          intensities?: Json | null
          intensity?: string | null
          notes?: string | null
          order_index?: number | null
          organisation_id: string
          reps?: string | null
          rest_min?: number | null
          rest_sec?: number | null
          rir?: string | null
          rpe?: string | null
          section?: string
          sets?: string | null
          tempo?: string | null
          user_id: string
          weight?: string | null
        }
        Update: {
          athlete_weight_overrides?: Json | null
          created_at?: string | null
          day_id?: string
          display_fields?: string[] | null
          exercise_id?: string
          id?: string
          intensities?: Json | null
          intensity?: string | null
          notes?: string | null
          order_index?: number | null
          organisation_id?: string
          reps?: string | null
          rest_min?: number | null
          rest_sec?: number | null
          rir?: string | null
          rpe?: string | null
          section?: string
          sets?: string | null
          tempo?: string | null
          user_id?: string
          weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_day_exercises_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "workout_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_day_exercises_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_days: {
        Row: {
          created_at: string | null
          day_number: number
          id: string
          instructions: string | null
          is_rest_day: boolean | null
          linked_sessions: Json | null
          name: string | null
          organisation_id: string
          program_id: string
          section_meta: Json | null
          section_order: string[] | null
          user_id: string
          week_number: number | null
        }
        Insert: {
          created_at?: string | null
          day_number?: number
          id?: string
          instructions?: string | null
          is_rest_day?: boolean | null
          linked_sessions?: Json | null
          name?: string | null
          organisation_id: string
          program_id: string
          section_meta?: Json | null
          section_order?: string[] | null
          user_id: string
          week_number?: number | null
        }
        Update: {
          created_at?: string | null
          day_number?: number
          id?: string
          instructions?: string | null
          is_rest_day?: boolean | null
          linked_sessions?: Json | null
          name?: string | null
          organisation_id?: string
          program_id?: string
          section_meta?: Json | null
          section_order?: string[] | null
          user_id?: string
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_days_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_days_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "workout_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_programs: {
        Row: {
          created_at: string | null
          id: string
          last_modified_by: string | null
          name: string
          organisation_id: string
          overview: string | null
          start_date: string | null
          tags: string[] | null
          track_tonnage: boolean | null
          training_phase: string | null
          updated_at: string | null
          user_id: string
          visibility: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_modified_by?: string | null
          name: string
          organisation_id: string
          overview?: string | null
          start_date?: string | null
          tags?: string[] | null
          track_tonnage?: boolean | null
          training_phase?: string | null
          updated_at?: string | null
          user_id: string
          visibility?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_modified_by?: string | null
          name?: string
          organisation_id?: string
          overview?: string | null
          start_date?: string | null
          tags?: string[] | null
          track_tonnage?: boolean | null
          training_phase?: string | null
          updated_at?: string | null
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_programs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          created_at: string | null
          id: string
          last_modified_by: string | null
          load: string | null
          name: string
          organisation_id: string
          sections: Json | null
          training_phase: string | null
          updated_at: string | null
          user_id: string
          visibility: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_modified_by?: string | null
          load?: string | null
          name: string
          organisation_id: string
          sections?: Json | null
          training_phase?: string | null
          updated_at?: string | null
          user_id: string
          visibility?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_modified_by?: string | null
          load?: string | null
          name?: string
          organisation_id?: string
          sections?: Json | null
          training_phase?: string | null
          updated_at?: string | null
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_templates_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _text_array_overlap_count: {
        Args: { a: string[]; b: string[] }
        Returns: number
      }
      accept_org_invitation: {
        Args: { p_token: string }
        Returns: {
          organisation_id: string
          role: string
        }[]
      }
      athlete_belongs_to_team: {
        Args: { p_athlete: string; p_team: string }
        Returns: boolean
      }
      athlete_exists: { Args: { p_athlete: string }; Returns: boolean }
      change_member_role: {
        Args: { p_member_id: string; p_new_role: string }
        Returns: undefined
      }
      check_invite_email: {
        Args: { p_email: string }
        Returns: {
          has_other_org: boolean
          other_org_has_data: boolean
          other_org_id: string
          other_org_name: string
          user_exists: boolean
          user_id: string
        }[]
      }
      create_data_hub_snapshot: {
        Args: { p_data: Json; p_name: string }
        Returns: string
      }
      create_org_invitation: {
        Args: { p_email: string; p_role?: string }
        Returns: {
          expires_at: string
          id: string
          organisation_id: string
          token: string
        }[]
      }
      current_user_is_org_admin: { Args: never; Returns: boolean }
      current_user_org: { Args: never; Returns: string }
      delete_planned_tonnage_for_source: {
        Args: { p_source_id: string }
        Returns: undefined
      }
      get_data_hub_snapshot: { Args: { p_id: string }; Returns: Json }
      get_exercises_overlay: {
        Args: { p_ids: string[] }
        Returns: {
          body_parts: string[]
          categories: string[]
          created_at: string
          description: string
          equipment: string[]
          id: string
          images: string[]
          is_custom: boolean
          name: string
          options: Json
          organisation_id: string
          original_id: string
          override_id: string
          safety_cues: string
          source_id: string
          tags: string[]
          tracking_type: string
          user_id: string
          video_url: string
        }[]
      }
      get_injury_form_data: { Args: { p_team_id: string }; Returns: Json }
      get_invitation_info: {
        Args: { p_token: string }
        Returns: {
          email: string
          expires_at: string
          invalid_reason: string
          is_valid: boolean
          organisation_name: string
          role: string
        }[]
      }
      get_org_audit_log: {
        Args: { p_limit?: number }
        Returns: {
          action: string
          actor_email: string
          actor_user_id: string
          created_at: string
          id: string
          metadata: Json
          target_email: string
          target_user_id: string
        }[]
      }
      get_org_members_with_users: {
        Args: never
        Returns: {
          email: string
          first_name: string
          full_name: string
          invited_by: string
          joined_at: string
          member_id: string
          role: string
          surname: string
          user_id: string
        }[]
      }
      get_recent_weekly_info: {
        Args: { p_athlete_id: string; p_days?: number }
        Returns: Json
      }
      get_shared_protocol: { Args: { p_protocol_id: string }; Returns: Json }
      get_shared_workout_program: {
        Args: { p_program_id: string }
        Returns: Json
      }
      get_shared_workout_template: {
        Args: { p_template_id: string }
        Returns: Json
      }
      get_team_athletes: { Args: { p_team_id: string }; Returns: Json }
      get_wellness_form_data: {
        Args: { p_team_id: string; p_template_id: string }
        Returns: Json
      }
      has_recent_weekly_response: {
        Args: { p_athlete_id: string; p_days?: number }
        Returns: boolean
      }
      log_org_action: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_org_id: string
          p_target_email?: string
          p_target_user_id?: string
        }
        Returns: undefined
      }
      remove_org_member: { Args: { p_member_id: string }; Returns: undefined }
      resolve_share_session_id: {
        Args: { p_team_id: string; p_template_id: string }
        Returns: string
      }
      revoke_org_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      shift_planned_tonnage_for_source: {
        Args: { p_delta_days: number; p_source_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      smart_exercise_search: {
        Args: {
          p_alphabet_letter?: string
          p_category?: string
          p_classification?: string
          p_custom_only?: boolean
          p_limit?: number
          p_muscle_group?: string
          p_offset?: number
          p_search?: string
        }
        Returns: {
          body_parts: string[]
          categories: string[]
          created_at: string
          description: string
          equipment: string[]
          id: string
          images: string[]
          is_custom: boolean
          match_type: string
          name: string
          options: Json
          organisation_id: string
          original_id: string
          override_id: string
          safety_cues: string
          similarity_score: number
          source_id: string
          tags: string[]
          total_count: number
          tracking_type: string
          user_id: string
          video_url: string
        }[]
      }
      suggest_similar_exercises: {
        Args: {
          p_body_parts?: string[]
          p_categories?: string[]
          p_equipment?: string[]
          p_exclude_id?: string
          p_limit?: number
        }
        Returns: {
          body_parts: string[]
          categories: string[]
          equipment: string[]
          id: string
          name: string
          overlap_score: number
        }[]
      }
      transfer_admin: { Args: { p_to_member_id: string }; Returns: undefined }
      update_org_name: { Args: { p_new_name: string }; Returns: undefined }
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
