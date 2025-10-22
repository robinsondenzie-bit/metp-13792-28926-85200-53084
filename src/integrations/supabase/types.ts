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
      admin_cash_handles: {
        Row: {
          created_at: string | null
          handle: string
          id: string
          is_active: boolean | null
          method: string
        }
        Insert: {
          created_at?: string | null
          handle: string
          id?: string
          is_active?: boolean | null
          method: string
        }
        Update: {
          created_at?: string | null
          handle?: string
          id?: string
          is_active?: boolean | null
          method?: string
        }
        Relationships: []
      }
      admin_deposits: {
        Row: {
          admin_id: string | null
          amount_cents: number
          created_at: string | null
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          amount_cents: number
          created_at?: string | null
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          admin_id?: string | null
          amount_cents?: number
          created_at?: string | null
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      banks: {
        Row: {
          account_mask: string
          account_number: string
          account_type: Database["public"]["Enums"]["bank_account_type"] | null
          bank_name: string
          created_at: string | null
          holder_name: string
          id: string
          routing_number: string
          status: Database["public"]["Enums"]["bank_verification_status"] | null
          updated_at: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          account_mask: string
          account_number: string
          account_type?: Database["public"]["Enums"]["bank_account_type"] | null
          bank_name: string
          created_at?: string | null
          holder_name: string
          id?: string
          routing_number: string
          status?:
            | Database["public"]["Enums"]["bank_verification_status"]
            | null
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          account_mask?: string
          account_number?: string
          account_type?: Database["public"]["Enums"]["bank_account_type"] | null
          bank_name?: string
          created_at?: string | null
          holder_name?: string
          id?: string
          routing_number?: string
          status?:
            | Database["public"]["Enums"]["bank_verification_status"]
            | null
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      cards: {
        Row: {
          brand: string
          created_at: string | null
          exp_month: number
          exp_year: number
          id: string
          is_default: boolean | null
          last4: string
          token: string
          updated_at: string | null
          user_id: string
          zip: string | null
        }
        Insert: {
          brand: string
          created_at?: string | null
          exp_month: number
          exp_year: number
          id?: string
          is_default?: boolean | null
          last4: string
          token: string
          updated_at?: string | null
          user_id: string
          zip?: string | null
        }
        Update: {
          brand?: string
          created_at?: string | null
          exp_month?: number
          exp_year?: number
          id?: string
          is_default?: boolean | null
          last4?: string
          token?: string
          updated_at?: string | null
          user_id?: string
          zip?: string | null
        }
        Relationships: []
      }
      escrow_hold: {
        Row: {
          amount_cents: number
          created_at: string | null
          id: string
          order_id: string | null
          released_at: string | null
          seller_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          id?: string
          order_id?: string | null
          released_at?: string | null
          seller_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          id?: string
          order_id?: string | null
          released_at?: string | null
          seller_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_hold_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_payments: {
        Row: {
          code: string
          created_at: string | null
          handle: string
          id: string
          method: string
          used: boolean | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          handle: string
          id?: string
          method: string
          used?: boolean | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          handle?: string
          id?: string
          method?: string
          used?: boolean | null
          used_by?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          order_id: string | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          order_id?: string | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          order_id?: string | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_cents: number
          buyer_id: string
          completed_at: string | null
          created_at: string | null
          delivered_at: string | null
          id: string
          item_description: string
          paid_at: string | null
          release_approved_at: string | null
          seller_id: string
          shipped_at: string | null
          shipping_carrier: string | null
          status: string
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          amount_cents: number
          buyer_id: string
          completed_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          item_description: string
          paid_at?: string | null
          release_approved_at?: string | null
          seller_id: string
          shipped_at?: string | null
          shipping_carrier?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_cents?: number
          buyer_id?: string
          completed_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          item_description?: string
          paid_at?: string | null
          release_approved_at?: string | null
          seller_id?: string
          shipped_at?: string | null
          shipping_carrier?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          handle: string
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          handle: string
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          handle?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      shipments: {
        Row: {
          carrier: string
          created_at: string | null
          id: string
          order_id: string
          tracking_number: string
        }
        Insert: {
          carrier: string
          created_at?: string | null
          id?: string
          order_id: string
          tracking_number: string
        }
        Update: {
          carrier?: string
          created_at?: string | null
          id?: string
          order_id?: string
          tracking_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_cents: number
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          bank_id: string | null
          card_id: string | null
          created_at: string | null
          estimated_arrival: string | null
          fee_cents: number
          funding_source_last4: string | null
          funding_source_type: string | null
          id: string
          is_goods_sold: boolean | null
          memo: string | null
          payment_sent: boolean | null
          payment_sent_at: string | null
          payout_speed: string | null
          receipt_url: string | null
          receiver_id: string | null
          rejection_reason: string | null
          sender_id: string | null
          status: string
          type: string
        }
        Insert: {
          amount_cents: number
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bank_id?: string | null
          card_id?: string | null
          created_at?: string | null
          estimated_arrival?: string | null
          fee_cents?: number
          funding_source_last4?: string | null
          funding_source_type?: string | null
          id?: string
          is_goods_sold?: boolean | null
          memo?: string | null
          payment_sent?: boolean | null
          payment_sent_at?: string | null
          payout_speed?: string | null
          receipt_url?: string | null
          receiver_id?: string | null
          rejection_reason?: string | null
          sender_id?: string | null
          status?: string
          type: string
        }
        Update: {
          amount_cents?: number
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bank_id?: string | null
          card_id?: string | null
          created_at?: string | null
          estimated_arrival?: string | null
          fee_cents?: number
          funding_source_last4?: string | null
          funding_source_type?: string | null
          id?: string
          is_goods_sold?: boolean | null
          memo?: string | null
          payment_sent?: boolean | null
          payment_sent_at?: string | null
          payout_speed?: string | null
          receipt_url?: string | null
          receiver_id?: string | null
          rejection_reason?: string | null
          sender_id?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_topups: {
        Row: {
          amount_cents: number
          approved_at: string | null
          approved_by: string | null
          code: string
          created_at: string | null
          id: string
          method: string
          screenshot_url: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          approved_at?: string | null
          approved_by?: string | null
          code: string
          created_at?: string | null
          id?: string
          method: string
          screenshot_url?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          approved_at?: string | null
          approved_by?: string | null
          code?: string
          created_at?: string | null
          id?: string
          method?: string
          screenshot_url?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance_cents: number
          created_at: string | null
          id: string
          on_hold_cents: number
          pending_cents: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance_cents?: number
          created_at?: string | null
          id?: string
          on_hold_cents?: number
          pending_cents?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance_cents?: number
          created_at?: string | null
          id?: string
          on_hold_cents?: number
          pending_cents?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_balance: {
        Args: { amount: number; user_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_balance: {
        Args: { amount: number; user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      bank_account_type: "CHECKING" | "SAVINGS"
      bank_verification_status: "PENDING" | "VERIFIED" | "FAILED"
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
      app_role: ["admin", "user"],
      bank_account_type: ["CHECKING", "SAVINGS"],
      bank_verification_status: ["PENDING", "VERIFIED", "FAILED"],
    },
  },
} as const
