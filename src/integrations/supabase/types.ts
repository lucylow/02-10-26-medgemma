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
          case_id: string | null
          created_at: string
          entry_hash: string
          id: number
          payload: Json | null
          prev_hash: string | null
          screening_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          case_id?: string | null
          created_at?: string
          entry_hash?: string
          id?: never
          payload?: Json | null
          prev_hash?: string | null
          screening_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          case_id?: string | null
          created_at?: string
          entry_hash?: string
          id?: never
          payload?: Json | null
          prev_hash?: string | null
          screening_id?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      screenings: {
        Row: {
          adapter_id: string | null
          child_age_months: number
          confidence: number | null
          created_at: string
          domain: string | null
          id: string
          image_path: string | null
          input_hash: string | null
          model_id: string | null
          observations: string | null
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
          id?: string
          image_path?: string | null
          input_hash?: string | null
          model_id?: string | null
          observations?: string | null
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
          id?: string
          image_path?: string | null
          input_hash?: string | null
          model_id?: string | null
          observations?: string | null
          report?: Json
          risk_level?: string | null
          screening_id?: string
          status?: string
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
  public: {
    Enums: {},
  },
} as const
