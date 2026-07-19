-- ==============================================================================
-- v2 Phase 3 — the stock engine (M3) + approvals & workflow engine (M11).
--
-- Approvals engine: reason_codes, approval_workflows (+steps),
-- approval_requests, approval_actions. N-step chains per document type with a
-- reason going in and a comment trail through every step; gated documents post
-- NOTHING until the final approval, at which point an atomic posting function
-- writes the ledger.
--
-- Stock engine: an immutable stock_ledger under derived stock_balances
-- (item × warehouse × batch), batches with expiry, serials, moving-average
-- valuation in item_costs (issues stamped with cost for later COGS),
-- stock_transfers (two-step, in-transit visible), approval-gated
-- stock_adjustments and stock_audits, and reorder_rules.
--
-- Design rules carried forward: composite (id, tenant_id) FKs everywhere,
-- documents-with-lifecycles, idempotent migration. Requires the foundation
-- and master-data migrations.
-- ==============================================================================

-- ==============================================================================
-- 0. Composite-FK anchors on foundation tables that predate the pattern
-- ==============================================================================
do $$ begin
  alter table v2.roles add constraint roles_id_tenant_uniq unique (id, tenant_id);
exception when duplicate_object then null; when duplicate_table then null; end $$;
do $$ begin
  alter table v2.profiles add constraint profiles_id_tenant_uniq unique (id, tenant_id);
exception when duplicate_object then null; when duplicate_table then null; end $$;

-- ==============================================================================
-- 1. Approvals & workflow engine (M11)
-- ==============================================================================

create table if not exists v2.reason_codes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  doc_type text not null,
  code text not null,
  label text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, doc_type, code),
  unique (id, tenant_id)
);

create table if not exists v2.approval_workflows (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  doc_type text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, doc_type),
  unique (id, tenant_id)
);

create table if not exists v2.approval_workflow_steps (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  workflow_id uuid not null,
  step_no integer not null check (step_no >= 1),
  role_id uuid not null,
  unique (workflow_id, step_no),
  foreign key (workflow_id, tenant_id) references v2.approval_workflows (id, tenant_id) on delete cascade,
  foreign key (role_id, tenant_id) references v2.roles (id, tenant_id) on delete cascade
);

create table if not exists v2.approval_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  doc_type text not null,
  doc_id uuid not null,
  workflow_id uuid not null,
  current_step integer not null default 1,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reason_code_id uuid,
  reason_text text,
  requested_by uuid,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (id, tenant_id),
  foreign key (workflow_id, tenant_id) references v2.approval_workflows (id, tenant_id),
  foreign key (reason_code_id, tenant_id) references v2.reason_codes (id, tenant_id) on delete set null (reason_code_id),
  foreign key (requested_by, tenant_id) references v2.profiles (id, tenant_id) on delete set null (requested_by)
);
-- One live request per document.
create unique index if not exists v2_approval_requests_live_uniq
  on v2.approval_requests (doc_type, doc_id) where status = 'pending';
create index if not exists v2_approval_requests_pending_idx
  on v2.approval_requests (tenant_id, status);

create table if not exists v2.approval_actions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  request_id uuid not null,
  step_no integer not null,
  actor_id uuid,
  decision text not null check (decision in ('approve', 'reject')),
  comment text,
  created_at timestamptz not null default now(),
  foreign key (request_id, tenant_id) references v2.approval_requests (id, tenant_id) on delete cascade,
  foreign key (actor_id, tenant_id) references v2.profiles (id, tenant_id) on delete set null (actor_id)
);

-- ==============================================================================
-- 2. Stock engine (M3) — reference structures
-- ==============================================================================

create table if not exists v2.locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  warehouse_id uuid not null,
  code text not null,
  name text,
  created_at timestamptz not null default now(),
  unique (warehouse_id, code),
  unique (id, tenant_id),
  foreign key (warehouse_id, tenant_id) references v2.warehouses (id, tenant_id) on delete cascade
);

create table if not exists v2.batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  item_id uuid not null,
  batch_no text not null,
  mfg_date date,
  expiry_date date,
  created_at timestamptz not null default now(),
  unique (item_id, batch_no),
  unique (id, tenant_id),
  foreign key (item_id, tenant_id) references v2.items (id, tenant_id) on delete cascade
);
create index if not exists v2_batches_expiry_idx on v2.batches (tenant_id, expiry_date);

create table if not exists v2.serials (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  item_id uuid not null,
  serial_no text not null,
  status text not null default 'in_stock' check (status in ('in_stock', 'issued', 'scrapped')),
  warehouse_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, serial_no),
  unique (id, tenant_id),
  foreign key (item_id, tenant_id) references v2.items (id, tenant_id) on delete cascade,
  foreign key (warehouse_id, tenant_id) references v2.warehouses (id, tenant_id) on delete set null (warehouse_id)
);

-- Moving-average valuation state, one row per item (company-wide average —
-- the standard mid-market approach; per-warehouse layers arrive with FIFO).
create table if not exists v2.item_costs (
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  item_id uuid not null,
  qty_on_hand numeric(16,4) not null default 0,
  avg_cost numeric(16,6) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (item_id),
  foreign key (item_id, tenant_id) references v2.items (id, tenant_id) on delete cascade
);

-- ==============================================================================
-- 3. The ledger — the ONLY way stock changes
-- ==============================================================================

create table if not exists v2.stock_ledger (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  item_id uuid not null,
  warehouse_id uuid not null,
  location_id uuid,
  batch_id uuid,
  qty numeric(16,4) not null check (qty <> 0),
  -- Cost per base unit. Required on receipts (qty > 0); stamped with the
  -- current moving average on issues by the apply trigger.
  unit_cost numeric(16,6),
  movement_type text not null check (movement_type in (
    'opening', 'adjustment', 'audit', 'transfer_out', 'transfer_in',
    'purchase_receipt', 'purchase_return', 'sale_delivery', 'sale_return'
  )),
  source_doc_type text not null,
  source_doc_id uuid not null,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (id, tenant_id),
  foreign key (item_id, tenant_id) references v2.items (id, tenant_id),
  foreign key (warehouse_id, tenant_id) references v2.warehouses (id, tenant_id),
  foreign key (location_id, tenant_id) references v2.locations (id, tenant_id) on delete set null (location_id),
  foreign key (batch_id, tenant_id) references v2.batches (id, tenant_id),
  foreign key (created_by, tenant_id) references v2.profiles (id, tenant_id) on delete set null (created_by)
);
create index if not exists v2_stock_ledger_item_idx on v2.stock_ledger (tenant_id, item_id, created_at);
create index if not exists v2_stock_ledger_doc_idx on v2.stock_ledger (source_doc_type, source_doc_id);

-- The ledger is append-only: corrections are new reversing documents, never edits.
create or replace function v2.stock_ledger_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'stock_ledger is append-only — post a reversing document instead';
end;
$$;
drop trigger if exists stock_ledger_immutable on v2.stock_ledger;
create trigger stock_ledger_immutable
  before update or delete on v2.stock_ledger
  for each row execute function v2.stock_ledger_immutable();

create table if not exists v2.stock_balances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  item_id uuid not null,
  warehouse_id uuid not null,
  batch_id uuid,
  qty_on_hand numeric(16,4) not null default 0 check (qty_on_hand >= 0),
  updated_at timestamptz not null default now(),
  foreign key (item_id, tenant_id) references v2.items (id, tenant_id) on delete cascade,
  foreign key (warehouse_id, tenant_id) references v2.warehouses (id, tenant_id) on delete cascade,
  foreign key (batch_id, tenant_id) references v2.batches (id, tenant_id) on delete cascade
);
create unique index if not exists v2_stock_balances_key
  on v2.stock_balances (item_id, warehouse_id, coalesce(batch_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists v2_stock_balances_wh_idx on v2.stock_balances (tenant_id, warehouse_id);

-- Applies every ledger insert: balance upsert with a lock, negative-stock
-- rejection, and moving-average valuation (receipts re-average; issues get
-- the current average stamped in as their unit_cost).
create or replace function v2.apply_stock_ledger()
returns trigger
language plpgsql
as $$
declare
  bal record;
  cost record;
  batch_key uuid := coalesce(new.batch_id, '00000000-0000-0000-0000-000000000000'::uuid);
begin
  -- Balance row (locked)
  select * into bal
  from v2.stock_balances
  where item_id = new.item_id
    and warehouse_id = new.warehouse_id
    and coalesce(batch_id, '00000000-0000-0000-0000-000000000000'::uuid) = batch_key
  for update;

  if not found then
    if new.qty < 0 then
      raise exception 'Insufficient stock: item % has no balance in this warehouse/batch', new.item_id;
    end if;
    insert into v2.stock_balances (tenant_id, item_id, warehouse_id, batch_id, qty_on_hand)
    values (new.tenant_id, new.item_id, new.warehouse_id, new.batch_id, new.qty);
  else
    if bal.qty_on_hand + new.qty < 0 then
      raise exception 'Insufficient stock: item % would go to % in this warehouse/batch',
        new.item_id, bal.qty_on_hand + new.qty;
    end if;
    update v2.stock_balances
    set qty_on_hand = bal.qty_on_hand + new.qty, updated_at = now()
    where id = bal.id;
  end if;

  -- Valuation row (locked)
  select * into cost from v2.item_costs where item_id = new.item_id for update;
  if not found then
    insert into v2.item_costs (tenant_id, item_id, qty_on_hand, avg_cost)
    values (new.tenant_id, new.item_id, 0, 0);
    select * into cost from v2.item_costs where item_id = new.item_id for update;
  end if;

  if new.qty > 0 then
    -- Receipt: transfer_in re-uses the cost stamped on its transfer_out and
    -- must NOT re-average (the goods never left the company).
    if new.unit_cost is null then
      new.unit_cost := cost.avg_cost;
    end if;
    if new.movement_type <> 'transfer_in' then
      update v2.item_costs
      set avg_cost = case
            when cost.qty_on_hand + new.qty <= 0 then new.unit_cost
            when cost.qty_on_hand <= 0 then new.unit_cost
            else (cost.qty_on_hand * cost.avg_cost + new.qty * new.unit_cost)
                 / (cost.qty_on_hand + new.qty)
          end,
          qty_on_hand = cost.qty_on_hand + new.qty,
          updated_at = now()
      where item_id = new.item_id;
    else
      update v2.item_costs
      set qty_on_hand = cost.qty_on_hand + new.qty, updated_at = now()
      where item_id = new.item_id;
    end if;
  else
    -- Issue: stamp the current average as this movement's cost (COGS basis).
    if new.unit_cost is null then
      new.unit_cost := cost.avg_cost;
    end if;
    update v2.item_costs
    set qty_on_hand = cost.qty_on_hand + new.qty, updated_at = now()
    where item_id = new.item_id;
  end if;

  return new;
end;
$$;
drop trigger if exists apply_stock_ledger on v2.stock_ledger;
create trigger apply_stock_ledger
  before insert on v2.stock_ledger
  for each row execute function v2.apply_stock_ledger();

-- ==============================================================================
-- 4. Stock documents
-- ==============================================================================

create table if not exists v2.stock_transfers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  doc_no text not null,
  from_warehouse_id uuid not null,
  to_warehouse_id uuid not null,
  status text not null default 'draft' check (status in ('draft', 'in_transit', 'received', 'cancelled')),
  notes text,
  created_by uuid,
  dispatched_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, doc_no),
  unique (id, tenant_id),
  foreign key (from_warehouse_id, tenant_id) references v2.warehouses (id, tenant_id),
  foreign key (to_warehouse_id, tenant_id) references v2.warehouses (id, tenant_id),
  foreign key (created_by, tenant_id) references v2.profiles (id, tenant_id) on delete set null (created_by),
  check (from_warehouse_id <> to_warehouse_id)
);

create table if not exists v2.stock_transfer_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  transfer_id uuid not null,
  item_id uuid not null,
  batch_id uuid,
  qty numeric(16,4) not null check (qty > 0),
  foreign key (transfer_id, tenant_id) references v2.stock_transfers (id, tenant_id) on delete cascade,
  foreign key (item_id, tenant_id) references v2.items (id, tenant_id),
  foreign key (batch_id, tenant_id) references v2.batches (id, tenant_id)
);

create table if not exists v2.stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  doc_no text not null,
  warehouse_id uuid not null,
  status text not null default 'draft'
    check (status in ('draft', 'pending_approval', 'posted', 'rejected')),
  is_opening boolean not null default false,
  notes text,
  created_by uuid,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, doc_no),
  unique (id, tenant_id),
  foreign key (warehouse_id, tenant_id) references v2.warehouses (id, tenant_id),
  foreign key (created_by, tenant_id) references v2.profiles (id, tenant_id) on delete set null (created_by)
);

create table if not exists v2.stock_adjustment_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  adjustment_id uuid not null,
  item_id uuid not null,
  batch_no text,
  expiry_date date,
  qty_change numeric(16,4) not null check (qty_change <> 0),
  -- Required for positive changes so valuation stays honest.
  unit_cost numeric(16,6),
  foreign key (adjustment_id, tenant_id) references v2.stock_adjustments (id, tenant_id) on delete cascade,
  foreign key (item_id, tenant_id) references v2.items (id, tenant_id)
);

create table if not exists v2.stock_audits (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  doc_no text not null,
  warehouse_id uuid not null,
  status text not null default 'counting'
    check (status in ('counting', 'pending_approval', 'posted', 'rejected')),
  notes text,
  created_by uuid,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, doc_no),
  unique (id, tenant_id),
  foreign key (warehouse_id, tenant_id) references v2.warehouses (id, tenant_id),
  foreign key (created_by, tenant_id) references v2.profiles (id, tenant_id) on delete set null (created_by)
);

create table if not exists v2.stock_audit_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  audit_id uuid not null,
  item_id uuid not null,
  batch_id uuid,
  -- Snapshot of the system quantity when the count was entered; the posted
  -- variance is counted_qty - system_qty, so the audit says what it saw.
  system_qty numeric(16,4) not null default 0,
  counted_qty numeric(16,4),
  unique (audit_id, item_id, batch_id),
  foreign key (audit_id, tenant_id) references v2.stock_audits (id, tenant_id) on delete cascade,
  foreign key (item_id, tenant_id) references v2.items (id, tenant_id),
  foreign key (batch_id, tenant_id) references v2.batches (id, tenant_id)
);

create table if not exists v2.reorder_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  item_id uuid not null,
  warehouse_id uuid not null,
  min_qty numeric(16,4) not null default 0,
  reorder_qty numeric(16,4) not null default 0,
  preferred_supplier_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, warehouse_id),
  foreign key (item_id, tenant_id) references v2.items (id, tenant_id) on delete cascade,
  foreign key (warehouse_id, tenant_id) references v2.warehouses (id, tenant_id) on delete cascade,
  foreign key (preferred_supplier_id, tenant_id) references v2.partners (id, tenant_id) on delete set null (preferred_supplier_id)
);

-- ==============================================================================
-- 5. Atomic posting functions — called on final approval (or directly for
--    ungated documents). Everything inside runs in one transaction.
-- ==============================================================================

-- Resolve-or-create a batch for (item, batch_no).
create or replace function v2.ensure_batch(
  p_tenant_id uuid, p_item_id uuid, p_batch_no text, p_expiry date
)
returns uuid
language plpgsql
security definer
set search_path = v2
as $$
declare
  v_batch_id uuid;
begin
  if p_batch_no is null then
    return null;
  end if;
  select id into v_batch_id from v2.batches where item_id = p_item_id and batch_no = p_batch_no;
  if v_batch_id is null then
    insert into v2.batches (tenant_id, item_id, batch_no, expiry_date)
    values (p_tenant_id, p_item_id, p_batch_no, p_expiry)
    returning id into v_batch_id;
  end if;
  return v_batch_id;
end;
$$;

create or replace function v2.post_stock_adjustment(p_tenant_id uuid, p_doc_id uuid)
returns void
language plpgsql
security definer
set search_path = v2
as $$
declare
  doc record;
  line record;
  v_batch_id uuid;
begin
  select * into doc from v2.stock_adjustments
  where id = p_doc_id and tenant_id = p_tenant_id
  for update;
  if not found then
    raise exception 'Adjustment % not found', p_doc_id;
  end if;
  if doc.status = 'posted' then
    return; -- idempotent
  end if;

  for line in
    select * from v2.stock_adjustment_lines where adjustment_id = p_doc_id
  loop
    v_batch_id := v2.ensure_batch(p_tenant_id, line.item_id, line.batch_no, line.expiry_date);
    insert into v2.stock_ledger
      (tenant_id, item_id, warehouse_id, batch_id, qty, unit_cost,
       movement_type, source_doc_type, source_doc_id, created_by)
    values
      (p_tenant_id, line.item_id, doc.warehouse_id, v_batch_id, line.qty_change, line.unit_cost,
       case when doc.is_opening then 'opening' else 'adjustment' end,
       'stock_adjustment', p_doc_id, doc.created_by);
  end loop;

  update v2.stock_adjustments
  set status = 'posted', posted_at = now()
  where id = p_doc_id;
end;
$$;

create or replace function v2.post_stock_audit(p_tenant_id uuid, p_doc_id uuid)
returns void
language plpgsql
security definer
set search_path = v2
as $$
declare
  doc record;
  line record;
  variance numeric;
begin
  select * into doc from v2.stock_audits
  where id = p_doc_id and tenant_id = p_tenant_id
  for update;
  if not found then
    raise exception 'Stock audit % not found', p_doc_id;
  end if;
  if doc.status = 'posted' then
    return;
  end if;

  for line in
    select * from v2.stock_audit_lines where audit_id = p_doc_id and counted_qty is not null
  loop
    variance := line.counted_qty - line.system_qty;
    if variance <> 0 then
      insert into v2.stock_ledger
        (tenant_id, item_id, warehouse_id, batch_id, qty, unit_cost,
         movement_type, source_doc_type, source_doc_id, created_by)
      values
        (p_tenant_id, line.item_id, doc.warehouse_id, line.batch_id, variance, null,
         'audit', 'stock_audit', p_doc_id, doc.created_by);
    end if;
  end loop;

  update v2.stock_audits
  set status = 'posted', posted_at = now()
  where id = p_doc_id;
end;
$$;

create or replace function v2.post_stock_transfer_dispatch(p_tenant_id uuid, p_doc_id uuid)
returns void
language plpgsql
security definer
set search_path = v2
as $$
declare
  doc record;
  line record;
begin
  select * into doc from v2.stock_transfers
  where id = p_doc_id and tenant_id = p_tenant_id
  for update;
  if not found or doc.status <> 'draft' then
    raise exception 'Transfer % is not in draft', p_doc_id;
  end if;

  for line in select * from v2.stock_transfer_lines where transfer_id = p_doc_id loop
    insert into v2.stock_ledger
      (tenant_id, item_id, warehouse_id, batch_id, qty, unit_cost,
       movement_type, source_doc_type, source_doc_id, created_by)
    values
      (p_tenant_id, line.item_id, doc.from_warehouse_id, line.batch_id, -line.qty, null,
       'transfer_out', 'stock_transfer', p_doc_id, doc.created_by);
  end loop;

  update v2.stock_transfers
  set status = 'in_transit', dispatched_at = now()
  where id = p_doc_id;
end;
$$;

create or replace function v2.post_stock_transfer_receive(p_tenant_id uuid, p_doc_id uuid)
returns void
language plpgsql
security definer
set search_path = v2
as $$
declare
  doc record;
  line record;
  out_cost numeric;
begin
  select * into doc from v2.stock_transfers
  where id = p_doc_id and tenant_id = p_tenant_id
  for update;
  if not found or doc.status <> 'in_transit' then
    raise exception 'Transfer % is not in transit', p_doc_id;
  end if;

  for line in select * from v2.stock_transfer_lines where transfer_id = p_doc_id loop
    -- Receive at the exact cost the goods left with.
    select sl.unit_cost into out_cost
    from v2.stock_ledger sl
    where sl.source_doc_type = 'stock_transfer'
      and sl.source_doc_id = p_doc_id
      and sl.item_id = line.item_id
      and sl.movement_type = 'transfer_out'
      and coalesce(sl.batch_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = coalesce(line.batch_id, '00000000-0000-0000-0000-000000000000'::uuid)
    limit 1;

    insert into v2.stock_ledger
      (tenant_id, item_id, warehouse_id, batch_id, qty, unit_cost,
       movement_type, source_doc_type, source_doc_id, created_by)
    values
      (p_tenant_id, line.item_id, doc.to_warehouse_id, line.batch_id, line.qty, out_cost,
       'transfer_in', 'stock_transfer', p_doc_id, doc.created_by);
  end loop;

  update v2.stock_transfers
  set status = 'received', received_at = now()
  where id = p_doc_id;
end;
$$;

-- ==============================================================================
-- 6. Grants, updated_at, RLS
-- ==============================================================================

grant select, insert, update, delete on all tables in schema v2 to authenticated, service_role;
grant execute on all functions in schema v2 to authenticated, service_role;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'approval_workflows', 'serials', 'stock_transfers', 'stock_adjustments',
      'stock_audits', 'reorder_rules'
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
      'reason_codes', 'approval_workflows', 'approval_workflow_steps',
      'approval_requests', 'approval_actions', 'locations', 'batches', 'serials',
      'item_costs', 'stock_ledger', 'stock_balances', 'stock_transfers',
      'stock_transfer_lines', 'stock_adjustments', 'stock_adjustment_lines',
      'stock_audits', 'stock_audit_lines', 'reorder_rules'
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
-- 7. Seeding — permission matrix expansion, default workflows & reason codes
-- ==============================================================================

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
  foreach m in array array['items', 'partners', 'inventory', 'approvals', 'settings', 'users'] loop
    insert into v2.permissions (role_id, module, action)
    select admin_role_id, m, a from unnest(all_actions) as a
    on conflict (role_id, module, action) do nothing;
  end loop;

  -- manager: work master data + inventory, act on approvals, read settings/users
  foreach m in array array['items', 'partners', 'inventory'] loop
    insert into v2.permissions (role_id, module, action)
    select manager_role_id, m, a from unnest(array['view', 'create', 'update']) as a
    on conflict (role_id, module, action) do nothing;
  end loop;
  insert into v2.permissions (role_id, module, action)
  select manager_role_id, mod_name, act_name
  from (values ('approvals', 'view'), ('approvals', 'update'),
               ('settings', 'view'), ('users', 'view')) as perms(mod_name, act_name)
  on conflict (role_id, module, action) do nothing;

  -- staff: read everything they work with; create inventory documents
  insert into v2.permissions (role_id, module, action)
  select staff_role_id, mod_name, 'view'
  from unnest(array['items', 'partners', 'inventory', 'approvals', 'settings', 'users']) as mod_name
  on conflict (role_id, module, action) do nothing;
  insert into v2.permissions (role_id, module, action)
  values (staff_role_id, 'inventory', 'create')
  on conflict (role_id, module, action) do nothing;
end;
$$;

-- Default approval workflows (single step, tenant_admin) + reason codes.
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

  foreach dt in array array['stock_adjustment', 'stock_audit'] loop
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
    (p_tenant_id, 'stock_audit', 'spot_check', 'Spot check')
  on conflict (tenant_id, doc_type, code) do nothing;
end;
$$;

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

  return new_org_id;
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
