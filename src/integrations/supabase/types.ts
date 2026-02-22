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
      ai_events: {
        Row: {
          adapter_id: string | null
          agent: string | null
          case_id: string | null
          confidence: number | null
          cost_estimate_usd: number | null
          error_code: string | null
          event_type: string
          fallback: boolean
          fallback_reason: string | null
          id: string
          idempotency_key: string | null
          input_hash: string | null
          input_types: string[] | null
          is_mock: boolean
          latency_ms: number | null
          metadata: Json | null
          model_id: string | null
          model_provider: string | null
          model_version: string | null
          org_id: string | null
          prompt_tokens: number | null
          region: string | null
          risk_level: string | null
          screening_id: string | null
          status_code: number | null
          timestamp: string
          trace_id: string | null
          user_id: string | null
        }
        Insert: {
          adapter_id?: string | null
          agent?: string | null
          case_id?: string | null
          confidence?: number | null
          cost_estimate_usd?: number | null
          error_code?: string | null
          event_type?: string
          fallback?: boolean
          fallback_reason?: string | null
          id?: string
          idempotency_key?: string | null
          input_hash?: string | null
          input_types?: string[] | null
          is_mock?: boolean
          latency_ms?: number | null
          metadata?: Json | null
          model_id?: string | null
          model_provider?: string | null
          model_version?: string | null
          org_id?: string | null
          prompt_tokens?: number | null
          region?: string | null
          risk_level?: string | null
          screening_id?: string | null
          status_code?: number | null
          timestamp?: string
          trace_id?: string | null
          user_id?: string | null
        }
        Update: {
          adapter_id?: string | null
          agent?: string | null
          case_id?: string | null
          confidence?: number | null
          cost_estimate_usd?: number | null
          error_code?: string | null
          event_type?: string
          fallback?: boolean
          fallback_reason?: string | null
          id?: string
          idempotency_key?: string | null
          input_hash?: string | null
          input_types?: string[] | null
          is_mock?: boolean
          latency_ms?: number | null
          metadata?: Json | null
          model_id?: string | null
          model_provider?: string | null
          model_version?: string | null
          org_id?: string | null
          prompt_tokens?: number | null
          region?: string | null
          risk_level?: string | null
          screening_id?: string | null
          status_code?: number | null
          timestamp?: string
          trace_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          action: string
          adapter_id: string | null
          case_id: string | null
          created_at: string
          entry_hash: string
          id: number
          is_mock: boolean
          model_id: string | null
          payload: Json | null
          prev_hash: string | null
          screening_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          adapter_id?: string | null
          case_id?: string | null
          created_at?: string
          entry_hash?: string
          id?: never
          is_mock?: boolean
          model_id?: string | null
          payload?: Json | null
          prev_hash?: string | null
          screening_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          adapter_id?: string | null
          case_id?: string | null
          created_at?: string
          entry_hash?: string
          id?: never
          is_mock?: boolean
          model_id?: string | null
          payload?: Json | null
          prev_hash?: string | null
          screening_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      consents: {
        Row: {
          created_at: string
          expires_at: string | null
          granted: boolean
          granted_at: string | null
          id: string
          meta: Json | null
          org_id: string | null
          patient_id: string | null
          purpose: string
          revoked_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted?: boolean
          granted_at?: string | null
          id?: string
          meta?: Json | null
          org_id?: string | null
          patient_id?: string | null
          purpose: string
          revoked_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted?: boolean
          granted_at?: string | null
          id?: string
          meta?: Json | null
          org_id?: string | null
          patient_id?: string | null
          purpose?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_identity"
            referencedColumns: ["id"]
          },
        ]
      }
      edge_metrics: {
        Row: {
          created_at: string
          error_code: string | null
          handler: string
          id: string
          latency_ms: number | null
          metadata: Json | null
          status: string
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          handler: string
          id?: string
          latency_ms?: number | null
          metadata?: Json | null
          status?: string
        }
        Update: {
          created_at?: string
          error_code?: string | null
          handler?: string
          id?: string
          latency_ms?: number | null
          metadata?: Json | null
          status?: string
        }
        Relationships: []
      }
      embedding_stats: {
        Row: {
          adapter_id: string | null
          id: number
          mean_norm: number | null
          meta: Json | null
          model_id: string | null
          n_samples: number | null
          psi_score: number | null
          recorded_at: string
          std_norm: number | null
        }
        Insert: {
          adapter_id?: string | null
          id?: never
          mean_norm?: number | null
          meta?: Json | null
          model_id?: string | null
          n_samples?: number | null
          psi_score?: number | null
          recorded_at?: string
          std_norm?: number | null
        }
        Update: {
          adapter_id?: string | null
          id?: never
          mean_norm?: number | null
          meta?: Json | null
          model_id?: string | null
          n_samples?: number | null
          psi_score?: number | null
          recorded_at?: string
          std_norm?: number | null
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          settings: Json | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          settings?: Json | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          settings?: Json | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      patient_identity: {
        Row: {
          created_at: string
          encrypted_payload: string | null
          id: string
          org_id: string | null
          patient_hash: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          encrypted_payload?: string | null
          id?: string
          org_id?: string | null
          patient_hash: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          encrypted_payload?: string | null
          id?: string
          org_id?: string | null
          patient_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_identity_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      phi_access_log: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          patient_id: string | null
          resource_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          patient_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          patient_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phi_access_log_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_identity"
            referencedColumns: ["id"]
          },
        ]
      }
      screenings: {
        Row: {
          adapter_id: string | null
          child_age_months: number
          confidence: number | null
          created_at: string
          domain: string | null
          embedding_hash: string | null
          id: string
          image_path: string | null
          input_hash: string | null
          is_mock: boolean
          model_id: string | null
          observations: string | null
          prompt_hash: string | null
          report: Json
          risk_level: string | null
          screening_id: string
          status: string
        }
        Insert: {
          adapter_id?: string | null
          child_age_months: number
          confidence?: number | null
          created_at?: string
          domain?: string | null
          embedding_hash?: string | null
          id?: string
          image_path?: string | null
          input_hash?: string | null
          is_mock?: boolean
          model_id?: string | null
          observations?: string | null
          prompt_hash?: string | null
          report?: Json
          risk_level?: string | null
          screening_id: string
          status?: string
        }
        Update: {
          adapter_id?: string | null
          child_age_months?: number
          confidence?: number | null
          created_at?: string
          domain?: string | null
          embedding_hash?: string | null
          id?: string
          image_path?: string | null
          input_hash?: string | null
          is_mock?: boolean
          model_id?: string | null
          observations?: string | null
          prompt_hash?: string | null
          report?: Json
          risk_level?: string | null
          screening_id?: string
          status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_screenings_anonymized: {
        Row: {
          adapter_id: string | null
          child_age_months: number | null
          confidence: number | null
          created_at: string | null
          domain: string | null
          id: string | null
          input_hash: string | null
          model_id: string | null
          observations_excerpt: string | null
          risk_level: string | null
          screening_id: string | null
          status: string | null
        }
        Insert: {
          adapter_id?: string | null
          child_age_months?: number | null
          confidence?: number | null
          created_at?: string | null
          domain?: string | null
          id?: string | null
          input_hash?: string | null
          model_id?: string | null
          observations_excerpt?: never
          risk_level?: string | null
          screening_id?: string | null
          status?: string | null
        }
        Update: {
          adapter_id?: string | null
          child_age_months?: number | null
          confidence?: number | null
          created_at?: string | null
          domain?: string | null
          id?: string | null
          input_hash?: string | null
          model_id?: string | null
          observations_excerpt?: never
          risk_level?: string | null
          screening_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      vw_screenings_anonymized_v2: {
        Row: {
          adapter_id: string | null
          child_age_months: number | null
          confidence: number | null
          created_at: string | null
          domain: string | null
          id: string | null
          input_hash: string | null
          is_mock: boolean | null
          model_id: string | null
          observations_excerpt: string | null
          risk_level: string | null
          screening_id: string | null
          status: string | null
        }
        Insert: {
          adapter_id?: string | null
          child_age_months?: number | null
          confidence?: number | null
          created_at?: string | null
          domain?: string | null
          id?: string | null
          input_hash?: string | null
          is_mock?: boolean | null
          model_id?: string | null
          observations_excerpt?: never
          risk_level?: string | null
          screening_id?: string | null
          status?: string | null
        }
        Update: {
          adapter_id?: string | null
          child_age_months?: number | null
          confidence?: number | null
          created_at?: string | null
          domain?: string | null
          id?: string | null
          input_hash?: string | null
          is_mock?: boolean | null
          model_id?: string | null
          observations_excerpt?: never
          risk_level?: string | null
          screening_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      archive_mock_screenings: { Args: never; Returns: number }
      get_user_org: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_phi_access: {
        Args: {
          _action: string
          _metadata?: Json
          _patient_id: string
          _resource_type?: string
        }
        Returns: undefined
      }
      purge_mock_ai_events: { Args: never; Returns: number }
      purge_mock_screenings: { Args: never; Returns: number }
      revoke_consent_and_purge: {
        Args: { _consent_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "clinician" | "chw" | "analyst" | "viewer"
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
    Enums: {
      app_role: ["admin", "clinician", "chw", "analyst", "viewer"],
    },
  },
} as const
