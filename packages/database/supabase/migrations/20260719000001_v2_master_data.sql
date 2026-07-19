-- ==============================================================================
-- v2 Phase 2R — master data & tenant backbone (roadmap rev 3: M12 + M1 + M2).
--
-- Settings backbone: org_settings, numbering_series (+ atomic next_doc_number),
-- taxes, uoms, warehouses.
-- M1 Item Catalog: item_categories (tree + per-category attribute schema),
-- brands, items (variants via parent_item_id), item_uoms, item_barcodes,
-- price_lists (+ items), item_suppliers.
-- M2 Business Partners: payment_terms, partner_groups, partners,
-- partner_contacts, partner_addresses.
--
-- Design rules (locked with the data-model decision):
--   * Every tenant-scoped reference is a COMPOSITE foreign key
--     (ref_id, tenant_id) -> parent (id, tenant_id), so a row can never point
--     at another tenant's data — enforced by the database, no triggers needed.
--     Parents therefore carry a redundant-looking unique (id, tenant_id).
--   * Documents and ledgers arrive in later phases; this migration is the
--     reference data they will all post against.
--   * Idempotent: safe to re-run (create if not exists / or replace / on
--     conflict do nothing throughout).
--
-- Requires 20260717000001_v2_foundation_schema.sql. Apply via the SQL Editor
-- or `pnpm --filter @inventory-mgmt/database migrate`.
-- ==============================================================================

-- ==============================================================================
-- 1. Settings backbone (M12)
-- ==============================================================================

create table if not exists v2.org_settings (
  tenant_id uuid primary key references v2.organizations (id) on delete cascade,
  currency text not null default 'USD',
  fiscal_year_start_month integer not null default 1
    check (fiscal_year_start_month between 1 and 12),
  document_footer text,
  logo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists v2.numbering_series (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  doc_type text not null,
  prefix text not null,
  next_number integer not null default 1 check (next_number > 0),
  padding integer not null default 4 check (padding between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, doc_type)
);

-- Atomic document-number allocation: locks the series row, increments, returns
-- e.g. 'INV-0042'. Every later phase's document creation calls this RPC.
create or replace function v2.next_doc_number(p_tenant_id uuid, p_doc_type text)
returns text
language plpgsql
security definer
set search_path = v2
as $$
declare
  series record;
begin
  select * into series
  from v2.numbering_series
  where tenant_id = p_tenant_id and doc_type = p_doc_type
  for update;

  if not found then
    raise exception 'No numbering series configured for document type %', p_doc_type;
  end if;

  update v2.numbering_series
  set next_number = series.next_number + 1
  where id = series.id;

  return series.prefix || lpad(series.next_number::text, series.padding, '0');
end;
$$;

create table if not exists v2.taxes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  name text not null,
  rate numeric(6,3) not null check (rate >= 0),
  is_inclusive boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name),
  unique (id, tenant_id)
);

create table if not exists v2.uoms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code),
  unique (id, tenant_id)
);

create table if not exists v2.warehouses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  code text not null,
  name text not null,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code),
  unique (id, tenant_id)
);

-- ==============================================================================
-- 2. M1 — Item Catalog
-- ==============================================================================

create table if not exists v2.item_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  parent_id uuid,
  name text not null,
  -- Per-category attribute schema: [{"key":"warranty_months","label":"Warranty (months)","type":"number"}, ...]
  attribute_schema jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, tenant_id),
  foreign key (parent_id, tenant_id) references v2.item_categories (id, tenant_id) on delete cascade
);
-- Same name allowed under different parents; root-level names unique per tenant.
create unique index if not exists v2_item_categories_name_uniq
  on v2.item_categories (tenant_id, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), name);

create table if not exists v2.brands (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name),
  unique (id, tenant_id)
);

create table if not exists v2.items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  sku text not null,
  name text not null,
  description text,
  item_type text not null default 'stocked' check (item_type in ('stocked', 'service')),
  category_id uuid,
  brand_id uuid,
  -- Variants are just items pointing at their template item.
  parent_item_id uuid,
  base_uom_id uuid not null,
  purchase_uom_id uuid,
  sales_uom_id uuid,
  tax_id uuid,
  tracking text not null default 'none' check (tracking in ('none', 'batch', 'serial')),
  track_expiry boolean not null default false,
  -- Values for the category's attribute_schema keys: {"warranty_months": 12}
  attributes jsonb not null default '{}'::jsonb,
  standard_cost numeric(14,4),
  standard_price numeric(14,4),
  status text not null default 'active' check (status in ('draft', 'active', 'discontinued')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, sku),
  unique (id, tenant_id),
  foreign key (category_id, tenant_id) references v2.item_categories (id, tenant_id) on delete set null (category_id),
  foreign key (brand_id, tenant_id) references v2.brands (id, tenant_id) on delete set null (brand_id),
  foreign key (parent_item_id, tenant_id) references v2.items (id, tenant_id) on delete set null (parent_item_id),
  foreign key (base_uom_id, tenant_id) references v2.uoms (id, tenant_id),
  foreign key (purchase_uom_id, tenant_id) references v2.uoms (id, tenant_id),
  foreign key (sales_uom_id, tenant_id) references v2.uoms (id, tenant_id),
  foreign key (tax_id, tenant_id) references v2.taxes (id, tenant_id) on delete set null (tax_id),
  check (track_expiry = false or tracking = 'batch')
);

create index if not exists v2_items_tenant_idx on v2.items (tenant_id);
create index if not exists v2_items_category_idx on v2.items (tenant_id, category_id);
create index if not exists v2_items_status_idx on v2.items (tenant_id, status);

-- Per-item UoM conversions: factor_to_base = how many base units one of this
-- UoM contains (carton of 24 pieces -> factor 24). Base UoM itself is implicit
-- factor 1 and needs no row.
create table if not exists v2.item_uoms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  item_id uuid not null,
  uom_id uuid not null,
  factor_to_base numeric(14,6) not null check (factor_to_base > 0),
  created_at timestamptz not null default now(),
  unique (item_id, uom_id),
  foreign key (item_id, tenant_id) references v2.items (id, tenant_id) on delete cascade,
  foreign key (uom_id, tenant_id) references v2.uoms (id, tenant_id) on delete cascade
);

create table if not exists v2.item_barcodes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  item_id uuid not null,
  barcode text not null,
  uom_id uuid,
  created_at timestamptz not null default now(),
  unique (tenant_id, barcode),
  foreign key (item_id, tenant_id) references v2.items (id, tenant_id) on delete cascade,
  foreign key (uom_id, tenant_id) references v2.uoms (id, tenant_id) on delete set null (uom_id)
);

create table if not exists v2.price_lists (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  name text not null,
  list_type text not null check (list_type in ('sales', 'purchase')),
  currency text not null default 'USD',
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name),
  unique (id, tenant_id)
);
-- At most one default list per type per tenant.
create unique index if not exists v2_price_lists_default_uniq
  on v2.price_lists (tenant_id, list_type) where is_default;

create table if not exists v2.price_list_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  price_list_id uuid not null,
  item_id uuid not null,
  uom_id uuid,
  min_qty numeric(14,4) not null default 1 check (min_qty > 0),
  unit_price numeric(14,4) not null check (unit_price >= 0),
  valid_from date,
  valid_to date,
  created_at timestamptz not null default now(),
  foreign key (price_list_id, tenant_id) references v2.price_lists (id, tenant_id) on delete cascade,
  foreign key (item_id, tenant_id) references v2.items (id, tenant_id) on delete cascade,
  foreign key (uom_id, tenant_id) references v2.uoms (id, tenant_id) on delete set null (uom_id),
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);
create index if not exists v2_price_list_items_lookup_idx
  on v2.price_list_items (price_list_id, item_id);

-- ==============================================================================
-- 3. M2 — Business Partners
-- ==============================================================================

create table if not exists v2.payment_terms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  name text not null,
  net_days integer not null default 0 check (net_days >= 0),
  early_pay_discount_pct numeric(5,2) check (early_pay_discount_pct between 0 and 100),
  early_pay_within_days integer check (early_pay_within_days >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name),
  unique (id, tenant_id)
);

create table if not exists v2.partner_groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name),
  unique (id, tenant_id)
);

create table if not exists v2.partners (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  code text,
  name text not null,
  is_customer boolean not null default false,
  is_supplier boolean not null default false,
  tax_id_number text,
  email text,
  phone text,
  currency text,
  payment_term_id uuid,
  credit_limit numeric(14,2) check (credit_limit >= 0),
  price_list_id uuid,
  group_id uuid,
  status text not null default 'active' check (status in ('active', 'on_hold', 'archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, tenant_id),
  foreign key (payment_term_id, tenant_id) references v2.payment_terms (id, tenant_id) on delete set null (payment_term_id),
  foreign key (price_list_id, tenant_id) references v2.price_lists (id, tenant_id) on delete set null (price_list_id),
  foreign key (group_id, tenant_id) references v2.partner_groups (id, tenant_id) on delete set null (group_id),
  check (is_customer or is_supplier)
);
create unique index if not exists v2_partners_code_uniq
  on v2.partners (tenant_id, code) where code is not null;
create index if not exists v2_partners_tenant_idx on v2.partners (tenant_id);
create index if not exists v2_partners_roles_idx on v2.partners (tenant_id, is_customer, is_supplier);

create table if not exists v2.partner_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  partner_id uuid not null,
  name text not null,
  designation text,
  email text,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (partner_id, tenant_id) references v2.partners (id, tenant_id) on delete cascade
);

create table if not exists v2.partner_addresses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  partner_id uuid not null,
  address_type text not null check (address_type in ('billing', 'shipping')),
  line1 text not null,
  line2 text,
  city text,
  state text,
  country text,
  postal_code text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (partner_id, tenant_id) references v2.partners (id, tenant_id) on delete cascade
);

-- Which suppliers can provide an item, at what terms (consumed by Procurement).
create table if not exists v2.item_suppliers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  item_id uuid not null,
  partner_id uuid not null,
  supplier_sku text,
  lead_time_days integer check (lead_time_days >= 0),
  last_cost numeric(14,4) check (last_cost >= 0),
  moq numeric(14,4) check (moq >= 0),
  created_at timestamptz not null default now(),
  unique (item_id, partner_id),
  foreign key (item_id, tenant_id) references v2.items (id, tenant_id) on delete cascade,
  foreign key (partner_id, tenant_id) references v2.partners (id, tenant_id) on delete cascade
);

-- ==============================================================================
-- 4. Grants, updated_at triggers, RLS
-- ==============================================================================

grant select, insert, update, delete on all tables in schema v2 to authenticated, service_role;
grant execute on all functions in schema v2 to authenticated, service_role;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'org_settings', 'numbering_series', 'taxes', 'uoms', 'warehouses',
      'item_categories', 'brands', 'items', 'price_lists',
      'payment_terms', 'partner_groups', 'partners'
    ])
  loop
    execute format(
      'drop trigger if exists set_updated_at on v2.%I; create trigger set_updated_at before update on v2.%I for each row execute function v2.set_updated_at();',
      t, t
    );
  end loop;
end;
$$;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'org_settings', 'numbering_series', 'taxes', 'uoms', 'warehouses',
      'item_categories', 'brands', 'items', 'item_uoms', 'item_barcodes',
      'price_lists', 'price_list_items', 'payment_terms', 'partner_groups',
      'partners', 'partner_contacts', 'partner_addresses', 'item_suppliers'
    ])
  loop
    execute format('alter table v2.%I enable row level security;', t);
    execute format(
      'drop policy if exists "%1$s_tenant_select" on v2.%1$s; create policy "%1$s_tenant_select" on v2.%1$s for select using (tenant_id = v2.current_tenant_id() or v2.is_platform_owner());',
      t
    );
  end loop;
end;
$$;

-- ==============================================================================
-- 5. Default seeding — permissions + master data, shared by new-tenant
--    creation and the idempotent backfill for existing tenants.
-- ==============================================================================

-- Permission matrix for the rev-3 module suite as of Phase 2R.
-- Later phases append their modules here (and re-run the backfill).
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
  all_actions text[] := array['view', 'create', 'update', 'delete', 'manage'];
  m text;
begin
  -- tenant_admin: everything on every module
  foreach m in array array['items', 'partners', 'settings', 'users'] loop
    insert into v2.permissions (role_id, module, action)
    select admin_role_id, m, a from unnest(all_actions) as a
    on conflict (role_id, module, action) do nothing;
  end loop;

  -- manager: work with master data, read settings & users
  foreach m in array array['items', 'partners'] loop
    insert into v2.permissions (role_id, module, action)
    select manager_role_id, m, a from unnest(array['view', 'create', 'update']) as a
    on conflict (role_id, module, action) do nothing;
  end loop;
  insert into v2.permissions (role_id, module, action)
  select manager_role_id, mod_name, 'view'
  from unnest(array['settings', 'users']) as mod_name
  on conflict (role_id, module, action) do nothing;

  -- staff: read master data & settings (pickers need them), read users
  insert into v2.permissions (role_id, module, action)
  select staff_role_id, mod_name, 'view'
  from unnest(array['items', 'partners', 'settings', 'users']) as mod_name
  on conflict (role_id, module, action) do nothing;
end;
$$;

-- Master-data starter set every org gets: base UoMs, a main warehouse,
-- common payment terms, default price lists, the full numbering catalog,
-- and an org_settings row.
create or replace function v2.seed_master_data_defaults(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = v2
as $$
begin
  insert into v2.org_settings (tenant_id) values (p_tenant_id)
  on conflict (tenant_id) do nothing;

  insert into v2.uoms (tenant_id, code, name) values
    (p_tenant_id, 'PCS', 'Piece'),
    (p_tenant_id, 'BOX', 'Box'),
    (p_tenant_id, 'CTN', 'Carton'),
    (p_tenant_id, 'KG', 'Kilogram'),
    (p_tenant_id, 'LTR', 'Litre'),
    (p_tenant_id, 'MTR', 'Metre')
  on conflict (tenant_id, code) do nothing;

  insert into v2.warehouses (tenant_id, code, name) values
    (p_tenant_id, 'MAIN', 'Main Warehouse')
  on conflict (tenant_id, code) do nothing;

  insert into v2.payment_terms (tenant_id, name, net_days) values
    (p_tenant_id, 'Immediate', 0),
    (p_tenant_id, 'Net 15', 15),
    (p_tenant_id, 'Net 30', 30),
    (p_tenant_id, 'Net 60', 60)
  on conflict (tenant_id, name) do nothing;

  insert into v2.price_lists (tenant_id, name, list_type, is_default) values
    (p_tenant_id, 'Standard Sales', 'sales', true),
    (p_tenant_id, 'Standard Purchase', 'purchase', true)
  on conflict (tenant_id, name) do nothing;

  insert into v2.numbering_series (tenant_id, doc_type, prefix) values
    (p_tenant_id, 'purchase_order', 'PO-'),
    (p_tenant_id, 'goods_receipt', 'GRN-'),
    (p_tenant_id, 'purchase_bill', 'PB-'),
    (p_tenant_id, 'purchase_return', 'PRN-'),
    (p_tenant_id, 'sales_quotation', 'SQ-'),
    (p_tenant_id, 'sales_order', 'SO-'),
    (p_tenant_id, 'delivery_note', 'DN-'),
    (p_tenant_id, 'sales_invoice', 'INV-'),
    (p_tenant_id, 'sales_return', 'SRN-'),
    (p_tenant_id, 'credit_note', 'CRN-'),
    (p_tenant_id, 'debit_note', 'DBN-'),
    (p_tenant_id, 'stock_transfer', 'STR-'),
    (p_tenant_id, 'stock_adjustment', 'ADJ-'),
    (p_tenant_id, 'stock_audit', 'AUD-'),
    (p_tenant_id, 'ar_receipt', 'RCT-'),
    (p_tenant_id, 'ap_payment', 'PAY-'),
    (p_tenant_id, 'journal', 'JV-')
  on conflict (tenant_id, doc_type) do nothing;
end;
$$;

-- New tenants: roles + permissions + master-data defaults, atomically.
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
  perform v2.seed_master_data_defaults(new_org_id);

  return new_org_id;
end;
$$;

-- Backfill for tenants created before this migration (idempotent).
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

    perform v2.seed_master_data_defaults(org.id);
  end loop;
end;
$$;
