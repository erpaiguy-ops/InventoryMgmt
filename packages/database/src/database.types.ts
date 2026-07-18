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

export type V2OrganizationStatus = 'active' | 'suspended';
export type V2ProfileStatus = 'active' | 'suspended';
export type V2PermissionAction = 'view' | 'create' | 'update' | 'delete' | 'manage';

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
  v2: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          status: V2OrganizationStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          status?: V2OrganizationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['organizations']['Insert']>;
        Relationships: [];
      };
      platform_owners: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['platform_owners']['Insert']>;
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          tenant_id: string;
          slug: string;
          name: string;
          is_system: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          slug: string;
          name: string;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['roles']['Insert']>;
        Relationships: [];
      };
      permissions: {
        Row: {
          id: string;
          role_id: string;
          module: string;
          action: V2PermissionAction;
          allow: boolean;
        };
        Insert: {
          id?: string;
          role_id: string;
          module: string;
          action: V2PermissionAction;
          allow?: boolean;
        };
        Update: Partial<Database['v2']['Tables']['permissions']['Insert']>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          tenant_id: string;
          username: string;
          role_id: string;
          full_name: string | null;
          status: V2ProfileStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          tenant_id: string;
          username: string;
          role_id: string;
          full_name?: string | null;
          status?: V2ProfileStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          tenant_id: string;
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
          tenant_id: string;
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
        Update: Partial<Database['v2']['Tables']['products']['Insert']>;
        Relationships: [];
      };
      inventory: {
        Row: {
          id: string;
          tenant_id: string;
          product_id: string;
          quantity: number;
          warehouse_location: string | null;
          last_updated: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          product_id: string;
          quantity?: number;
          warehouse_location?: string | null;
          last_updated?: string;
        };
        Update: Partial<Database['v2']['Tables']['inventory']['Insert']>;
        Relationships: [];
      };
      suppliers: {
        Row: {
          id: string;
          tenant_id: string;
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
          tenant_id: string;
          name: string;
          contact_person?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['suppliers']['Insert']>;
        Relationships: [];
      };
      purchase_orders: {
        Row: {
          id: string;
          tenant_id: string;
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
          tenant_id: string;
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
        Update: Partial<Database['v2']['Tables']['purchase_orders']['Insert']>;
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
        Update: Partial<Database['v2']['Tables']['purchase_order_items']['Insert']>;
        Relationships: [];
      };
      sales_orders: {
        Row: {
          id: string;
          tenant_id: string;
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
          tenant_id: string;
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
        Update: Partial<Database['v2']['Tables']['sales_orders']['Insert']>;
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
        Update: Partial<Database['v2']['Tables']['sales_order_items']['Insert']>;
        Relationships: [];
      };
      stock_movements: {
        Row: {
          id: string;
          tenant_id: string;
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
          tenant_id: string;
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
        Update: Partial<Database['v2']['Tables']['stock_movements']['Insert']>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          tenant_id: string;
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
          tenant_id: string;
          user_id?: string | null;
          title: string;
          message: string;
          type?: NotificationType;
          read_at?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['notifications']['Insert']>;
        Relationships: [];
      };
    };
    Views: {
      profile_with_permissions: {
        Row: {
          id: string;
          tenant_id: string;
          username: string;
          full_name: string | null;
          status: V2ProfileStatus;
          role_id: string;
          role_slug: string;
          role_name: string;
          permissions: Record<string, V2PermissionAction[]>;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_organization_with_defaults: {
        Args: { org_name: string; org_slug: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
  };
}
