-- ==============================================================================
-- v2 Phase 2 — operational tables ported from v1 (schema `public`) into the
-- tenant-scoped v2 structure: products, inventory, suppliers, purchase orders,
-- sales orders, stock movements, notifications.
--
-- Differences from the v1 originals, all deliberate:
--   * every table carries tenant_id -> v2.organizations (cascade on delete)
--   * global unique constraints become per-tenant: (tenant_id, sku),
--     (tenant_id, po_number), (tenant_id, order_number)
--   * created_by references v2.profiles rather than auth.users directly
--   * cross-table triggers enforce tenant consistency (an order item's product
--     must belong to the same tenant as its order)
--   * default role permissions now cover all operational modules; existing
--     tenants are backfilled at the bottom of this file
--
-- Safe to run standalone in the Supabase SQL Editor, or via
-- `pnpm --filter @inventory-mgmt/database migrate`. Requires
-- 20260717000001_v2_foundation_schema.sql to have been applied first.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. products
-- ------------------------------------------------------------------------------
create table if not exists v2.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  sku text not null,
  name text not null,
  description text,
  category text,
  unit_price decimal(10, 2) not null,
  cost_price decimal(10, 2),
  reorder_level integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, sku)
);

create index if not exists v2_products_tenant_id_idx on v2.products (tenant_id);
create index if not exists v2_products_category_idx on v2.products (tenant_id, category);

-- ------------------------------------------------------------------------------
-- 2. inventory — one row per product
-- ------------------------------------------------------------------------------
create table if not exists v2.inventory (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  product_id uuid not null unique references v2.products (id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  warehouse_location text,
  last_updated timestamptz not null default now()
);

create index if not exists v2_inventory_tenant_id_idx on v2.inventory (tenant_id);

-- ------------------------------------------------------------------------------
-- 3. suppliers
-- ------------------------------------------------------------------------------
create table if not exists v2.suppliers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  name text not null,
  contact_person text,
  email text,
  phone text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists v2_suppliers_tenant_id_idx on v2.suppliers (tenant_id);

-- ------------------------------------------------------------------------------
-- 4. purchase_orders
-- ------------------------------------------------------------------------------
create table if not exists v2.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  po_number text not null,
  supplier_id uuid references v2.suppliers (id) on delete restrict,
  order_date timestamptz not null default now(),
  expected_delivery date,
  status text not null default 'draft' check (status in ('draft', 'pending', 'received', 'cancelled')),
  total_amount decimal(10, 2),
  notes text,
  created_by uuid references v2.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, po_number)
);

create index if not exists v2_purchase_orders_tenant_id_idx on v2.purchase_orders (tenant_id);
create index if not exists v2_purchase_orders_supplier_id_idx on v2.purchase_orders (supplier_id);
create index if not exists v2_purchase_orders_status_idx on v2.purchase_orders (tenant_id, status);

-- ------------------------------------------------------------------------------
-- 5. purchase_order_items
-- ------------------------------------------------------------------------------
create table if not exists v2.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references v2.purchase_orders (id) on delete cascade,
  product_id uuid not null references v2.products (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price decimal(10, 2) not null,
  total_price decimal(10, 2) generated always as (quantity * unit_price) stored
);

create index if not exists v2_purchase_order_items_po_id_idx on v2.purchase_order_items (po_id);
create index if not exists v2_purchase_order_items_product_id_idx on v2.purchase_order_items (product_id);

-- ------------------------------------------------------------------------------
-- 6. sales_orders
-- ------------------------------------------------------------------------------
create table if not exists v2.sales_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  order_number text not null,
  customer_name text not null,
  customer_email text,
  order_date timestamptz not null default now(),
  status text not null default 'draft'
    check (status in ('draft', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  total_amount decimal(10, 2),
  notes text,
  created_by uuid references v2.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, order_number)
);

create index if not exists v2_sales_orders_tenant_id_idx on v2.sales_orders (tenant_id);
create index if not exists v2_sales_orders_status_idx on v2.sales_orders (tenant_id, status);

-- ------------------------------------------------------------------------------
-- 7. sales_order_items
-- ------------------------------------------------------------------------------
create table if not exists v2.sales_order_items (
  id uuid primary key default gen_random_uuid(),
  so_id uuid not null references v2.sales_orders (id) on delete cascade,
  product_id uuid not null references v2.products (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price decimal(10, 2) not null,
  total_price decimal(10, 2) generated always as (quantity * unit_price) stored
);

create index if not exists v2_sales_order_items_so_id_idx on v2.sales_order_items (so_id);
create index if not exists v2_sales_order_items_product_id_idx on v2.sales_order_items (product_id);

-- ------------------------------------------------------------------------------
-- 8. stock_movements — audit log; also the single write path for stock changes
-- ------------------------------------------------------------------------------
create table if not exists v2.stock_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  product_id uuid not null references v2.products (id) on delete cascade,
  quantity_change integer not null,
  previous_quantity integer not null,
  new_quantity integer not null,
  movement_type text not null check (movement_type in ('purchase', 'sale', 'adjustment', 'return')),
  reference_id uuid,
  reference_type text check (reference_type in ('purchase_order', 'sales_order', 'adjustment')),
  notes text,
  created_by uuid references v2.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists v2_stock_movements_tenant_id_idx on v2.stock_movements (tenant_id);
create index if not exists v2_stock_movements_product_id_idx on v2.stock_movements (product_id);
create index if not exists v2_stock_movements_created_at_idx on v2.stock_movements (tenant_id, created_at);
create index if not exists v2_stock_movements_reference_idx on v2.stock_movements (reference_type, reference_id);

-- ------------------------------------------------------------------------------
-- 9. notifications
-- ------------------------------------------------------------------------------
create table if not exists v2.notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  user_id uuid references v2.profiles (id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info' check (type in ('info', 'warning', 'success', 'error')),
  read_at timestamptz,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists v2_notifications_user_id_idx on v2.notifications (user_id);
create index if not exists v2_notifications_unread_idx on v2.notifications (user_id) where read_at is null;

grant select, insert, update, delete on all tables in schema v2 to authenticated, service_role;

-- ==============================================================================
-- Triggers & functions
-- ==============================================================================

-- updated_at maintenance (v2.set_updated_at defined in the foundation migration)
do $$
declare
  t text;
begin
  for t in
    select unnest(array['products', 'suppliers', 'purchase_orders', 'sales_orders'])
  loop
    execute format(
      'drop trigger if exists set_updated_at on v2.%I; create trigger set_updated_at before update on v2.%I for each row execute function v2.set_updated_at();',
      t, t
    );
  end loop;
end;
$$;

create or replace function v2.set_inventory_last_updated()
returns trigger
language plpgsql
as $$
begin
  new.last_updated = now();
  return new;
end;
$$;

drop trigger if exists set_inventory_last_updated on v2.inventory;
create trigger set_inventory_last_updated
  before update on v2.inventory
  for each row execute function v2.set_inventory_last_updated();

-- products -> inventory ---------------------------------------------------------
-- Every product gets a matching inventory row (starting at zero), stamped with
-- the product's own tenant_id so callers never special-case a missing row.
create or replace function v2.create_inventory_row()
returns trigger
language plpgsql
as $$
begin
  insert into v2.inventory (tenant_id, product_id, quantity)
  values (new.tenant_id, new.id, 0)
  on conflict (product_id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_inventory_row on v2.products;
create trigger create_inventory_row
  after insert on v2.products
  for each row execute function v2.create_inventory_row();

-- stock_movements -> inventory ---------------------------------------------------
-- Single write path for stock changes, ported from v1: insert a movement with
-- product_id + quantity_change and this trigger fills previous/new quantities
-- and updates inventory atomically, with the inventory row locked. Additionally
-- (new in v2) it verifies the movement's tenant matches the product's tenant,
-- as defense-in-depth under the service-role client.
create or replace function v2.apply_stock_movement()
returns trigger
language plpgsql
as $$
declare
  current_quantity integer;
  product_tenant uuid;
begin
  select tenant_id into product_tenant from v2.products where id = new.product_id;

  if product_tenant is null then
    raise exception 'Product % not found', new.product_id;
  end if;

  if product_tenant <> new.tenant_id then
    raise exception 'Tenant mismatch: product % belongs to a different organization', new.product_id;
  end if;

  select quantity into current_quantity
  from v2.inventory
  where product_id = new.product_id
  for update;

  if not found then
    insert into v2.inventory (tenant_id, product_id, quantity)
    values (new.tenant_id, new.product_id, 0);
    current_quantity := 0;
  end if;

  new.previous_quantity := current_quantity;
  new.new_quantity := current_quantity + new.quantity_change;

  if new.new_quantity < 0 then
    raise exception 'Insufficient stock for product %: % + (%) would be negative',
      new.product_id, current_quantity, new.quantity_change;
  end if;

  update v2.inventory
  set quantity = new.new_quantity
  where product_id = new.product_id;

  return new;
end;
$$;

drop trigger if exists apply_stock_movement on v2.stock_movements;
create trigger apply_stock_movement
  before insert on v2.stock_movements
  for each row execute function v2.apply_stock_movement();

-- order items -> tenant consistency ---------------------------------------------
-- An item's product must belong to the same tenant as its parent order. The
-- service layer already scopes both lookups, but the service-role client
-- bypasses RLS, so this is the structural backstop against a bug joining
-- records across organizations.
create or replace function v2.check_po_item_tenant()
returns trigger
language plpgsql
as $$
declare
  order_tenant uuid;
  product_tenant uuid;
begin
  select tenant_id into order_tenant from v2.purchase_orders where id = new.po_id;
  select tenant_id into product_tenant from v2.products where id = new.product_id;

  if order_tenant is distinct from product_tenant then
    raise exception 'Tenant mismatch: product % does not belong to the purchase order''s organization', new.product_id;
  end if;
  return new;
end;
$$;

drop trigger if exists check_po_item_tenant on v2.purchase_order_items;
create trigger check_po_item_tenant
  before insert or update on v2.purchase_order_items
  for each row execute function v2.check_po_item_tenant();

create or replace function v2.check_so_item_tenant()
returns trigger
language plpgsql
as $$
declare
  order_tenant uuid;
  product_tenant uuid;
begin
  select tenant_id into order_tenant from v2.sales_orders where id = new.so_id;
  select tenant_id into product_tenant from v2.products where id = new.product_id;

  if order_tenant is distinct from product_tenant then
    raise exception 'Tenant mismatch: product % does not belong to the sales order''s organization', new.product_id;
  end if;
  return new;
end;
$$;

drop trigger if exists check_so_item_tenant on v2.sales_order_items;
create trigger check_so_item_tenant
  before insert or update on v2.sales_order_items
  for each row execute function v2.check_so_item_tenant();

-- ==============================================================================
-- Default role permissions — expanded to cover all operational modules.
-- Mirrors v1's semantics: staff and managers can view/create/update day-to-day
-- records; delete is admin-only; reports are view-only below admin.
-- ==============================================================================

-- Single source of the default permission matrix, reused by both
-- create_organization_with_defaults (new tenants) and the backfill below
-- (existing tenants), so the two can never drift.
create or replace function v2.seed_default_permissions(
  admin_role_id uuid,
  manager_role_id uuid,
  staff_role_id uuid
)
returns void
language plpgsql
security definer
set search_path = v2
as $$
declare
  operational_modules text[] := array['products', 'inventory', 'suppliers', 'purchase-orders', 'sales-orders'];
  all_actions text[] := array['view', 'create', 'update', 'delete', 'manage'];
  m text;
begin
  -- tenant_admin: everything on every module
  foreach m in array operational_modules || array['users', 'reports'] loop
    insert into v2.permissions (role_id, module, action)
    select admin_role_id, m, a from unnest(all_actions) as a
    on conflict (role_id, module, action) do nothing;
  end loop;

  -- manager / staff: view/create/update on operational modules (v1 let any
  -- authenticated staff write day-to-day records; only admins could delete)
  foreach m in array operational_modules loop
    insert into v2.permissions (role_id, module, action)
    select r, m, a
    from unnest(array[manager_role_id, staff_role_id]) as r,
         unnest(array['view', 'create', 'update']) as a
    on conflict (role_id, module, action) do nothing;
  end loop;

  -- reports: view-only below admin; users: view-only (from the foundation
  -- migration, repeated here idempotently for the backfill path)
  insert into v2.permissions (role_id, module, action)
  select rid, mod_name, 'view'
  from unnest(array[manager_role_id, staff_role_id]) as rid,
       unnest(array['reports', 'users']) as mod_name
  on conflict (role_id, module, action) do nothing;
end;
$$;

-- New tenants: same roles as before, now seeded via the shared matrix.
create or replace function v2.create_organization_with_defaults(org_name text, org_slug text)
returns uuid
language plpgsql
security definer
set search_path = v2
as $$
declare
  new_org_id uuid;
  admin_role_id uuid;
  manager_role_id uuid;
  staff_role_id uuid;
begin
  insert into v2.organizations (name, slug) values (org_name, org_slug) returning id into new_org_id;

  insert into v2.roles (tenant_id, slug, name)
    values (new_org_id, 'tenant_admin', 'Tenant Admin') returning id into admin_role_id;
  insert into v2.roles (tenant_id, slug, name)
    values (new_org_id, 'manager', 'Manager') returning id into manager_role_id;
  insert into v2.roles (tenant_id, slug, name)
    values (new_org_id, 'staff', 'Staff') returning id into staff_role_id;

  perform v2.seed_default_permissions(admin_role_id, manager_role_id, staff_role_id);

  return new_org_id;
end;
$$;

-- Backfill: existing tenants (created before this migration) get the new
-- modules' permissions added to their three system roles. Idempotent — the
-- on-conflict clauses inside seed_default_permissions make re-runs safe, and
-- custom (non-system) roles are deliberately left alone.
do $$
declare
  org record;
  admin_id uuid;
  manager_id uuid;
  staff_id uuid;
begin
  for org in select id from v2.organizations loop
    select id into admin_id from v2.roles where tenant_id = org.id and slug = 'tenant_admin';
    select id into manager_id from v2.roles where tenant_id = org.id and slug = 'manager';
    select id into staff_id from v2.roles where tenant_id = org.id and slug = 'staff';

    if admin_id is not null and manager_id is not null and staff_id is not null then
      perform v2.seed_default_permissions(admin_id, manager_id, staff_id);
    end if;
  end loop;
end;
$$;

-- ==============================================================================
-- Row Level Security — same defense-in-depth posture as the foundation
-- migration: the backend's service-role client bypasses RLS; these policies
-- guard direct anon/authenticated PostgREST access only.
-- ==============================================================================

alter table v2.products enable row level security;
alter table v2.inventory enable row level security;
alter table v2.suppliers enable row level security;
alter table v2.purchase_orders enable row level security;
alter table v2.purchase_order_items enable row level security;
alter table v2.sales_orders enable row level security;
alter table v2.sales_order_items enable row level security;
alter table v2.stock_movements enable row level security;
alter table v2.notifications enable row level security;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'products', 'inventory', 'suppliers', 'purchase_orders',
      'sales_orders', 'stock_movements'
    ])
  loop
    execute format(
      'create policy "%1$s_tenant_select" on v2.%1$s for select using (tenant_id = v2.current_tenant_id() or v2.is_platform_owner());',
      t
    );
  end loop;
end;
$$;

-- item tables have no tenant_id of their own; scope through the parent order
create policy "purchase_order_items_tenant_select" on v2.purchase_order_items
  for select using (
    po_id in (select id from v2.purchase_orders where tenant_id = v2.current_tenant_id())
    or v2.is_platform_owner()
  );

create policy "sales_order_items_tenant_select" on v2.sales_order_items
  for select using (
    so_id in (select id from v2.sales_orders where tenant_id = v2.current_tenant_id())
    or v2.is_platform_owner()
  );

-- notifications: strictly per-user; written by the backend (service role)
create policy "notifications_select_own" on v2.notifications
  for select using (user_id = auth.uid());

create policy "notifications_update_own" on v2.notifications
  for update using (user_id = auth.uid());

-- ==============================================================================
-- Realtime — Postgres Changes subscriptions only fire for tables in the
-- `supabase_realtime` publication (same mechanism as v1's enable_realtime
-- migration; adding v2 tables is additive and doesn't affect v1's entries).
-- RLS still governs which rows a subscribing client actually receives.
-- ==============================================================================

do $$
declare
  t text;
begin
  for t in select unnest(array['inventory', 'notifications']) loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'v2'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table v2.%I;', t);
    end if;
  end loop;
exception
  when undefined_object then
    -- Local/test databases have no supabase_realtime publication; harmless.
    null;
end;
$$;
