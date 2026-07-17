-- ==============================================================================
-- Inventory Management ERP — complete database schema
-- Project: dmoqvnkdnrclojhcpnre
--
-- Safe to run standalone in the Supabase SQL Editor, or via
-- `pnpm --filter @inventory-mgmt/database migrate`.
-- ==============================================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. profiles — extends auth.users
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'staff' check (role in ('super_admin', 'admin', 'manager', 'staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------------------
-- 2. products
-- ------------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  description text,
  category text,
  unit_price decimal(10, 2) not null,
  cost_price decimal(10, 2),
  reorder_level integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category);

-- ------------------------------------------------------------------------------
-- 3. inventory — one row per product
-- ------------------------------------------------------------------------------
create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products (id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  warehouse_location text,
  last_updated timestamptz not null default now()
);

-- ------------------------------------------------------------------------------
-- 4. suppliers
-- ------------------------------------------------------------------------------
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  email text,
  phone text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------------------
-- 5. purchase_orders
-- ------------------------------------------------------------------------------
create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique,
  supplier_id uuid references public.suppliers (id) on delete restrict,
  order_date timestamptz not null default now(),
  expected_delivery date,
  status text not null default 'draft' check (status in ('draft', 'pending', 'received', 'cancelled')),
  total_amount decimal(10, 2),
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists purchase_orders_supplier_id_idx on public.purchase_orders (supplier_id);
create index if not exists purchase_orders_status_idx on public.purchase_orders (status);

-- ------------------------------------------------------------------------------
-- 6. purchase_order_items
-- ------------------------------------------------------------------------------
create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references public.purchase_orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price decimal(10, 2) not null,
  total_price decimal(10, 2) generated always as (quantity * unit_price) stored
);

create index if not exists purchase_order_items_po_id_idx on public.purchase_order_items (po_id);
create index if not exists purchase_order_items_product_id_idx on public.purchase_order_items (product_id);

-- ------------------------------------------------------------------------------
-- 7. sales_orders
-- ------------------------------------------------------------------------------
create table if not exists public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null,
  customer_email text,
  order_date timestamptz not null default now(),
  status text not null default 'draft'
    check (status in ('draft', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  total_amount decimal(10, 2),
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_orders_status_idx on public.sales_orders (status);

-- ------------------------------------------------------------------------------
-- 8. sales_order_items
-- ------------------------------------------------------------------------------
create table if not exists public.sales_order_items (
  id uuid primary key default gen_random_uuid(),
  so_id uuid not null references public.sales_orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price decimal(10, 2) not null,
  total_price decimal(10, 2) generated always as (quantity * unit_price) stored
);

create index if not exists sales_order_items_so_id_idx on public.sales_order_items (so_id);
create index if not exists sales_order_items_product_id_idx on public.sales_order_items (product_id);

-- ------------------------------------------------------------------------------
-- 9. stock_movements — audit log; also the source of truth for inventory changes
-- ------------------------------------------------------------------------------
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  quantity_change integer not null,
  previous_quantity integer not null,
  new_quantity integer not null,
  movement_type text not null check (movement_type in ('purchase', 'sale', 'adjustment', 'return')),
  reference_id uuid,
  reference_type text check (reference_type in ('purchase_order', 'sales_order', 'adjustment')),
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_product_id_idx on public.stock_movements (product_id);
create index if not exists stock_movements_created_at_idx on public.stock_movements (created_at);
create index if not exists stock_movements_reference_idx on public.stock_movements (reference_type, reference_id);

-- ------------------------------------------------------------------------------
-- 10. notifications
-- ------------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info' check (type in ('info', 'warning', 'success', 'error')),
  read_at timestamptz,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications (user_id);
create index if not exists notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- ==============================================================================
-- Triggers & functions
-- ==============================================================================

-- updated_at / last_updated maintenance -----------------------------------------
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
    select unnest(array['profiles', 'products', 'suppliers', 'purchase_orders', 'sales_orders'])
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at();',
      t
    );
  end loop;
end;
$$;

create or replace function public.set_inventory_last_updated()
returns trigger
language plpgsql
as $$
begin
  new.last_updated = now();
  return new;
end;
$$;

create trigger set_inventory_last_updated
  before update on public.inventory
  for each row execute function public.set_inventory_last_updated();

-- auth.users -> profiles -------------------------------------------------------
-- Keeps profiles in sync with Supabase Auth: every new signup gets a profile row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- products -> inventory ---------------------------------------------------------
-- Every product gets a matching inventory row (starting at zero) so callers
-- never have to special-case a missing inventory record for a valid product.
create or replace function public.create_inventory_row()
returns trigger
language plpgsql
as $$
begin
  insert into public.inventory (product_id, quantity)
  values (new.id, 0)
  on conflict (product_id) do nothing;
  return new;
end;
$$;

create trigger create_inventory_row
  after insert on public.products
  for each row execute function public.create_inventory_row();

-- stock_movements -> inventory ---------------------------------------------------
-- stock_movements is the single write path for stock changes: insert a row with
-- product_id, quantity_change, movement_type (and optional reference/notes) and
-- this trigger fills in previous_quantity/new_quantity and updates inventory
-- for you — atomically, with the inventory row locked for the duration.
create or replace function public.apply_stock_movement()
returns trigger
language plpgsql
as $$
declare
  current_quantity integer;
begin
  select quantity into current_quantity
  from public.inventory
  where product_id = new.product_id
  for update;

  if not found then
    insert into public.inventory (product_id, quantity)
    values (new.product_id, 0);
    current_quantity := 0;
  end if;

  new.previous_quantity := current_quantity;
  new.new_quantity := current_quantity + new.quantity_change;

  if new.new_quantity < 0 then
    raise exception 'Insufficient stock for product %: % + (%) would be negative',
      new.product_id, current_quantity, new.quantity_change;
  end if;

  update public.inventory
  set quantity = new.new_quantity
  where product_id = new.product_id;

  return new;
end;
$$;

create trigger apply_stock_movement
  before insert on public.stock_movements
  for each row execute function public.apply_stock_movement();

-- ==============================================================================
-- Row Level Security
-- All authenticated staff share one workspace (no multi-tenancy in this schema).
-- ==============================================================================

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.inventory enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.sales_orders enable row level security;
alter table public.sales_order_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.notifications enable row level security;

-- profiles: everyone can view the staff directory; users manage their own row;
-- admins/super_admins can manage any profile (e.g. changing roles).
create policy "profiles_select_all" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid());

create policy "profiles_update_admin" on public.profiles
  for update using (public.current_role() in ('admin', 'super_admin'));

-- shared operational tables: any authenticated user can read/write day-to-day
-- records; only admins/super_admins can delete.
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'products', 'inventory', 'suppliers', 'purchase_orders', 'purchase_order_items',
      'sales_orders', 'sales_order_items', 'stock_movements'
    ])
  loop
    execute format(
      'create policy "%1$s_select_authenticated" on public.%1$s for select using (auth.role() = ''authenticated'');',
      t
    );
    execute format(
      'create policy "%1$s_insert_authenticated" on public.%1$s for insert with check (auth.role() = ''authenticated'');',
      t
    );
    execute format(
      'create policy "%1$s_update_authenticated" on public.%1$s for update using (auth.role() = ''authenticated'');',
      t
    );
    execute format(
      'create policy "%1$s_delete_admin" on public.%1$s for delete using (public.current_role() in (''admin'', ''super_admin''));',
      t
    );
  end loop;
end;
$$;

-- notifications: strictly per-user; created by the backend (service role),
-- which bypasses RLS, so there is no client-facing insert policy.
create policy "notifications_select_own" on public.notifications
  for select using (user_id = auth.uid());

create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid());
