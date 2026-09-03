export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      athlete_profiles: {
        Row: {
          birth_date: string
          created_at: string
          height_cm: number
          phone: string | null
          profile_id: string
          sex: string
          updated_at: string
        }
        Insert: {
          birth_date: string
          created_at?: string
          height_cm: number
          phone?: string | null
          profile_id: string
          sex: string
          updated_at?: string
        }
        Update: {
          birth_date?: string
          created_at?: string
          height_cm?: number
          phone?: string | null
          profile_id?: string
          sex?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athletes: {
        Row: {
          athlete_id: string | null
          claimed_at: string | null
          coach_id: string
          created_at: string
          first_name: string
          id: string
          invite_expires_at: string
          invite_status: string
          invite_token: string
          label: string | null
          last_name: string | null
          planned: boolean
          updated_at: string
        }
        Insert: {
          athlete_id?: string | null
          claimed_at?: string | null
          coach_id: string
          created_at?: string
          first_name: string
          id?: string
          invite_expires_at?: string
          invite_status?: string
          invite_token?: string
          label?: string | null
          last_name?: string | null
          planned?: boolean
          updated_at?: string
        }
        Update: {
          athlete_id?: string | null
          claimed_at?: string | null
          coach_id?: string
          created_at?: string
          first_name?: string
          id?: string
          invite_expires_at?: string
          invite_status?: string
          invite_token?: string
          label?: string | null
          last_name?: string | null
          planned?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athletes_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athletes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_athletes: {
        Row: {
          age_category: string | null
          athlete_id: string
          competes_on: string | null
          competition_id: string
          created_at: string
          weight_class: string | null
        }
        Insert: {
          age_category?: string | null
          athlete_id: string
          competes_on?: string | null
          competition_id: string
          created_at?: string
          weight_class?: string | null
        }
        Update: {
          age_category?: string | null
          athlete_id?: string
          competes_on?: string | null
          competition_id?: string
          created_at?: string
          weight_class?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competition_athletes_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_athletes_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          age_categories: string[]
          coach_id: string
          created_at: string
          ends_on: string
          federation: string
          id: string
          location: string | null
          name: string
          starts_on: string
          type: string
          updated_at: string
        }
        Insert: {
          age_categories?: string[]
          coach_id: string
          created_at?: string
          ends_on: string
          federation: string
          id?: string
          location?: string | null
          name: string
          starts_on: string
          type: string
          updated_at?: string
        }
        Update: {
          age_categories?: string[]
          coach_id?: string
          created_at?: string
          ends_on?: string
          federation?: string
          id?: string
          location?: string | null
          name?: string
          starts_on?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cycle_types: {
        Row: {
          coach_id: string
          color: string
          created_at: string
          description: string
          id: string
          name: string
          tier: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          color?: string
          created_at?: string
          description?: string
          id?: string
          name: string
          tier: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          color?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycle_types_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      macrocycles: {
        Row: {
          athlete_id: string
          created_at: string
          id: string
          name: string
          type_id: string | null
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          id?: string
          name: string
          type_id?: string | null
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          id?: string
          name?: string
          type_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "macrocycles_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "macrocycles_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "cycle_types"
            referencedColumns: ["id"]
          },
        ]
      }
      microcycles: {
        Row: {
          block_id: string
          created_at: string
          id: string
          label: string
          starts_on: string
          type_id: string | null
          updated_at: string
        }
        Insert: {
          block_id: string
          created_at?: string
          id?: string
          label: string
          starts_on: string
          type_id?: string | null
          updated_at?: string
        }
        Update: {
          block_id?: string
          created_at?: string
          id?: string
          label?: string
          starts_on?: string
          type_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "microcycles_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "training_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "microcycles_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "cycle_types"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          first_name: string | null
          id: string
          is_coach: boolean
          last_name: string | null
          unit_preference: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id: string
          is_coach?: boolean
          last_name?: string | null
          unit_preference?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          is_coach?: boolean
          last_name?: string | null
          unit_preference?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      reserved_usernames: {
        Row: {
          name: string
        }
        Insert: {
          name: string
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
      training_blocks: {
        Row: {
          athlete_id: string
          created_at: string
          ends_on: string
          id: string
          macro_id: string | null
          name: string
          starts_on: string
          type_id: string | null
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          ends_on: string
          id?: string
          macro_id?: string | null
          name: string
          starts_on: string
          type_id?: string | null
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          ends_on?: string
          id?: string
          macro_id?: string | null
          name?: string
          starts_on?: string
          type_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_blocks_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_blocks_macro_fkey"
            columns: ["macro_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "macrocycles"
            referencedColumns: ["id", "athlete_id"]
          },
          {
            foreignKeyName: "training_blocks_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "cycle_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_invitation: { Args: { p_token: string }; Returns: Json }
      reorder_training_blocks: { Args: { ids: string[] }; Returns: undefined }
      seed_default_cycle_types: { Args: { coach: string }; Returns: undefined }
      username_available: { Args: { candidate: string }; Returns: boolean }
      username_is_reserved: { Args: { candidate: string }; Returns: boolean }
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

