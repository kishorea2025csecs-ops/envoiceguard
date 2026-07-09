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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          invoice_id: string | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          description: string | null
          id: string
          invoice_id: string
          line_total: number | null
          quantity: number
          total: number
          unit_price: number
          user_id: string
        }
        Insert: {
          description?: string | null
          id?: string
          invoice_id: string
          line_total?: number | null
          quantity?: number
          total?: number
          unit_price?: number
          user_id: string
        }
        Update: {
          description?: string | null
          id?: string
          invoice_id?: string
          line_total?: number | null
          quantity?: number
          total?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          ai_narrative: string | null
          ai_recommendation: string | null
          amount: number
          analysis_summary: string | null
          analyzed_at: string | null
          created_at: string
          currency: string
          due_date: string | null
          duplicate_risk: number | null
          extracted_json: Json | null
          file_path: string | null
          file_type: string | null
          flags: Json
          fraud_reasons: Json
          fraud_score: number
          id: string
          invoice_date: string | null
          invoice_number: string
          po_number: string | null
          price_anomaly_risk: number | null
          recommendation: string | null
          risk_level: Database["public"]["Enums"]["risk_level"]
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number | null
          tax_amount: number
          total_amount: number | null
          updated_at: string
          user_id: string
          vendor_email: string | null
          vendor_id: string | null
          vendor_name: string
          vendor_risk: number | null
        }
        Insert: {
          ai_narrative?: string | null
          ai_recommendation?: string | null
          amount?: number
          analysis_summary?: string | null
          analyzed_at?: string | null
          created_at?: string
          currency?: string
          due_date?: string | null
          duplicate_risk?: number | null
          extracted_json?: Json | null
          file_path?: string | null
          file_type?: string | null
          flags?: Json
          fraud_reasons?: Json
          fraud_score?: number
          id?: string
          invoice_date?: string | null
          invoice_number: string
          po_number?: string | null
          price_anomaly_risk?: number | null
          recommendation?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"]
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number | null
          tax_amount?: number
          total_amount?: number | null
          updated_at?: string
          user_id: string
          vendor_email?: string | null
          vendor_id?: string | null
          vendor_name: string
          vendor_risk?: number | null
        }
        Update: {
          ai_narrative?: string | null
          ai_recommendation?: string | null
          amount?: number
          analysis_summary?: string | null
          analyzed_at?: string | null
          created_at?: string
          currency?: string
          due_date?: string | null
          duplicate_risk?: number | null
          extracted_json?: Json | null
          file_path?: string | null
          file_type?: string | null
          flags?: Json
          fraud_reasons?: Json
          fraud_score?: number
          id?: string
          invoice_date?: string | null
          invoice_number?: string
          po_number?: string | null
          price_anomaly_risk?: number | null
          recommendation?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"]
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number | null
          tax_amount?: number
          total_amount?: number | null
          updated_at?: string
          user_id?: string
          vendor_email?: string | null
          vendor_id?: string | null
          vendor_name?: string
          vendor_risk?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      report_summaries: {
        Row: {
          content: string | null
          created_at: string
          date_from: string | null
          date_to: string | null
          id: string
          invoice_id: string | null
          key_insights: Json
          model: string | null
          period_end: string | null
          period_start: string | null
          recommendations: Json
          scope: Database["public"]["Enums"]["summary_scope"]
          scope_ref: string | null
          source_stats: Json
          title: string | null
          tl_dr: string | null
          top_risks: Json
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          id?: string
          invoice_id?: string | null
          key_insights?: Json
          model?: string | null
          period_end?: string | null
          period_start?: string | null
          recommendations?: Json
          scope: Database["public"]["Enums"]["summary_scope"]
          scope_ref?: string | null
          source_stats?: Json
          title?: string | null
          tl_dr?: string | null
          top_risks?: Json
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          id?: string
          invoice_id?: string | null
          key_insights?: Json
          model?: string | null
          period_end?: string | null
          period_start?: string | null
          recommendations?: Json
          scope?: Database["public"]["Enums"]["summary_scope"]
          scope_ref?: string | null
          source_stats?: Json
          title?: string | null
          tl_dr?: string | null
          top_risks?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_summaries_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          avg_amount: number
          bank_account: string | null
          created_at: string
          first_seen: string | null
          id: string
          invoice_count: number
          is_trusted: boolean
          name: string
          tax_id: string | null
          user_id: string
        }
        Insert: {
          avg_amount?: number
          bank_account?: string | null
          created_at?: string
          first_seen?: string | null
          id?: string
          invoice_count?: number
          is_trusted?: boolean
          name: string
          tax_id?: string | null
          user_id: string
        }
        Update: {
          avg_amount?: number
          bank_account?: string | null
          created_at?: string
          first_seen?: string | null
          id?: string
          invoice_count?: number
          is_trusted?: boolean
          name?: string
          tax_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "finance_manager" | "auditor"
      invoice_status:
        | "processing"
        | "analyzed"
        | "approved"
        | "held"
        | "rejected"
      risk_level: "low" | "medium" | "high"
      summary_scope: "dashboard" | "invoice" | "audit_range"
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
      app_role: ["admin", "finance_manager", "auditor"],
      invoice_status: [
        "processing",
        "analyzed",
        "approved",
        "held",
        "rejected",
      ],
      risk_level: ["low", "medium", "high"],
      summary_scope: ["dashboard", "invoice", "audit_range"],
    },
  },
} as const
