-- ==============================================================================
-- Inventory Management ERP — initial schema
-- ==============================================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------------------
-- Organizations & user profiles (profile row per auth.users entry)
-- ------------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.user_role as enum ('admin', 'manager', 'staff', 'viewer');

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  full_name text not null,
  role public.user_role not null default 'staff',
  is_active boolean not null default true,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_organization_id_idx on public.profiles (organization_id);

-- ------------------------------------------------------------------------------
-- Catalog: categories, suppliers, warehouses, products
-- ------------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  parent_id uuid references public.categories (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  address text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  sku text not null,
  name text not null,
  description text,
  category_id uuid references public.categories (id) on delete set null,
  supplier_id uuid references public.suppliers (id) on delete set null,
  unit_price numeric(12, 2) not null default 0,
  cost_price numeric(12, 2) not null default 0,
  reorder_level integer not null default 0,
  reorder_quantity integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, sku)
);

create index if not exists products_organization_id_idx on public.products (organization_id);
create index if not exists products_category_id_idx on public.products (category_id);
create index if not exists products_supplier_id_idx on public.products (supplier_id);

-- ------------------------------------------------------------------------------
-- Stock levels & movements
-- ------------------------------------------------------------------------------
create table if not exists public.stock_levels (
  product_id uuid not null references public.products (id) on delete cascade,
  warehouse_id uuid not null references public.warehouses (id) on delete cascade,
  quantity_on_hand integer not null default 0,
  quantity_reserved integer not null default 0,
  quantity_available integer generated always as (quantity_on_hand - quantity_reserved) stored,
  updated_at timestamptz not null default now(),
  primary key (product_id, warehouse_id)
);

create type public.stock_movement_type as enum (
  'purchase_receipt',
  'sale_shipment',
  'adjustment',
  'transfer_in',
  'transfer_out',
  'return'
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  warehouse_id uuid not null references public.warehouses (id) on delete cascade,
  type public.stock_movement_type not null,
  quantity integer not null,
  reference_id uuid,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stock_movements_product_id_idx on public.stock_movements (product_id);
create index if not exists stock_movements_warehouse_id_idx on public.stock_movements (warehouse_id);

-- ------------------------------------------------------------------------------
-- Purchase orders
-- ------------------------------------------------------------------------------
create type public.order_status as enum ('draft', 'pending', 'approved', 'fulfilled', 'cancelled');

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  warehouse_id uuid not null references public.warehouses (id) on delete restrict,
  status public.order_status not null default 'draft',
  expected_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_cost numeric(12, 2) not null default 0
);

create index if not exists purchase_order_lines_po_id_idx on public.purchase_order_lines (purchase_order_id);

-- ------------------------------------------------------------------------------
-- Customers & sales orders
-- ------------------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete restrict,
  warehouse_id uuid not null references public.warehouses (id) on delete restrict,
  status public.order_status not null default 'draft',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales_order_lines (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references public.sales_orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null default 0
);

create index if not exists sales_order_lines_so_id_idx on public.sales_order_lines (sales_order_id);

-- ------------------------------------------------------------------------------
-- updated_at trigger helper
-- ------------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'organizations', 'profiles', 'categories', 'suppliers', 'warehouses',
      'products', 'stock_movements', 'purchase_orders', 'customers', 'sales_orders'
    ])
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at();',
      t
    );
  end loop;
end;
$$;
