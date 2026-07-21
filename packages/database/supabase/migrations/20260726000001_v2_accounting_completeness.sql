-- ==============================================================================
-- v2 Phase 10 — Accounting completeness.
--
-- Closes two gaps left open (and explicitly documented) by earlier phases:
--
-- 1. Leave accrual: leave requests previously just flipped status on approval
--    with no balance behind them — an employee could be approved for more
--    annual leave than they'd accrued. v2.leave_balances now tracks
--    allocated/used per employee/leave-type/year (allocated seeded from the
--    leave type's default_days), and v2.approve_leave_request enforces it
--    atomically at the moment of final approval (the same place the balance
--    is deducted), not just as an app-layer pre-check. Unpaid leave types
--    (is_paid = false) are exempt by design — there's nothing to accrue.
--
-- 2. GL posting for landed costs and returns: Phase 6's header noted
--    "landed-cost and return postings (folded into item cost / stock only,
--    no GL entry yet)" as deliberately out of scope. This phase closes it:
--      purchase return -> Dr Accounts Payable / Cr Inventory
--      landed cost     -> Dr Inventory / Cr Accounts Payable
--      sales return    -> Dr Inventory / Cr COGS
--    Sales returns intentionally only reverse the stock/COGS side here —
--    the stamped moving-average cost gives a reliable value, but reversing
--    the AR/Revenue side would need per-line pricing that sales_return_lines
--    doesn't capture today (a return has no linkage back to the invoice's
--    unit price/tax). That remains a manual credit-note entry for now,
--    documented rather than silently approximated.
--
-- Requires all prior v2 migrations. Idempotent.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Leave balances
-- ------------------------------------------------------------------------------

create table if not exists v2.leave_balances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  employee_id uuid not null,
  leave_type_id uuid not null,
  year integer not null,
  allocated numeric(5,1) not null default 0 check (allocated >= 0),
  used numeric(5,1) not null default 0 check (used >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, employee_id, leave_type_id, year),
  unique (id, tenant_id),
  foreign key (employee_id, tenant_id) references v2.employees (id, tenant_id) on delete cascade,
  foreign key (leave_type_id, tenant_id) references v2.leave_types (id, tenant_id)
);

-- Get-or-create this employee/leave-type/year's balance row, seeded from the
-- leave type's default_days the first time it's touched. Locks the row (or
-- the about-to-exist slot, via the unique constraint) so concurrent callers
-- serialize instead of racing to insert.
create or replace function v2.ensure_leave_balance(
  p_tenant_id uuid,
  p_employee_id uuid,
  p_leave_type_id uuid,
  p_year integer
)
returns v2.leave_balances
language plpgsql
security definer
set search_path = v2
as $$
declare
  v_balance v2.leave_balances;
  v_default numeric;
begin
  select * into v_balance from v2.leave_balances
  where tenant_id = p_tenant_id and employee_id = p_employee_id
    and leave_type_id = p_leave_type_id and year = p_year
  for update;
  if found then
    return v_balance;
  end if;

  select default_days into v_default from v2.leave_types
  where id = p_leave_type_id and tenant_id = p_tenant_id;

  insert into v2.leave_balances (tenant_id, employee_id, leave_type_id, year, allocated)
  values (p_tenant_id, p_employee_id, p_leave_type_id, p_year, coalesce(v_default, 0))
  on conflict (tenant_id, employee_id, leave_type_id, year) do update set year = excluded.year
  returning * into v_balance;
  return v_balance;
end;
$$;

-- Final-approval handler for leave_request (registered as the approvals
-- engine's poster). Deducts the balance for paid leave types, rejecting the
-- approval outright if it would go negative — this is the hard enforcement
-- point; the app layer's pre-check at submission time is just fail-fast UX.
create or replace function v2.approve_leave_request(p_tenant_id uuid, p_doc_id uuid)
returns void
language plpgsql
security definer
set search_path = v2
as $$
declare
  doc record;
  lt record;
  v_year integer;
  v_balance v2.leave_balances;
begin
  select * into doc from v2.leave_requests
  where id = p_doc_id and tenant_id = p_tenant_id
  for update;
  if not found then
    raise exception 'Leave request % not found', p_doc_id;
  end if;
  if doc.status = 'approved' then
    return;
  end if;

  select * into lt from v2.leave_types
  where id = doc.leave_type_id and tenant_id = p_tenant_id;

  if lt.is_paid then
    v_year := extract(year from doc.from_date)::int;
    v_balance := v2.ensure_leave_balance(p_tenant_id, doc.employee_id, doc.leave_type_id, v_year);
    if v_balance.allocated - v_balance.used < doc.days then
      raise exception 'Leave balance exceeded: % day(s) remaining of % for %, request needs %',
        v_balance.allocated - v_balance.used, lt.name, v_year, doc.days;
    end if;

    update v2.leave_balances
    set used = used + doc.days, updated_at = now()
    where id = v_balance.id;
  end if;

  update v2.leave_requests
  set status = 'approved', updated_at = now()
  where id = p_doc_id;
end;
$$;

-- ------------------------------------------------------------------------------
-- 2. GL posting: purchase returns, landed costs, sales returns
-- ------------------------------------------------------------------------------

-- Supplier return now also posts Dr Accounts Payable / Cr Inventory for the
-- value returned (at the average cost the ledger trigger stamps on the
-- negative movement), on top of everything it already did in Phase 4.
create or replace function v2.post_purchase_return(p_tenant_id uuid, p_doc_id uuid)
returns void
language plpgsql
security definer
set search_path = v2
as $$
declare
  doc record;
  line record;
  v_unit_cost numeric;
  v_value_total numeric := 0;
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
       'purchase_return', 'purchase_return', p_doc_id, doc.created_by)
    returning unit_cost into v_unit_cost;

    v_value_total := v_value_total + (line.qty * v_unit_cost);
  end loop;

  if v_value_total > 0 then
    perform v2.post_journal_entry(
      p_tenant_id,
      current_date,
      'purchase_return',
      p_doc_id,
      'Purchase return ' || doc.doc_no,
      jsonb_build_array(
        jsonb_build_object('account_role', 'ap', 'debit', v_value_total),
        jsonb_build_object('account_role', 'inventory', 'credit', v_value_total)
      ),
      doc.created_by
    );
  end if;
end;
$$;

-- Landed cost now also posts Dr Inventory / Cr Accounts Payable for the
-- voucher amount, on top of everything it already did in Phase 4 (folding
-- the allocated share into each item's moving average).
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

  if doc.amount > 0 then
    perform v2.post_journal_entry(
      p_tenant_id,
      current_date,
      'landed_cost',
      p_doc_id,
      'Landed cost ' || doc.doc_no,
      jsonb_build_array(
        jsonb_build_object('account_role', 'inventory', 'debit', doc.amount),
        jsonb_build_object('account_role', 'ap', 'credit', doc.amount)
      ),
      doc.created_by
    );
  end if;
end;
$$;

-- Customer return now also posts Dr Inventory / Cr COGS for the value
-- returned (at the average cost the ledger trigger stamps on the positive
-- movement — a null cost on a positive movement takes the current average),
-- on top of everything it already did in Phase 5. AR/Revenue reversal is
-- deliberately out of scope — see the migration header.
create or replace function v2.post_sales_return(p_tenant_id uuid, p_doc_id uuid)
returns void
language plpgsql
security definer
set search_path = v2
as $$
declare
  doc record;
  line record;
  v_unit_cost numeric;
  v_value_total numeric := 0;
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
       'sale_return', 'sales_return', p_doc_id, doc.created_by)
    returning unit_cost into v_unit_cost;

    v_value_total := v_value_total + (line.qty * v_unit_cost);
  end loop;

  update v2.sales_returns
  set status = 'posted', posted_at = now()
  where id = p_doc_id;

  if v_value_total > 0 then
    perform v2.post_journal_entry(
      p_tenant_id,
      current_date,
      'sales_return',
      p_doc_id,
      'Sales return ' || doc.doc_no,
      jsonb_build_array(
        jsonb_build_object('account_role', 'inventory', 'debit', v_value_total),
        jsonb_build_object('account_role', 'cogs', 'credit', v_value_total)
      ),
      doc.created_by
    );
  end if;
end;
$$;

-- ------------------------------------------------------------------------------
-- 3. Grants, updated_at, RLS
-- ------------------------------------------------------------------------------

grant select, insert, update, delete on all tables in schema v2 to authenticated, service_role;
grant execute on all functions in schema v2 to authenticated, service_role;

do $$
begin
  execute 'drop trigger if exists set_updated_at on v2.leave_balances; create trigger set_updated_at before update on v2.leave_balances for each row execute function v2.set_updated_at();';
end;
$$;

do $$
begin
  execute 'alter table v2.leave_balances enable row level security;';
  execute 'drop policy if exists "leave_balances_tenant_select" on v2.leave_balances; create policy "leave_balances_tenant_select" on v2.leave_balances for select using (tenant_id = v2.current_tenant_id() or v2.is_platform_owner());';
end;
$$;
