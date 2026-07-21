-- ==============================================================================
-- v2 Phase 12 — POS / Counter Sales (roadmap M14).
--
-- A one-screen cash-sale flow for walk-up customers, deliberately NOT routed
-- through the sales-order -> delivery -> invoice -> receipt pipeline (that
-- pipeline models credit terms and multi-step fulfillment; a POS sale is
-- paid in full at the register, on the spot). Instead pos_sales posts
-- directly and atomically:
--   Dr Cash-or-Bank (total received)      Dr COGS (at moving-average cost)
--   Cr Revenue (subtotal) + Cr Tax Payable  Cr Inventory (at moving-average cost)
-- in ONE journal entry — this is the invoice and the receipt at the same
-- instant, which is exactly what a counter sale is.
--
-- Cash drawer sessions give the counter something to reconcile against at
-- shift end: open with a starting float, sell through the session, close by
-- counting the drawer — the difference from what cash sales should have
-- produced is the over/short. One open session per tenant at a time
-- (single-register assumption, documented rather than guessed at multi-till
-- concurrency rules).
--
-- No approval gate (a cash sale completes when the customer pays, same as
-- purchase returns/landed costs), no void/refund path yet (documented, not
-- silently half-built) — a walk-up refund is a sales_return today.
--
-- Requires all prior v2 migrations. Idempotent.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Cash drawer sessions
-- ------------------------------------------------------------------------------

create table if not exists v2.cash_drawer_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  opening_float numeric(14,2) not null default 0 check (opening_float >= 0),
  status text not null default 'open' check (status in ('open', 'closed')),
  closing_counted numeric(14,2),
  closing_expected numeric(14,2),
  over_short numeric(14,2),
  opened_by uuid,
  opened_at timestamptz not null default now(),
  closed_by uuid,
  closed_at timestamptz,
  unique (id, tenant_id),
  foreign key (opened_by, tenant_id) references v2.profiles (id, tenant_id) on delete set null (opened_by),
  foreign key (closed_by, tenant_id) references v2.profiles (id, tenant_id) on delete set null (closed_by)
);
-- Only one open session per tenant at a time.
create unique index if not exists v2_cash_drawer_sessions_one_open
  on v2.cash_drawer_sessions (tenant_id) where status = 'open';

-- ------------------------------------------------------------------------------
-- 2. POS sales
-- ------------------------------------------------------------------------------

create table if not exists v2.pos_sales (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  doc_no text not null,
  session_id uuid not null,
  customer_id uuid,
  warehouse_id uuid not null,
  payment_method_id uuid not null,
  subtotal numeric(16,4) not null default 0,
  tax_total numeric(16,4) not null default 0,
  total numeric(16,4) not null default 0,
  status text not null default 'draft' check (status in ('draft', 'posted')),
  posted_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (tenant_id, doc_no),
  unique (id, tenant_id),
  foreign key (session_id, tenant_id) references v2.cash_drawer_sessions (id, tenant_id),
  foreign key (customer_id, tenant_id) references v2.partners (id, tenant_id) on delete set null (customer_id),
  foreign key (warehouse_id, tenant_id) references v2.warehouses (id, tenant_id),
  foreign key (payment_method_id, tenant_id) references v2.payment_methods (id, tenant_id),
  foreign key (created_by, tenant_id) references v2.profiles (id, tenant_id) on delete set null (created_by)
);

create table if not exists v2.pos_sale_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  sale_id uuid not null,
  item_id uuid not null,
  qty numeric(16,4) not null check (qty > 0),
  unit_price numeric(16,6) not null check (unit_price >= 0),
  tax_id uuid,
  line_total numeric(16,4) generated always as (qty * unit_price) stored,
  foreign key (sale_id, tenant_id) references v2.pos_sales (id, tenant_id) on delete cascade,
  foreign key (item_id, tenant_id) references v2.items (id, tenant_id),
  foreign key (tax_id, tenant_id) references v2.taxes (id, tenant_id) on delete set null (tax_id)
);
create index if not exists v2_pos_sale_lines_sale_idx on v2.pos_sale_lines (sale_id);

-- pos_sale joins the set of recognized stock-ledger movement types.
do $$
begin
  alter table v2.stock_ledger drop constraint if exists stock_ledger_movement_type_check;
  alter table v2.stock_ledger add constraint stock_ledger_movement_type_check
    check (movement_type in (
      'opening', 'adjustment', 'audit', 'transfer_out', 'transfer_in',
      'purchase_receipt', 'purchase_return', 'sale_delivery', 'sale_return',
      'pos_sale'
    ));
exception when duplicate_object then null;
end;
$$;

-- ------------------------------------------------------------------------------
-- 3. Posting
-- ------------------------------------------------------------------------------

-- Stock leaves at the moving-average cost the ledger trigger stamps (same
-- mechanism deliveries use), then one journal entry covers both the sale
-- (cash in / revenue / tax) and the cost side (COGS / inventory) at once.
create or replace function v2.post_pos_sale(
  p_tenant_id uuid,
  p_doc_id uuid,
  p_deposit_account_id uuid
)
returns void
language plpgsql
security definer
set search_path = v2
as $$
declare
  doc record;
  line record;
  v_unit_cost numeric;
  v_cogs_total numeric := 0;
  v_lines jsonb;
begin
  select * into doc from v2.pos_sales
  where id = p_doc_id and tenant_id = p_tenant_id
  for update;
  if not found then
    raise exception 'POS sale % not found', p_doc_id;
  end if;
  if doc.status = 'posted' then
    return;
  end if;

  for line in select * from v2.pos_sale_lines where sale_id = p_doc_id loop
    insert into v2.stock_ledger
      (tenant_id, item_id, warehouse_id, qty, unit_cost,
       movement_type, source_doc_type, source_doc_id, created_by)
    values
      (p_tenant_id, line.item_id, doc.warehouse_id, -line.qty, null,
       'pos_sale', 'pos_sale', p_doc_id, doc.created_by)
    returning unit_cost into v_unit_cost;

    v_cogs_total := v_cogs_total + (line.qty * v_unit_cost);
  end loop;

  update v2.pos_sales
  set status = 'posted', posted_at = now()
  where id = p_doc_id;

  v_lines := jsonb_build_array(
    jsonb_build_object('account_id', p_deposit_account_id, 'debit', doc.total),
    jsonb_build_object('account_role', 'revenue', 'credit', doc.subtotal)
  );
  if doc.tax_total > 0 then
    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object('account_role', 'tax_payable', 'credit', doc.tax_total)
    );
  end if;
  if v_cogs_total > 0 then
    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object('account_role', 'cogs', 'debit', v_cogs_total),
      jsonb_build_object('account_role', 'inventory', 'credit', v_cogs_total)
    );
  end if;

  perform v2.post_journal_entry(
    p_tenant_id,
    current_date,
    'pos_sale',
    p_doc_id,
    'POS sale ' || doc.doc_no,
    v_lines,
    doc.created_by
  );
end;
$$;

-- ------------------------------------------------------------------------------
-- 4. Cash drawer session lifecycle
-- ------------------------------------------------------------------------------

create or replace function v2.open_cash_drawer_session(
  p_tenant_id uuid,
  p_opening_float numeric,
  p_created_by uuid default null
)
returns v2.cash_drawer_sessions
language plpgsql
security definer
set search_path = v2
as $$
declare
  v_session v2.cash_drawer_sessions;
begin
  if exists (
    select 1 from v2.cash_drawer_sessions where tenant_id = p_tenant_id and status = 'open'
  ) then
    raise exception 'A cash drawer session is already open for this tenant';
  end if;

  insert into v2.cash_drawer_sessions (tenant_id, opening_float, opened_by)
  values (p_tenant_id, p_opening_float, p_created_by)
  returning * into v_session;
  return v_session;
end;
$$;

-- Expected cash = opening float + cash-tendered POS sales posted during the
-- session (card/other payment methods don't touch the physical drawer).
create or replace function v2.close_cash_drawer_session(
  p_tenant_id uuid,
  p_session_id uuid,
  p_counted_amount numeric,
  p_closed_by uuid default null
)
returns v2.cash_drawer_sessions
language plpgsql
security definer
set search_path = v2
as $$
declare
  session_row v2.cash_drawer_sessions;
  v_cash_sales numeric;
  v_expected numeric;
begin
  select * into session_row from v2.cash_drawer_sessions
  where id = p_session_id and tenant_id = p_tenant_id
  for update;
  if not found then
    raise exception 'Cash drawer session % not found', p_session_id;
  end if;
  if session_row.status = 'closed' then
    return session_row;
  end if;

  select coalesce(sum(s.total), 0) into v_cash_sales
  from v2.pos_sales s
  join v2.payment_methods pm on pm.id = s.payment_method_id
  where s.session_id = p_session_id and s.status = 'posted' and pm.method_type = 'cash';

  v_expected := session_row.opening_float + v_cash_sales;

  update v2.cash_drawer_sessions
  set status = 'closed',
      closing_counted = p_counted_amount,
      closing_expected = v_expected,
      over_short = p_counted_amount - v_expected,
      closed_by = p_closed_by,
      closed_at = now()
  where id = p_session_id
  returning * into session_row;

  return session_row;
end;
$$;

-- ------------------------------------------------------------------------------
-- 5. Seeding — numbering, permissions
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
  foreach m in array array[
    'items', 'partners', 'inventory', 'procurement', 'sales', 'financials',
    'fixed_assets', 'hrm', 'fleet', 'pos', 'approvals', 'settings', 'users'
  ] loop
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
  from (values
    ('approvals', 'view'), ('approvals', 'update'),
    ('settings', 'view'), ('users', 'view'),
    ('financials', 'view'), ('financials', 'create'), ('financials', 'update'),
    ('fixed_assets', 'view'),
    ('hrm', 'view'),
    ('fleet', 'view'), ('fleet', 'create'), ('fleet', 'update'),
    ('pos', 'view'), ('pos', 'create'), ('pos', 'update')
  ) as perms(mod_name, act_name)
  on conflict (role_id, module, action) do nothing;

  -- Staff: operational read + create; HRM (salaries) deliberately excluded,
  -- fleet is view-only. POS is the counter role's own module: full view +
  -- create (ring up sales, open/close their own drawer).
  insert into v2.permissions (role_id, module, action)
  select staff_role_id, mod_name, 'view'
  from unnest(array[
    'items', 'partners', 'inventory', 'procurement', 'sales', 'fleet', 'pos',
    'approvals', 'settings', 'users'
  ]) as mod_name
  on conflict (role_id, module, action) do nothing;
  insert into v2.permissions (role_id, module, action)
  select staff_role_id, mod_name, 'create'
  from unnest(array['inventory', 'procurement', 'sales', 'pos']) as mod_name
  on conflict (role_id, module, action) do nothing;
end;
$$;

create or replace function v2.seed_pos_defaults(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = v2
as $$
begin
  insert into v2.numbering_series (tenant_id, doc_type, prefix)
  values (p_tenant_id, 'pos_sale', 'POS-')
  on conflict (tenant_id, doc_type) do nothing;
end;
$$;

-- New tenants get POS numbering too.
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
  perform v2.seed_approval_defaults(new_org_id);
  perform v2.seed_financial_defaults(new_org_id);
  perform v2.seed_hrm_fleet_defaults(new_org_id);
  perform v2.seed_pos_defaults(new_org_id);

  return new_org_id;
end;
$$;

-- Backfill existing tenants (idempotent) — POS numbering plus the 'pos'
-- module permissions the redefined seed_default_permissions now grants.
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

    perform v2.seed_pos_defaults(org.id);
  end loop;
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
  for t in
    select unnest(array['cash_drawer_sessions', 'pos_sales', 'pos_sale_lines'])
  loop
    execute format('alter table v2.%I enable row level security;', t);
    execute format(
      'drop policy if exists "%1$s_tenant_select" on v2.%1$s; create policy "%1$s_tenant_select" on v2.%1$s for select using (tenant_id = v2.current_tenant_id() or v2.is_platform_owner());',
      t
    );
  end loop;
end;
$$;
