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
      org_settings: {
        Row: {
          tenant_id: string;
          currency: string;
          fiscal_year_start_month: number;
          document_footer: string | null;
          logo_path: string | null;
          po_approval_min_total: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          tenant_id: string;
          currency?: string;
          fiscal_year_start_month?: number;
          document_footer?: string | null;
          logo_path?: string | null;
          po_approval_min_total?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['org_settings']['Insert']>;
        Relationships: [];
      };
      numbering_series: {
        Row: {
          id: string;
          tenant_id: string;
          doc_type: string;
          prefix: string;
          next_number: number;
          padding: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          doc_type: string;
          prefix: string;
          next_number?: number;
          padding?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['numbering_series']['Insert']>;
        Relationships: [];
      };
      taxes: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          rate: number;
          is_inclusive: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          rate: number;
          is_inclusive?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['taxes']['Insert']>;
        Relationships: [];
      };
      uoms: {
        Row: {
          id: string;
          tenant_id: string;
          code: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          code: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['uoms']['Insert']>;
        Relationships: [];
      };
      warehouses: {
        Row: {
          id: string;
          tenant_id: string;
          code: string;
          name: string;
          address: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          code: string;
          name: string;
          address?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['warehouses']['Insert']>;
        Relationships: [];
      };
      item_categories: {
        Row: {
          id: string;
          tenant_id: string;
          parent_id: string | null;
          name: string;
          attribute_schema: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          parent_id?: string | null;
          name: string;
          attribute_schema?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['item_categories']['Insert']>;
        Relationships: [];
      };
      brands: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['brands']['Insert']>;
        Relationships: [];
      };
      items: {
        Row: {
          id: string;
          tenant_id: string;
          sku: string;
          name: string;
          description: string | null;
          item_type: 'stocked' | 'service';
          category_id: string | null;
          brand_id: string | null;
          parent_item_id: string | null;
          base_uom_id: string;
          purchase_uom_id: string | null;
          sales_uom_id: string | null;
          tax_id: string | null;
          tracking: 'none' | 'batch' | 'serial';
          track_expiry: boolean;
          attributes: Json;
          standard_cost: number | null;
          standard_price: number | null;
          status: 'draft' | 'active' | 'discontinued';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          sku: string;
          name: string;
          description?: string | null;
          item_type?: 'stocked' | 'service';
          category_id?: string | null;
          brand_id?: string | null;
          parent_item_id?: string | null;
          base_uom_id: string;
          purchase_uom_id?: string | null;
          sales_uom_id?: string | null;
          tax_id?: string | null;
          tracking?: 'none' | 'batch' | 'serial';
          track_expiry?: boolean;
          attributes?: Json;
          standard_cost?: number | null;
          standard_price?: number | null;
          status?: 'draft' | 'active' | 'discontinued';
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['items']['Insert']>;
        Relationships: [];
      };
      item_uoms: {
        Row: {
          id: string;
          tenant_id: string;
          item_id: string;
          uom_id: string;
          factor_to_base: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          item_id: string;
          uom_id: string;
          factor_to_base: number;
          created_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['item_uoms']['Insert']>;
        Relationships: [];
      };
      item_barcodes: {
        Row: {
          id: string;
          tenant_id: string;
          item_id: string;
          barcode: string;
          uom_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          item_id: string;
          barcode: string;
          uom_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['item_barcodes']['Insert']>;
        Relationships: [];
      };
      price_lists: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          list_type: 'sales' | 'purchase';
          currency: string;
          is_default: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          list_type: 'sales' | 'purchase';
          currency?: string;
          is_default?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['price_lists']['Insert']>;
        Relationships: [];
      };
      price_list_items: {
        Row: {
          id: string;
          tenant_id: string;
          price_list_id: string;
          item_id: string;
          uom_id: string | null;
          min_qty: number;
          unit_price: number;
          valid_from: string | null;
          valid_to: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          price_list_id: string;
          item_id: string;
          uom_id?: string | null;
          min_qty?: number;
          unit_price: number;
          valid_from?: string | null;
          valid_to?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['price_list_items']['Insert']>;
        Relationships: [];
      };
      payment_terms: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          net_days: number;
          early_pay_discount_pct: number | null;
          early_pay_within_days: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          net_days?: number;
          early_pay_discount_pct?: number | null;
          early_pay_within_days?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['payment_terms']['Insert']>;
        Relationships: [];
      };
      partner_groups: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['partner_groups']['Insert']>;
        Relationships: [];
      };
      partners: {
        Row: {
          id: string;
          tenant_id: string;
          code: string | null;
          name: string;
          is_customer: boolean;
          is_supplier: boolean;
          tax_id_number: string | null;
          email: string | null;
          phone: string | null;
          currency: string | null;
          payment_term_id: string | null;
          credit_limit: number | null;
          price_list_id: string | null;
          group_id: string | null;
          status: 'active' | 'on_hold' | 'archived';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          code?: string | null;
          name: string;
          is_customer?: boolean;
          is_supplier?: boolean;
          tax_id_number?: string | null;
          email?: string | null;
          phone?: string | null;
          currency?: string | null;
          payment_term_id?: string | null;
          credit_limit?: number | null;
          price_list_id?: string | null;
          group_id?: string | null;
          status?: 'active' | 'on_hold' | 'archived';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['partners']['Insert']>;
        Relationships: [];
      };
      partner_contacts: {
        Row: {
          id: string;
          tenant_id: string;
          partner_id: string;
          name: string;
          designation: string | null;
          email: string | null;
          phone: string | null;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          partner_id: string;
          name: string;
          designation?: string | null;
          email?: string | null;
          phone?: string | null;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['partner_contacts']['Insert']>;
        Relationships: [];
      };
      partner_addresses: {
        Row: {
          id: string;
          tenant_id: string;
          partner_id: string;
          address_type: 'billing' | 'shipping';
          line1: string;
          line2: string | null;
          city: string | null;
          state: string | null;
          country: string | null;
          postal_code: string | null;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          partner_id: string;
          address_type: 'billing' | 'shipping';
          line1: string;
          line2?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string | null;
          postal_code?: string | null;
          is_default?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['partner_addresses']['Insert']>;
        Relationships: [];
      };
      item_suppliers: {
        Row: {
          id: string;
          tenant_id: string;
          item_id: string;
          partner_id: string;
          supplier_sku: string | null;
          lead_time_days: number | null;
          last_cost: number | null;
          moq: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          item_id: string;
          partner_id: string;
          supplier_sku?: string | null;
          lead_time_days?: number | null;
          last_cost?: number | null;
          moq?: number | null;
          created_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['item_suppliers']['Insert']>;
        Relationships: [];
      };
      reason_codes: {
        Row: {
          id: string;
          tenant_id: string;
          doc_type: string;
          code: string;
          label: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          doc_type: string;
          code: string;
          label: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['reason_codes']['Insert']>;
        Relationships: [];
      };
      approval_workflows: {
        Row: {
          id: string;
          tenant_id: string;
          doc_type: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          doc_type: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['approval_workflows']['Insert']>;
        Relationships: [];
      };
      approval_workflow_steps: {
        Row: {
          id: string;
          tenant_id: string;
          workflow_id: string;
          step_no: number;
          role_id: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          workflow_id: string;
          step_no: number;
          role_id: string;
        };
        Update: Partial<Database['v2']['Tables']['approval_workflow_steps']['Insert']>;
        Relationships: [];
      };
      approval_requests: {
        Row: {
          id: string;
          tenant_id: string;
          doc_type: string;
          doc_id: string;
          workflow_id: string;
          current_step: number;
          status: 'pending' | 'approved' | 'rejected';
          reason_code_id: string | null;
          reason_text: string | null;
          requested_by: string | null;
          created_at: string;
          decided_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          doc_type: string;
          doc_id: string;
          workflow_id: string;
          current_step?: number;
          status?: 'pending' | 'approved' | 'rejected';
          reason_code_id?: string | null;
          reason_text?: string | null;
          requested_by?: string | null;
          created_at?: string;
          decided_at?: string | null;
        };
        Update: Partial<Database['v2']['Tables']['approval_requests']['Insert']>;
        Relationships: [];
      };
      approval_actions: {
        Row: {
          id: string;
          tenant_id: string;
          request_id: string;
          step_no: number;
          actor_id: string | null;
          decision: 'approve' | 'reject';
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          request_id: string;
          step_no: number;
          actor_id?: string | null;
          decision: 'approve' | 'reject';
          comment?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['approval_actions']['Insert']>;
        Relationships: [];
      };
      locations: {
        Row: {
          id: string;
          tenant_id: string;
          warehouse_id: string;
          code: string;
          name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          warehouse_id: string;
          code: string;
          name?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['locations']['Insert']>;
        Relationships: [];
      };
      batches: {
        Row: {
          id: string;
          tenant_id: string;
          item_id: string;
          batch_no: string;
          mfg_date: string | null;
          expiry_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          item_id: string;
          batch_no: string;
          mfg_date?: string | null;
          expiry_date?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['batches']['Insert']>;
        Relationships: [];
      };
      serials: {
        Row: {
          id: string;
          tenant_id: string;
          item_id: string;
          serial_no: string;
          status: 'in_stock' | 'issued' | 'scrapped';
          warehouse_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          item_id: string;
          serial_no: string;
          status?: 'in_stock' | 'issued' | 'scrapped';
          warehouse_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['serials']['Insert']>;
        Relationships: [];
      };
      item_costs: {
        Row: {
          tenant_id: string;
          item_id: string;
          qty_on_hand: number;
          avg_cost: number;
          updated_at: string;
        };
        Insert: {
          tenant_id: string;
          item_id: string;
          qty_on_hand?: number;
          avg_cost?: number;
          updated_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['item_costs']['Insert']>;
        Relationships: [];
      };
      stock_ledger: {
        Row: {
          id: string;
          tenant_id: string;
          item_id: string;
          warehouse_id: string;
          location_id: string | null;
          batch_id: string | null;
          qty: number;
          unit_cost: number | null;
          movement_type: string;
          source_doc_type: string;
          source_doc_id: string;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          item_id: string;
          warehouse_id: string;
          location_id?: string | null;
          batch_id?: string | null;
          qty: number;
          unit_cost?: number | null;
          movement_type: string;
          source_doc_type: string;
          source_doc_id: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['stock_ledger']['Insert']>;
        Relationships: [];
      };
      stock_balances: {
        Row: {
          id: string;
          tenant_id: string;
          item_id: string;
          warehouse_id: string;
          batch_id: string | null;
          qty_on_hand: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          item_id: string;
          warehouse_id: string;
          batch_id?: string | null;
          qty_on_hand?: number;
          updated_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['stock_balances']['Insert']>;
        Relationships: [];
      };
      stock_transfers: {
        Row: {
          id: string;
          tenant_id: string;
          doc_no: string;
          from_warehouse_id: string;
          to_warehouse_id: string;
          status: 'draft' | 'in_transit' | 'received' | 'cancelled';
          notes: string | null;
          created_by: string | null;
          dispatched_at: string | null;
          received_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          doc_no: string;
          from_warehouse_id: string;
          to_warehouse_id: string;
          status?: 'draft' | 'in_transit' | 'received' | 'cancelled';
          notes?: string | null;
          created_by?: string | null;
          dispatched_at?: string | null;
          received_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['stock_transfers']['Insert']>;
        Relationships: [];
      };
      stock_transfer_lines: {
        Row: {
          id: string;
          tenant_id: string;
          transfer_id: string;
          item_id: string;
          batch_id: string | null;
          qty: number;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          transfer_id: string;
          item_id: string;
          batch_id?: string | null;
          qty: number;
        };
        Update: Partial<Database['v2']['Tables']['stock_transfer_lines']['Insert']>;
        Relationships: [];
      };
      stock_adjustments: {
        Row: {
          id: string;
          tenant_id: string;
          doc_no: string;
          warehouse_id: string;
          status: 'draft' | 'pending_approval' | 'posted' | 'rejected';
          is_opening: boolean;
          notes: string | null;
          created_by: string | null;
          posted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          doc_no: string;
          warehouse_id: string;
          status?: 'draft' | 'pending_approval' | 'posted' | 'rejected';
          is_opening?: boolean;
          notes?: string | null;
          created_by?: string | null;
          posted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['stock_adjustments']['Insert']>;
        Relationships: [];
      };
      stock_adjustment_lines: {
        Row: {
          id: string;
          tenant_id: string;
          adjustment_id: string;
          item_id: string;
          batch_no: string | null;
          expiry_date: string | null;
          qty_change: number;
          unit_cost: number | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          adjustment_id: string;
          item_id: string;
          batch_no?: string | null;
          expiry_date?: string | null;
          qty_change: number;
          unit_cost?: number | null;
        };
        Update: Partial<Database['v2']['Tables']['stock_adjustment_lines']['Insert']>;
        Relationships: [];
      };
      stock_audits: {
        Row: {
          id: string;
          tenant_id: string;
          doc_no: string;
          warehouse_id: string;
          status: 'counting' | 'pending_approval' | 'posted' | 'rejected';
          notes: string | null;
          created_by: string | null;
          posted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          doc_no: string;
          warehouse_id: string;
          status?: 'counting' | 'pending_approval' | 'posted' | 'rejected';
          notes?: string | null;
          created_by?: string | null;
          posted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['stock_audits']['Insert']>;
        Relationships: [];
      };
      stock_audit_lines: {
        Row: {
          id: string;
          tenant_id: string;
          audit_id: string;
          item_id: string;
          batch_id: string | null;
          system_qty: number;
          counted_qty: number | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          audit_id: string;
          item_id: string;
          batch_id?: string | null;
          system_qty?: number;
          counted_qty?: number | null;
        };
        Update: Partial<Database['v2']['Tables']['stock_audit_lines']['Insert']>;
        Relationships: [];
      };
      reorder_rules: {
        Row: {
          id: string;
          tenant_id: string;
          item_id: string;
          warehouse_id: string;
          min_qty: number;
          reorder_qty: number;
          preferred_supplier_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          item_id: string;
          warehouse_id: string;
          min_qty?: number;
          reorder_qty?: number;
          preferred_supplier_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['reorder_rules']['Insert']>;
        Relationships: [];
      };
      purchase_orders: {
        Row: {
          id: string;
          tenant_id: string;
          doc_no: string;
          supplier_id: string;
          warehouse_id: string;
          order_date: string;
          expected_date: string | null;
          status:
            'draft' | 'pending_approval' | 'confirmed' | 'received' | 'cancelled' | 'rejected';
          subtotal: number;
          tax_total: number;
          total: number;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          doc_no: string;
          supplier_id: string;
          warehouse_id: string;
          order_date?: string;
          expected_date?: string | null;
          status?:
            'draft' | 'pending_approval' | 'confirmed' | 'received' | 'cancelled' | 'rejected';
          subtotal?: number;
          tax_total?: number;
          total?: number;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['purchase_orders']['Insert']>;
        Relationships: [];
      };
      purchase_order_lines: {
        Row: {
          id: string;
          tenant_id: string;
          po_id: string;
          item_id: string;
          qty: number;
          unit_price: number;
          tax_id: string | null;
          line_total: number;
          qty_received: number;
          qty_billed: number;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          po_id: string;
          item_id: string;
          qty: number;
          unit_price: number;
          tax_id?: string | null;
          qty_received?: number;
          qty_billed?: number;
        };
        Update: Partial<Database['v2']['Tables']['purchase_order_lines']['Insert']>;
        Relationships: [];
      };
      goods_receipts: {
        Row: {
          id: string;
          tenant_id: string;
          doc_no: string;
          po_id: string;
          warehouse_id: string;
          status: 'draft' | 'posted';
          notes: string | null;
          created_by: string | null;
          posted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          doc_no: string;
          po_id: string;
          warehouse_id: string;
          status?: 'draft' | 'posted';
          notes?: string | null;
          created_by?: string | null;
          posted_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['goods_receipts']['Insert']>;
        Relationships: [];
      };
      goods_receipt_lines: {
        Row: {
          id: string;
          tenant_id: string;
          gr_id: string;
          po_line_id: string;
          item_id: string;
          qty: number;
          unit_cost: number;
          batch_no: string | null;
          expiry_date: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          gr_id: string;
          po_line_id: string;
          item_id: string;
          qty: number;
          unit_cost: number;
          batch_no?: string | null;
          expiry_date?: string | null;
        };
        Update: Partial<Database['v2']['Tables']['goods_receipt_lines']['Insert']>;
        Relationships: [];
      };
      purchase_bills: {
        Row: {
          id: string;
          tenant_id: string;
          doc_no: string;
          po_id: string;
          supplier_id: string;
          supplier_bill_no: string | null;
          bill_date: string;
          due_date: string | null;
          status: 'open' | 'paid' | 'cancelled';
          total: number;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          doc_no: string;
          po_id: string;
          supplier_id: string;
          supplier_bill_no?: string | null;
          bill_date?: string;
          due_date?: string | null;
          status?: 'open' | 'paid' | 'cancelled';
          total?: number;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['purchase_bills']['Insert']>;
        Relationships: [];
      };
      purchase_bill_lines: {
        Row: {
          id: string;
          tenant_id: string;
          bill_id: string;
          po_line_id: string;
          item_id: string;
          qty: number;
          unit_price: number;
          line_total: number;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          bill_id: string;
          po_line_id: string;
          item_id: string;
          qty: number;
          unit_price: number;
        };
        Update: Partial<Database['v2']['Tables']['purchase_bill_lines']['Insert']>;
        Relationships: [];
      };
      purchase_returns: {
        Row: {
          id: string;
          tenant_id: string;
          doc_no: string;
          supplier_id: string;
          warehouse_id: string;
          reason_code_id: string | null;
          reason_text: string | null;
          status: 'posted' | 'cancelled';
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          doc_no: string;
          supplier_id: string;
          warehouse_id: string;
          reason_code_id?: string | null;
          reason_text?: string | null;
          status?: 'posted' | 'cancelled';
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['purchase_returns']['Insert']>;
        Relationships: [];
      };
      purchase_return_lines: {
        Row: {
          id: string;
          tenant_id: string;
          return_id: string;
          item_id: string;
          batch_id: string | null;
          qty: number;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          return_id: string;
          item_id: string;
          batch_id?: string | null;
          qty: number;
        };
        Update: Partial<Database['v2']['Tables']['purchase_return_lines']['Insert']>;
        Relationships: [];
      };
      landed_cost_vouchers: {
        Row: {
          id: string;
          tenant_id: string;
          doc_no: string;
          gr_id: string;
          description: string;
          amount: number;
          status: 'draft' | 'posted';
          created_by: string | null;
          posted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          doc_no: string;
          gr_id: string;
          description: string;
          amount: number;
          status?: 'draft' | 'posted';
          created_by?: string | null;
          posted_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['v2']['Tables']['landed_cost_vouchers']['Insert']>;
        Relationships: [];
      };
      landed_cost_allocations: {
        Row: {
          id: string;
          tenant_id: string;
          voucher_id: string;
          item_id: string;
          amount: number;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          voucher_id: string;
          item_id: string;
          amount: number;
        };
        Update: Partial<Database['v2']['Tables']['landed_cost_allocations']['Insert']>;
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
      next_doc_number: {
        Args: { p_tenant_id: string; p_doc_type: string };
        Returns: string;
      };
      post_stock_adjustment: {
        Args: { p_tenant_id: string; p_doc_id: string };
        Returns: undefined;
      };
      post_stock_audit: {
        Args: { p_tenant_id: string; p_doc_id: string };
        Returns: undefined;
      };
      post_stock_transfer_dispatch: {
        Args: { p_tenant_id: string; p_doc_id: string };
        Returns: undefined;
      };
      post_stock_transfer_receive: {
        Args: { p_tenant_id: string; p_doc_id: string };
        Returns: undefined;
      };
      post_goods_receipt: {
        Args: { p_tenant_id: string; p_doc_id: string };
        Returns: undefined;
      };
      post_purchase_return: {
        Args: { p_tenant_id: string; p_doc_id: string };
        Returns: undefined;
      };
      post_landed_cost: {
        Args: { p_tenant_id: string; p_doc_id: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
  };
}
