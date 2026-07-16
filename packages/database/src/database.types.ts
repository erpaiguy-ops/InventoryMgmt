/**
 * Hand-written to match supabase/migrations/*.sql. Regenerate from the live
 * schema at any time with:
 *   pnpm --filter @inventory-mgmt/database types:generate
 * (requires the project to be linked — see package.json scripts).
 */
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type UserRole = 'admin' | 'manager' | 'staff' | 'viewer';
export type StockMovementType =
  'purchase_receipt' | 'sale_shipment' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'return';
export type OrderStatus = 'draft' | 'pending' | 'approved' | 'fulfilled' | 'cancelled';

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: { id: string; name: string; created_at: string; updated_at: string };
        Insert: { id?: string; name: string; created_at?: string; updated_at?: string };
        Update: { id?: string; name?: string; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          full_name: string;
          role: UserRole;
          is_active: boolean;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          organization_id: string;
          email: string;
          full_name: string;
          role?: UserRole;
          is_active?: boolean;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          parent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          parent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
        Relationships: [];
      };
      suppliers: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['suppliers']['Insert']>;
        Relationships: [];
      };
      warehouses: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          address: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          address?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['warehouses']['Insert']>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          organization_id: string;
          sku: string;
          name: string;
          description: string | null;
          category_id: string | null;
          supplier_id: string | null;
          unit_price: number;
          cost_price: number;
          reorder_level: number;
          reorder_quantity: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          sku: string;
          name: string;
          description?: string | null;
          category_id?: string | null;
          supplier_id?: string | null;
          unit_price?: number;
          cost_price?: number;
          reorder_level?: number;
          reorder_quantity?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
        Relationships: [];
      };
      stock_levels: {
        Row: {
          product_id: string;
          warehouse_id: string;
          quantity_on_hand: number;
          quantity_reserved: number;
          quantity_available: number;
          updated_at: string;
        };
        Insert: {
          product_id: string;
          warehouse_id: string;
          quantity_on_hand?: number;
          quantity_reserved?: number;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['stock_levels']['Insert']>;
        Relationships: [];
      };
      stock_movements: {
        Row: {
          id: string;
          organization_id: string;
          product_id: string;
          warehouse_id: string;
          type: StockMovementType;
          quantity: number;
          reference_id: string | null;
          note: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          product_id: string;
          warehouse_id: string;
          type: StockMovementType;
          quantity: number;
          reference_id?: string | null;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['stock_movements']['Insert']>;
        Relationships: [];
      };
      purchase_orders: {
        Row: {
          id: string;
          organization_id: string;
          supplier_id: string;
          warehouse_id: string;
          status: OrderStatus;
          expected_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          supplier_id: string;
          warehouse_id: string;
          status?: OrderStatus;
          expected_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['purchase_orders']['Insert']>;
        Relationships: [];
      };
      purchase_order_lines: {
        Row: {
          id: string;
          purchase_order_id: string;
          product_id: string;
          quantity: number;
          unit_cost: number;
        };
        Insert: {
          id?: string;
          purchase_order_id: string;
          product_id: string;
          quantity: number;
          unit_cost?: number;
        };
        Update: Partial<Database['public']['Tables']['purchase_order_lines']['Insert']>;
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
        Relationships: [];
      };
      sales_orders: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          warehouse_id: string;
          status: OrderStatus;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          warehouse_id: string;
          status?: OrderStatus;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['sales_orders']['Insert']>;
        Relationships: [];
      };
      sales_order_lines: {
        Row: {
          id: string;
          sales_order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
        };
        Insert: {
          id?: string;
          sales_order_id: string;
          product_id: string;
          quantity: number;
          unit_price?: number;
        };
        Update: Partial<Database['public']['Tables']['sales_order_lines']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_organization_id: { Args: Record<string, never>; Returns: string };
      current_role: { Args: Record<string, never>; Returns: UserRole };
    };
    Enums: {
      user_role: UserRole;
      stock_movement_type: StockMovementType;
      order_status: OrderStatus;
    };
  };
}
