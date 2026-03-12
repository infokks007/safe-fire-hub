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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      auction_bids: {
        Row: {
          amount: number
          auction_id: string
          bidder_id: string
          created_at: string
          id: string
        }
        Insert: {
          amount: number
          auction_id: string
          bidder_id: string
          created_at?: string
          id?: string
        }
        Update: {
          amount?: number
          auction_id?: string
          bidder_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      auctions: {
        Row: {
          bundles: string[] | null
          characters: string[] | null
          created_at: string
          current_price: number
          description: string | null
          duration_minutes: number
          elite_pass: boolean | null
          ends_at: string
          evo_guns: string[] | null
          freefire_uid: string | null
          gun_skins: string[] | null
          highest_bidder_id: string | null
          id: string
          images: string[] | null
          level: number | null
          rank: string | null
          region: string | null
          seller_id: string
          starting_price: number
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          bundles?: string[] | null
          characters?: string[] | null
          created_at?: string
          current_price: number
          description?: string | null
          duration_minutes?: number
          elite_pass?: boolean | null
          ends_at: string
          evo_guns?: string[] | null
          freefire_uid?: string | null
          gun_skins?: string[] | null
          highest_bidder_id?: string | null
          id?: string
          images?: string[] | null
          level?: number | null
          rank?: string | null
          region?: string | null
          seller_id: string
          starting_price: number
          starts_at?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          bundles?: string[] | null
          characters?: string[] | null
          created_at?: string
          current_price?: number
          description?: string | null
          duration_minutes?: number
          elite_pass?: boolean | null
          ends_at?: string
          evo_guns?: string[] | null
          freefire_uid?: string | null
          gun_skins?: string[] | null
          highest_bidder_id?: string | null
          id?: string
          images?: string[] | null
          level?: number | null
          rank?: string | null
          region?: string | null
          seller_id?: string
          starting_price?: number
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          listing_id: string
          seller_id: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          listing_id: string
          seller_id: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          listing_id?: string
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          admin_notes: string | null
          conversation_id: string
          created_at: string
          description: string | null
          evidence_urls: string[] | null
          id: string
          listing_id: string
          reason: string
          reporter_id: string
          resolution: string | null
          resolved_at: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          conversation_id: string
          created_at?: string
          description?: string | null
          evidence_urls?: string[] | null
          id?: string
          listing_id: string
          reason: string
          reporter_id: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          conversation_id?: string
          created_at?: string
          description?: string | null
          evidence_urls?: string[] | null
          id?: string
          listing_id?: string
          reason?: string
          reporter_id?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_requests: {
        Row: {
          created_at: string
          duration: string
          expires_at: string | null
          fee: number
          id: string
          listing_id: string
          seller_id: string
          starts_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          duration?: string
          expires_at?: string | null
          fee: number
          id?: string
          listing_id: string
          seller_id: string
          starts_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          duration?: string
          expires_at?: string | null
          fee?: number
          id?: string
          listing_id?: string
          seller_id?: string
          starts_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      flagged_listings: {
        Row: {
          admin_notes: string | null
          confidence: number | null
          created_at: string
          id: string
          listing_id: string
          reason: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          listing_id: string
          reason: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          listing_id?: string
          reason?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "flagged_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          bundles: string[] | null
          characters: string[] | null
          created_at: string
          description: string | null
          elite_pass: boolean | null
          evo_guns: string[] | null
          freefire_uid: string | null
          gun_skins: string[] | null
          id: string
          images: string[] | null
          is_featured: boolean
          level: number | null
          price: number
          rank: string | null
          region: string | null
          seller_id: string
          status: string
          title: string
          updated_at: string
          views_count: number
        }
        Insert: {
          bundles?: string[] | null
          characters?: string[] | null
          created_at?: string
          description?: string | null
          elite_pass?: boolean | null
          evo_guns?: string[] | null
          freefire_uid?: string | null
          gun_skins?: string[] | null
          id?: string
          images?: string[] | null
          is_featured?: boolean
          level?: number | null
          price: number
          rank?: string | null
          region?: string | null
          seller_id: string
          status?: string
          title: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          bundles?: string[] | null
          characters?: string[] | null
          created_at?: string
          description?: string | null
          elite_pass?: boolean | null
          evo_guns?: string[] | null
          freefire_uid?: string | null
          gun_skins?: string[] | null
          id?: string
          images?: string[] | null
          is_featured?: boolean
          level?: number | null
          price?: number
          rank?: string | null
          region?: string | null
          seller_id?: string
          status?: string
          title?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      news_articles: {
        Row: {
          author_id: string | null
          category: string
          content: string
          cover_image: string | null
          created_at: string
          id: string
          published: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category?: string
          content: string
          cover_image?: string | null
          created_at?: string
          id?: string
          published?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category?: string
          content?: string
          cover_image?: string | null
          created_at?: string
          id?: string
          published?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          reference_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          reference_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          account_credentials: string | null
          admin_notes: string | null
          admin_released: boolean
          admin_verified: boolean | null
          amount: number
          buyer_confirmed: boolean
          buyer_id: string
          buyer_login_confirmed_at: string | null
          cancelled_at: string | null
          created_at: string
          id: string
          listing_id: string
          platform_fee: number
          released_at: string | null
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          account_credentials?: string | null
          admin_notes?: string | null
          admin_released?: boolean
          admin_verified?: boolean | null
          amount: number
          buyer_confirmed?: boolean
          buyer_id: string
          buyer_login_confirmed_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          id?: string
          listing_id: string
          platform_fee?: number
          released_at?: string | null
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_credentials?: string | null
          admin_notes?: string | null
          admin_released?: boolean
          admin_verified?: boolean | null
          amount?: number
          buyer_confirmed?: boolean
          buyer_id?: string
          buyer_login_confirmed_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          platform_fee?: number
          released_at?: string | null
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          ban_reason: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          is_banned: boolean
          is_verified: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          ban_reason?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_banned?: boolean
          is_verified?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          ban_reason?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_banned?: boolean
          is_verified?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          account_accuracy: number | null
          buyer_id: string
          comment: string | null
          created_at: string
          delivery_speed: number | null
          id: string
          listing_id: string
          rating: number
          seller_id: string
        }
        Insert: {
          account_accuracy?: number | null
          buyer_id: string
          comment?: string | null
          created_at?: string
          delivery_speed?: number | null
          id?: string
          listing_id: string
          rating: number
          seller_id: string
        }
        Update: {
          account_accuracy?: number | null
          buyer_id?: string
          comment?: string | null
          created_at?: string
          delivery_speed?: number | null
          id?: string
          listing_id?: string
          rating?: number
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_vouches: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          seller_id: string
          voucher_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          seller_id: string
          voucher_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          seller_id?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_vouches_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
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
      wallet_transactions: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          reference_id: string | null
          resolved_at: string | null
          status: string
          type: string
          upi_transaction_id: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          reference_id?: string | null
          resolved_at?: string | null
          status?: string
          type: string
          upi_transaction_id?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          reference_id?: string | null
          resolved_at?: string | null
          status?: string
          type?: string
          upi_transaction_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          escrow_balance: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          escrow_balance?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          escrow_balance?: number
          id?: string
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
      create_notification: {
        Args: {
          _message: string
          _reference_id?: string
          _title: string
          _type: string
          _user_id: string
        }
        Returns: undefined
      }
      finalize_auction: { Args: { _auction_id: string }; Returns: string }
      get_seller_rating: {
        Args: { _seller_id: string }
        Returns: {
          avg_rating: number
          total_reviews: number
          total_sales: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      place_bid: {
        Args: { _amount: number; _auction_id: string; _bidder_id: string }
        Returns: undefined
      }
      process_withdrawal: {
        Args: {
          _admin_notes?: string
          _status: string
          _transaction_id: string
        }
        Returns: undefined
      }
      purchase_listing: {
        Args: { _buyer_id: string; _listing_id: string }
        Returns: string
      }
      request_withdrawal: {
        Args: { _amount: number; _upi_id: string; _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "seller" | "buyer"
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
      app_role: ["admin", "moderator", "seller", "buyer"],
    },
  },
} as const
