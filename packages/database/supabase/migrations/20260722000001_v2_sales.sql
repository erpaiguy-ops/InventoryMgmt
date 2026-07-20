-- ==============================================================================
-- v2 Phase 5 — order-to-cash (roadmap M5).
--
-- Document chain: sales order (threshold- or credit-limit-gated through the
-- approvals engine) -> delivery note (stock out via the Phase 3 ledger at
-- moving-average cost = COGS, partial deliveries, per-line delivered tracking)
-- -> sales invoice (matched against delivered quantities) -> receipt (Phase 6).
-- Plus customer returns: reason-coded AND approval-gated — stock re-enters
-- only after the final approval posts the document.
--
-- Requires foundation, master-data, stock-engine and procurement migrations.
-- Idempotent.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Sales orders
-- ------------------------------------------------------------------------------

create table if not exists v2.sales_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  doc_no text not null,
  customer_id uuid not null,
  warehouse_id uuid not null,
  order_date date not null default current_date,
  expected_date date,
  status text not null default 'draft' check (status in (
    'draft', 'pending_approval', 'confirmed', 'delivered', 'cancelled', 'rejected'
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
  foreign key (customer_id, tenant_id) references v2.partners (id, tenant_id),
  foreign key (warehouse_id, tenant_id) references v2.warehouses (id, tenant_id),
  foreign key (created_by, tenant_id) references v2.profiles (id, tenant_id) on delete set null (created_by)
);
create index if not exists v2_sales_orders_tenant_idx on v2.sales_orders (tenant_id, status);

create table if not exists v2.sales_order_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  so_id uuid not null,
  item_id uuid not null,
  qty numeric(16,4) not null check (qty > 0),
  unit_price numeric(16,6) not null check (unit_price >= 0),
  tax_id uuid,
  line_total numeric(16,4) generated always as (qty * unit_price) stored,
  qty_delivered numeric(16,4) not null default 0 check (qty_delivered >= 0),
  qty_invoiced numeric(16,4) not null default 0 check (qty_invoiced >= 0),
  unique (id, tenant_id),
  foreign key (so_id, tenant_id) references v2.sales_orders (id, tenant_id) on delete cascade,
  foreign key (item_id, tenant_id) references v2.items (id, tenant_id),
  foreign key (tax_id, tenant_id) references v2.taxes (id, tenant_id) on delete set null (tax_id),
  check (qty_delivered <= qty),
  check (qty_invoiced <= qty)
);
create index if not exists v2_so_lines_so_idx on v2.sales_order_lines (so_id);

-- ------------------------------------------------------------------------------
-- 2. Delivery notes
-- ------------------------------------------------------------------------------

create table if not exists v2.deliveries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  doc_no text not null,
  so_id uuid not null,
  warehouse_id uuid not null,
  status text not null default 'draft' check (status in ('draft', 'posted')),
  notes text,
  created_by uuid,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, doc_no),
  unique (id, tenant_id),
  foreign key (so_id, tenant_id) references v2.sales_orders (id, tenant_id),
  foreign key (warehouse_id, tenant_id) references v2.warehouses (id, tenant_id),
  foreign key (created_by, tenant_id) references v2.profiles (id, tenant_id) on delete set null (created_by)
);

create table if not exists v2.delivery_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  delivery_id uuid not null,
  so_line_id uuid not null,
  item_id uuid not null,
  batch_id uuid,
  qty numeric(16,4) not null check (qty > 0),
  unique (id, tenant_id),
  foreign key (delivery_id, tenant_id) references v2.deliveries (id, tenant_id) on delete cascade,
  foreign key (so_line_id, tenant_id) references v2.sales_order_lines (id, tenant_id),
  foreign key (item_id, tenant_id) references v2.items (id, tenant_id),
  foreign key (batch_id, tenant_id) references v2.batches (id, tenant_id)
);
create index if not exists v2_delivery_lines_dn_idx on v2.delivery_lines (delivery_id);

-- ------------------------------------------------------------------------------
-- 3. Sales invoices (matched against delivered quantities)
-- ------------------------------------------------------------------------------

create table if not exists v2.sales_invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  doc_no text not null,
  so_id uuid not null,
  customer_id uuid not null,
  invoice_date date not null default current_date,
  due_date date,
  status text not null default 'open' check (status in ('open', 'paid', 'cancelled')),
  subtotal numeric(16,4) not null default 0,
  tax_total numeric(16,4) not null default 0,
  total numeric(16,4) not null default 0,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, doc_no),
  unique (id, tenant_id),
  foreign key (so_id, tenant_id) references v2.sales_orders (id, tenant_id),
  foreign key (customer_id, tenant_id) references v2.partners (id, tenant_id),
  foreign key (created_by, tenant_id) references v2.profiles (id, tenant_id) on delete set null (created_by)
);
create index if not exists v2_sales_invoices_customer_idx
  on v2.sales_invoices (tenant_id, customer_id, status);

create table if not exists v2.sales_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  invoice_id uuid not null,
  so_line_id uuid not null,
  item_id uuid not null,
  qty numeric(16,4) not null check (qty > 0),
  unit_price numeric(16,6) not null check (unit_price >= 0),
  line_total numeric(16,4) generated always as (qty * unit_price) stored,
  foreign key (invoice_id, tenant_id) references v2.sales_invoices (id, tenant_id) on delete cascade,
  foreign key (so_line_id, tenant_id) references v2.sales_order_lines (id, tenant_id),
  foreign key (item_id, tenant_id) references v2.items (id, tenant_id)
);

-- ------------------------------------------------------------------------------
-- 4. Customer returns — reason-coded AND approval-gated: nothing moves until
--    the final approval calls post_sales_return.
-- ------------------------------------------------------------------------------

create table if not exists v2.sales_returns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  doc_no text not null,
  customer_id uuid not null,
  warehouse_id uuid not null,
  reason_code_id uuid,
  reason_text text,
  status text not null default 'draft'
    check (status in ('draft', 'pending_approval', 'posted', 'rejected')),
  notes text,
  created_by uuid,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, doc_no),
  unique (id, tenant_id),
  foreign key (customer_id, tenant_id) references v2.partners (id, tenant_id),
  foreign key (warehouse_id, tenant_id) references v2.warehouses (id, tenant_id),
  foreign key (reason_code_id, tenant_id) references v2.reason_codes (id, tenant_id) on delete set null (reason_code_id),
  foreign key (created_by, tenant_id) references v2.profiles (id, tenant_id) on delete set null (created_by)
);

create table if not exists v2.sales_return_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  return_id uuid not null,
  item_id uuid not null,
  batch_id uuid,
  qty numeric(16,4) not null check (qty > 0),
  foreign key (return_id, tenant_id) references v2.sales_returns (id, tenant_id) on delete cascade,
  foreign key (item_id, tenant_id) references v2.items (id, tenant_id),
  foreign key (batch_id, tenant_id) references v2.batches (id, tenant_id)
);

-- SO approval threshold lives with org settings (null = orders confirm
-- directly unless the customer's credit limit is breached).
alter table v2.org_settings add column if not exists so_approval_min_total numeric(16,4);

-- ------------------------------------------------------------------------------
-- 5. Posting functions
-- ------------------------------------------------------------------------------

-- Delivery: stock out at moving average (the ledger trigger stamps the cost —
-- that stamped cost IS the COGS basis), per-line delivered tracking, SO
-- auto-status. Rejects over-delivering; the ledger rejects insufficient stock.
create or replace function v2.post_delivery(p_tenant_id uuid, p_doc_id uuid)
returns void
language plpgsql
security definer
set search_path = v2
as $$
declare
  doc record;
  line record;
  so_line record;
  so record;
  remaining numeric;
begin
  select * into doc from v2.deliveries
  where id = p_doc_id and tenant_id = p_tenant_id
  for update;
  if not found then
    raise exception 'Delivery % not found', p_doc_id;
  end if;
  if doc.status = 'posted' then
    return;
  end if;

  select * into so from v2.sales_orders where id = doc.so_id for update;
  if so.status not in ('confirmed') then
    raise exception 'Sales order % is not confirmed', so.doc_no;
  end if;

  for line in select * from v2.delivery_lines where delivery_id = p_doc_id loop
    select * into so_line from v2.sales_order_lines
    where id = line.so_line_id for update;

    if so_line.qty_delivered + line.qty > so_line.qty then
      raise exception 'Over-delivering: line for item % would exceed ordered quantity', line.item_id;
    end if;

    insert into v2.stock_ledger
      (tenant_id, item_id, warehouse_id, batch_id, qty, unit_cost,
       movement_type, source_doc_type, source_doc_id, created_by)
    values
      (p_tenant_id, line.item_id, doc.warehouse_id, line.batch_id, -line.qty, null,
       'sale_delivery', 'delivery', p_doc_id, doc.created_by);

    update v2.sales_order_lines
    set qty_delivered = qty_delivered + line.qty
    where id = line.so_line_id;
  end loop;

  update v2.deliveries
  set status = 'posted', posted_at = now()
  where id = p_doc_id;

  select coalesce(sum(qty - qty_delivered), 0) into remaining
  from v2.sales_order_lines where so_id = doc.so_id;
  if remaining = 0 then
    update v2.sales_orders set status = 'delivered' where id = doc.so_id;
  end if;
end;
$$;

-- Customer return: stock back in at the current moving average (a null cost on
-- a positive movement takes the current average, which leaves the average
-- itself unchanged). Called by the approvals engine on final approval.
create or replace function v2.post_sales_return(p_tenant_id uuid, p_doc_id uuid)
returns void
language plpgsql
security definer
set search_path = v2
as $$
declare
  doc record;
  line record;
begin
  select * into doc from v2.sales_returns
  where id = p_doc_id and tenant_id = p_tenant_id
  for update;
  if not found then
    raise exception 'Sales return % not found', p_doc_id;
  end if;
  if doc.status = 'posted' then
    return;
  end if;

  for line in select * from v2.sales_return_lines where return_id = p_doc_id loop
    insert into v2.stock_ledger
      (tenant_id, item_id, warehouse_id, batch_id, qty, unit_cost,
       movement_type, source_doc_type, source_doc_id, created_by)
    values
      (p_tenant_id, line.item_id, doc.warehouse_id, line.batch_id, line.qty, null,
       'sale_return', 'sales_return', p_doc_id, doc.created_by);
  end loop;

  update v2.sales_returns
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
  for t in select unnest(array['sales_orders', 'sales_invoices', 'sales_returns']) loop
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
      'sales_orders', 'sales_order_lines', 'deliveries', 'delivery_lines',
      'sales_invoices', 'sales_invoice_lines', 'sales_returns', 'sales_return_lines'
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
-- 7. Seeding — permissions, workflows, reason codes
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
  foreach m in array array['items', 'partners', 'inventory', 'procurement', 'sales', 'approvals', 'settings', 'users'] loop
    insert into v2.permissions (role_id, module, action)
    select admin_role_id, m, a from unnest(all_actions) as a
    on conflict (role_id, module, action) do nothing;
  end loop;

  foreach m in array array['items', 'partners', 'inventory', 'procurement', 'sales'] loop
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
  from unnest(array['items', 'partners', 'inventory', 'procurement', 'sales', 'approvals', 'settings', 'users']) as mod_name
  on conflict (role_id, module, action) do nothing;
  insert into v2.permissions (role_id, module, action)
  select staff_role_id, mod_name, 'create'
  from unnest(array['inventory', 'procurement', 'sales']) as mod_name
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

  foreach dt in array array[
    'stock_adjustment', 'stock_audit', 'purchase_order', 'sales_order', 'sales_return'
  ] loop
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
    (p_tenant_id, 'purchase_return', 'other', 'Other'),
    (p_tenant_id, 'sales_return', 'damaged_in_transit', 'Damaged in transit'),
    (p_tenant_id, 'sales_return', 'wrong_item', 'Wrong item shipped'),
    (p_tenant_id, 'sales_return', 'quality', 'Quality complaint'),
    (p_tenant_id, 'sales_return', 'customer_changed_mind', 'Customer changed mind'),
    (p_tenant_id, 'sales_return', 'other', 'Other')
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
