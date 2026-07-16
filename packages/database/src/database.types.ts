/**
 * Hand-written to match supabase/migrations/*.sql. Regenerate from the live
 * schema at any time with:
 *   pnpm --filter @inventory-mgmt/database types:generate
 * (requires the project to be linked — see package.json scripts).
 */
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type ProfileRole = 'super_admin' | 'admin' | 'manager' | 'staff';
export type PurchaseOrderStatus = 'draft' | 'pending' | 'received' | 'cancelled';
export type SalesOrderStatus = 'draft' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
export type StockMovementType = 'purchase' | 'sale' | 'adjustment' | 'return';
export type StockMovementReferenceType = 'purchase_order' | 'sales_order' | 'adjustment';
export type NotificationType = 'info' | 'warning' | 'success' | 'error';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: ProfileRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: ProfileRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          sku: string;
          name: string;
          description: string | null;
          category: string | null;
          unit_price: number;
          cost_price: number | null;
          reorder_level: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sku: string;
          name: string;
          description?: string | null;
          category?: string | null;
          unit_price: number;
          cost_price?: number | null;
          reorder_level?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
        Relationships: [];
      };
      inventory: {
        Row: {
          id: string;
          product_id: string;
          quantity: number;
          warehouse_location: string | null;
          last_updated: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          quantity?: number;
          warehouse_location?: string | null;
          last_updated?: string;
        };
        Update: Partial<Database['public']['Tables']['inventory']['Insert']>;
        Relationships: [];
      };
      suppliers: {
        Row: {
          id: string;
          name: string;
          contact_person: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact_person?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['suppliers']['Insert']>;
        Relationships: [];
      };
      purchase_orders: {
        Row: {
          id: string;
          po_number: string;
          supplier_id: string | null;
          order_date: string;
          expected_delivery: string | null;
          status: PurchaseOrderStatus;
          total_amount: number | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          po_number: string;
          supplier_id?: string | null;
          order_date?: string;
          expected_delivery?: string | null;
          status?: PurchaseOrderStatus;
          total_amount?: number | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['purchase_orders']['Insert']>;
        Relationships: [];
      };
      purchase_order_items: {
        Row: {
          id: string;
          po_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
        };
        Insert: {
          id?: string;
          po_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
        };
        Update: Partial<Database['public']['Tables']['purchase_order_items']['Insert']>;
        Relationships: [];
      };
      sales_orders: {
        Row: {
          id: string;
          order_number: string;
          customer_name: string;
          customer_email: string | null;
          order_date: string;
          status: SalesOrderStatus;
          total_amount: number | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          customer_name: string;
          customer_email?: string | null;
          order_date?: string;
          status?: SalesOrderStatus;
          total_amount?: number | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['sales_orders']['Insert']>;
        Relationships: [];
      };
      sales_order_items: {
        Row: {
          id: string;
          so_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
        };
        Insert: {
          id?: string;
          so_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
        };
        Update: Partial<Database['public']['Tables']['sales_order_items']['Insert']>;
        Relationships: [];
      };
      stock_movements: {
        Row: {
          id: string;
          product_id: string;
          quantity_change: number;
          previous_quantity: number;
          new_quantity: number;
          movement_type: StockMovementType;
          reference_id: string | null;
          reference_type: StockMovementReferenceType | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          quantity_change: number;
          /** Set by the apply_stock_movement trigger; safe to omit. */
          previous_quantity?: number;
          /** Set by the apply_stock_movement trigger; safe to omit. */
          new_quantity?: number;
          movement_type: StockMovementType;
          reference_id?: string | null;
          reference_type?: StockMovementReferenceType | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['stock_movements']['Insert']>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string | null;
          title: string;
          message: string;
          type: NotificationType;
          read_at: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          title: string;
          message: string;
          type?: NotificationType;
          read_at?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_role: { Args: Record<string, never>; Returns: ProfileRole };
    };
    Enums: {
      profile_role: ProfileRole;
      purchase_order_status: PurchaseOrderStatus;
      sales_order_status: SalesOrderStatus;
      stock_movement_type: StockMovementType;
      stock_movement_reference_type: StockMovementReferenceType;
      notification_type: NotificationType;
    };
  };
}
