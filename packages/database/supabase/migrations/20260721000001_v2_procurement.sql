-- ==============================================================================
-- v2 Phase 4 — procure-to-pay (roadmap M4).
--
-- Document chain: purchase order (threshold-gated through the approvals
-- engine) -> goods receipt (stock in via the Phase 3 ledger, batch capture,
-- partial receipts, per-line received tracking) -> purchase bill (three-way
-- matched against PO + receipts) -> payment (Phase 6). Plus supplier returns
-- (reason-coded stock out + debit basis) and landed-cost vouchers that fold
-- freight/duty into moving-average item cost.
--
-- Requires foundation, master-data, and stock-engine migrations. Idempotent.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Purchase orders
-- ------------------------------------------------------------------------------

create table if not exists v2.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  doc_no text not null,
  supplier_id uuid not null,
  warehouse_id uuid not null,
  order_date date not null default current_date,
  expected_date date,
  status text not null default 'draft' check (status in (
    'draft', 'pending_approval', 'confirmed', 'received', 'cancelled', 'rejected'
  )),
  subtotal numeric(16,4) not null default 0,
  tax_total numeric(16,4) not null default 0,
  total numeric(16,4) not null default 0,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, doc_no),
  unique (id, tenant_id),
  foreign key (supplier_id, tenant_id) references v2.partners (id, tenant_id),
  foreign key (warehouse_id, tenant_id) references v2.warehouses (id, tenant_id),
  foreign key (created_by, tenant_id) references v2.profiles (id, tenant_id) on delete set null (created_by)
);
create index if not exists v2_purchase_orders_tenant_idx on v2.purchase_orders (tenant_id, status);

create table if not exists v2.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  po_id uuid not null,
  item_id uuid not null,
  qty numeric(16,4) not null check (qty > 0),
  unit_price numeric(16,6) not null check (unit_price >= 0),
  tax_id uuid,
  line_total numeric(16,4) generated always as (qty * unit_price) stored,
  qty_received numeric(16,4) not null default 0 check (qty_received >= 0),
  qty_billed numeric(16,4) not null default 0 check (qty_billed >= 0),
  unique (id, tenant_id),
  foreign key (po_id, tenant_id) references v2.purchase_orders (id, tenant_id) on delete cascade,
  foreign key (item_id, tenant_id) references v2.items (id, tenant_id),
  foreign key (tax_id, tenant_id) references v2.taxes (id, tenant_id) on delete set null (tax_id),
  check (qty_received <= qty),
  check (qty_billed <= qty)
);
create index if not exists v2_po_lines_po_idx on v2.purchase_order_lines (po_id);

-- ------------------------------------------------------------------------------
-- 2. Goods receipts (GRN)
-- ------------------------------------------------------------------------------

create table if not exists v2.goods_receipts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  doc_no text not null,
  po_id uuid not null,
  warehouse_id uuid not null,
  status text not null default 'draft' check (status in ('draft', 'posted')),
  notes text,
  created_by uuid,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, doc_no),
  unique (id, tenant_id),
  foreign key (po_id, tenant_id) references v2.purchase_orders (id, tenant_id),
  foreign key (warehouse_id, tenant_id) references v2.warehouses (id, tenant_id),
  foreign key (created_by, tenant_id) references v2.profiles (id, tenant_id) on delete set null (created_by)
);

create table if not exists v2.goods_receipt_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  gr_id uuid not null,
  po_line_id uuid not null,
  item_id uuid not null,
  qty numeric(16,4) not null check (qty > 0),
  unit_cost numeric(16,6) not null check (unit_cost >= 0),
  batch_no text,
  expiry_date date,
  unique (id, tenant_id),
  foreign key (gr_id, tenant_id) references v2.goods_receipts (id, tenant_id) on delete cascade,
  foreign key (po_line_id, tenant_id) references v2.purchase_order_lines (id, tenant_id),
  foreign key (item_id, tenant_id) references v2.items (id, tenant_id)
);
create index if not exists v2_gr_lines_gr_idx on v2.goods_receipt_lines (gr_id);

-- ------------------------------------------------------------------------------
-- 3. Purchase bills (three-way matched)
-- ------------------------------------------------------------------------------

create table if not exists v2.purchase_bills (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  doc_no text not null,
  po_id uuid not null,
  supplier_id uuid not null,
  supplier_bill_no text,
  bill_date date not null default current_date,
  due_date date,
  status text not null default 'open' check (status in ('open', 'paid', 'cancelled')),
  total numeric(16,4) not null default 0,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, doc_no),
  unique (id, tenant_id),
  foreign key (po_id, tenant_id) references v2.purchase_orders (id, tenant_id),
  foreign key (supplier_id, tenant_id) references v2.partners (id, tenant_id),
  foreign key (created_by, tenant_id) references v2.profiles (id, tenant_id) on delete set null (created_by)
);

create table if not exists v2.purchase_bill_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  bill_id uuid not null,
  po_line_id uuid not null,
  item_id uuid not null,
  qty numeric(16,4) not null check (qty > 0),
  unit_price numeric(16,6) not null check (unit_price >= 0),
  line_total numeric(16,4) generated always as (qty * unit_price) stored,
  foreign key (bill_id, tenant_id) references v2.purchase_bills (id, tenant_id) on delete cascade,
  foreign key (po_line_id, tenant_id) references v2.purchase_order_lines (id, tenant_id),
  foreign key (item_id, tenant_id) references v2.items (id, tenant_id)
);

-- ------------------------------------------------------------------------------
-- 4. Supplier returns (debit basis) + landed costs
-- ------------------------------------------------------------------------------

create table if not exists v2.purchase_returns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  doc_no text not null,
  supplier_id uuid not null,
  warehouse_id uuid not null,
  reason_code_id uuid,
  reason_text text,
  status text not null default 'posted' check (status in ('posted', 'cancelled')),
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (tenant_id, doc_no),
  unique (id, tenant_id),
  foreign key (supplier_id, tenant_id) references v2.partners (id, tenant_id),
  foreign key (warehouse_id, tenant_id) references v2.warehouses (id, tenant_id),
  foreign key (reason_code_id, tenant_id) references v2.reason_codes (id, tenant_id) on delete set null (reason_code_id),
  foreign key (created_by, tenant_id) references v2.profiles (id, tenant_id) on delete set null (created_by)
);

create table if not exists v2.purchase_return_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  return_id uuid not null,
  item_id uuid not null,
  batch_id uuid,
  qty numeric(16,4) not null check (qty > 0),
  foreign key (return_id, tenant_id) references v2.purchase_returns (id, tenant_id) on delete cascade,
  foreign key (item_id, tenant_id) references v2.items (id, tenant_id),
  foreign key (batch_id, tenant_id) references v2.batches (id, tenant_id)
);

create table if not exists v2.landed_cost_vouchers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  doc_no text not null,
  gr_id uuid not null,
  description text not null,
  amount numeric(16,4) not null check (amount > 0),
  status text not null default 'draft' check (status in ('draft', 'posted')),
  created_by uuid,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, doc_no),
  unique (id, tenant_id),
  foreign key (gr_id, tenant_id) references v2.goods_receipts (id, tenant_id),
  foreign key (created_by, tenant_id) references v2.profiles (id, tenant_id) on delete set null (created_by)
);

create table if not exists v2.landed_cost_allocations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  voucher_id uuid not null,
  item_id uuid not null,
  amount numeric(16,4) not null,
  foreign key (voucher_id, tenant_id) references v2.landed_cost_vouchers (id, tenant_id) on delete cascade,
  foreign key (item_id, tenant_id) references v2.items (id, tenant_id)
);

-- PO approval threshold lives with org settings (null = POs confirm directly).
alter table v2.org_settings add column if not exists po_approval_min_total numeric(16,4);

-- ------------------------------------------------------------------------------
-- 5. Posting functions
-- ------------------------------------------------------------------------------

-- GRN: stock in at PO-line cost, per-line received tracking, PO auto-status,
-- supplier last_cost memory. Rejects over-receiving.
create or replace function v2.post_goods_receipt(p_tenant_id uuid, p_doc_id uuid)
returns void
language plpgsql
security definer
set search_path = v2
as $$
declare
  doc record;
  line record;
  po_line record;
  v_batch_id uuid;
  po record;
  remaining numeric;
begin
  select * into doc from v2.goods_receipts
  where id = p_doc_id and tenant_id = p_tenant_id
  for update;
  if not found then
    raise exception 'Goods receipt % not found', p_doc_id;
  end if;
  if doc.status = 'posted' then
    return;
  end if;

  select * into po from v2.purchase_orders where id = doc.po_id for update;
  if po.status not in ('confirmed') then
    raise exception 'Purchase order % is not confirmed', po.doc_no;
  end if;

  for line in select * from v2.goods_receipt_lines where gr_id = p_doc_id loop
    select * into po_line from v2.purchase_order_lines
    where id = line.po_line_id for update;

    if po_line.qty_received + line.qty > po_line.qty then
      raise exception 'Over-receiving: line for item % would exceed ordered quantity', line.item_id;
    end if;

    v_batch_id := v2.ensure_batch(p_tenant_id, line.item_id, line.batch_no, line.expiry_date);

    insert into v2.stock_ledger
      (tenant_id, item_id, warehouse_id, batch_id, qty, unit_cost,
       movement_type, source_doc_type, source_doc_id, created_by)
    values
      (p_tenant_id, line.item_id, doc.warehouse_id, v_batch_id, line.qty, line.unit_cost,
       'purchase_receipt', 'goods_receipt', p_doc_id, doc.created_by);

    update v2.purchase_order_lines
    set qty_received = qty_received + line.qty
    where id = line.po_line_id;

    -- Remember what this supplier last charged for this item.
    update v2.item_suppliers
    set last_cost = line.unit_cost
    where item_id = line.item_id and partner_id = po.supplier_id;
  end loop;

  update v2.goods_receipts
  set status = 'posted', posted_at = now()
  where id = p_doc_id;

  select coalesce(sum(qty - qty_received), 0) into remaining
  from v2.purchase_order_lines where po_id = doc.po_id;
  if remaining = 0 then
    update v2.purchase_orders set status = 'received' where id = doc.po_id;
  end if;
end;
$$;

-- Supplier return: stock out at current average (trigger stamps the cost).
create or replace function v2.post_purchase_return(p_tenant_id uuid, p_doc_id uuid)
returns void
language plpgsql
security definer
set search_path = v2
as $$
declare
  doc record;
  line record;
begin
  select * into doc from v2.purchase_returns
  where id = p_doc_id and tenant_id = p_tenant_id;
  if not found then
    raise exception 'Purchase return % not found', p_doc_id;
  end if;

  for line in select * from v2.purchase_return_lines where return_id = p_doc_id loop
    insert into v2.stock_ledger
      (tenant_id, item_id, warehouse_id, batch_id, qty, unit_cost,
       movement_type, source_doc_type, source_doc_id, created_by)
    values
      (p_tenant_id, line.item_id, doc.warehouse_id, line.batch_id, -line.qty, null,
       'purchase_return', 'purchase_return', p_doc_id, doc.created_by);
  end loop;
end;
$$;

-- Landed cost: allocate the voucher amount across the GRN's lines by value
-- share, then fold each item's share into its moving average
-- (avg += share / qty_on_hand). Value-only — no quantity moves.
create or replace function v2.post_landed_cost(p_tenant_id uuid, p_doc_id uuid)
returns void
language plpgsql
security definer
set search_path = v2
as $$
declare
  doc record;
  gr_total numeric;
  line record;
  share numeric;
  cost record;
begin
  select * into doc from v2.landed_cost_vouchers
  where id = p_doc_id and tenant_id = p_tenant_id
  for update;
  if not found then
    raise exception 'Landed cost voucher % not found', p_doc_id;
  end if;
  if doc.status = 'posted' then
    return;
  end if;

  select coalesce(sum(qty * unit_cost), 0) into gr_total
  from v2.goods_receipt_lines where gr_id = doc.gr_id;
  if gr_total <= 0 then
    raise exception 'Goods receipt has no value to allocate against';
  end if;

  for line in select * from v2.goods_receipt_lines where gr_id = doc.gr_id loop
    share := doc.amount * (line.qty * line.unit_cost) / gr_total;

    insert into v2.landed_cost_allocations (tenant_id, voucher_id, item_id, amount)
    values (p_tenant_id, doc.id, line.item_id, share);

    select * into cost from v2.item_costs where item_id = line.item_id for update;
    if found and cost.qty_on_hand > 0 then
      update v2.item_costs
      set avg_cost = cost.avg_cost + share / cost.qty_on_hand, updated_at = now()
      where item_id = line.item_id;
    end if;
  end loop;

  update v2.landed_cost_vouchers
  set status = 'posted', posted_at = now()
  where id = p_doc_id;
end;
$$;

-- ------------------------------------------------------------------------------
-- 6. Grants, updated_at, RLS
-- ------------------------------------------------------------------------------

grant select, insert, update, delete on all tables in schema v2 to authenticated, service_role;
grant execute on all functions in schema v2 to authenticated, service_role;

do $$
declare
  t text;
begin
  for t in select unnest(array['purchase_orders', 'purchase_bills']) loop
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
      'purchase_orders', 'purchase_order_lines', 'goods_receipts',
      'goods_receipt_lines', 'purchase_bills', 'purchase_bill_lines',
      'purchase_returns', 'purchase_return_lines', 'landed_cost_vouchers',
      'landed_cost_allocations'
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

-- ------------------------------------------------------------------------------
-- 7. Seeding — permissions, workflows, reason codes, numbering
-- ------------------------------------------------------------------------------

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
  foreach m in array array['items', 'partners', 'inventory', 'procurement', 'approvals', 'settings', 'users'] loop
    insert into v2.permissions (role_id, module, action)
    select admin_role_id, m, a from unnest(all_actions) as a
    on conflict (role_id, module, action) do nothing;
  end loop;

  foreach m in array array['items', 'partners', 'inventory', 'procurement'] loop
    insert into v2.permissions (role_id, module, action)
    select manager_role_id, m, a from unnest(array['view', 'create', 'update']) as a
    on conflict (role_id, module, action) do nothing;
  end loop;
  insert into v2.permissions (role_id, module, action)
  select manager_role_id, mod_name, act_name
  from (values ('approvals', 'view'), ('approvals', 'update'),
               ('settings', 'view'), ('users', 'view')) as perms(mod_name, act_name)
  on conflict (role_id, module, action) do nothing;

  insert into v2.permissions (role_id, module, action)
  select staff_role_id, mod_name, 'view'
  from unnest(array['items', 'partners', 'inventory', 'procurement', 'approvals', 'settings', 'users']) as mod_name
  on conflict (role_id, module, action) do nothing;
  insert into v2.permissions (role_id, module, action)
  select staff_role_id, mod_name, 'create'
  from unnest(array['inventory', 'procurement']) as mod_name
  on conflict (role_id, module, action) do nothing;
end;
$$;

create or replace function v2.seed_approval_defaults(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = v2
as $$
declare
  admin_role_id uuid;
  wf_id uuid;
  dt text;
begin
  select id into admin_role_id
  from v2.roles where tenant_id = p_tenant_id and slug = 'tenant_admin';
  if admin_role_id is null then
    return;
  end if;

  foreach dt in array array['stock_adjustment', 'stock_audit', 'purchase_order'] loop
    insert into v2.approval_workflows (tenant_id, doc_type)
    values (p_tenant_id, dt)
    on conflict (tenant_id, doc_type) do nothing;

    select id into wf_id from v2.approval_workflows
    where tenant_id = p_tenant_id and doc_type = dt;

    insert into v2.approval_workflow_steps (tenant_id, workflow_id, step_no, role_id)
    values (p_tenant_id, wf_id, 1, admin_role_id)
    on conflict (workflow_id, step_no) do nothing;
  end loop;

  insert into v2.reason_codes (tenant_id, doc_type, code, label) values
    (p_tenant_id, 'stock_adjustment', 'damage', 'Damaged goods'),
    (p_tenant_id, 'stock_adjustment', 'theft', 'Theft / loss'),
    (p_tenant_id, 'stock_adjustment', 'count_correction', 'Count correction'),
    (p_tenant_id, 'stock_adjustment', 'opening_balance', 'Opening balance'),
    (p_tenant_id, 'stock_adjustment', 'other', 'Other'),
    (p_tenant_id, 'stock_audit', 'periodic', 'Periodic audit'),
    (p_tenant_id, 'stock_audit', 'spot_check', 'Spot check'),
    (p_tenant_id, 'purchase_return', 'damaged_on_arrival', 'Damaged on arrival'),
    (p_tenant_id, 'purchase_return', 'wrong_item', 'Wrong item delivered'),
    (p_tenant_id, 'purchase_return', 'quality', 'Quality below specification'),
    (p_tenant_id, 'purchase_return', 'other', 'Other')
  on conflict (tenant_id, doc_type, code) do nothing;

  insert into v2.numbering_series (tenant_id, doc_type, prefix)
  values (p_tenant_id, 'landed_cost', 'LCV-')
  on conflict (tenant_id, doc_type) do nothing;
end;
$$;

-- Backfill existing tenants (idempotent).
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
    perform v2.seed_approval_defaults(org.id);
  end loop;
end;
$$;
