-- ==============================================================================
-- v2 Phase 6 — Financials (M7) + Fixed Assets (M8).
--
-- The general ledger the operational modules post into automatically — the
-- books become a by-product of doing the work. Chart of accounts with
-- system_role lookups (so posting logic survives renames/recoding), cost
-- centers, a generic post_journal_entry() every posting path funnels through,
-- fiscal-period close guards, AR receipts / AP payments with allocation
-- against open invoices/bills, payment methods, bank accounts + manual
-- reconciliation, and trial-balance/P&L/balance-sheet report functions.
--
-- Fixed assets: category defaults, an asset register, monthly depreciation
-- runs (straight-line or declining-balance), and disposals with gain/loss.
--
-- Auto-posting wired into the EXISTING procurement/sales posting functions:
--   goods receipt  -> Dr Inventory / Cr Goods-Received-Not-Invoiced (GRNI)
--   delivery       -> Dr COGS / Cr Inventory, at the stamped moving-average
--   purchase bill  -> Dr GRNI / Cr Accounts Payable          (app-layer call)
--   sales invoice  -> Dr AR / Cr Revenue (+ Cr Tax Payable)  (app-layer call)
--   ar receipt     -> Dr Bank-or-Cash / Cr AR
--   ap payment     -> Dr AP / Cr Bank-or-Cash
--   depreciation   -> Dr Depreciation Expense / Cr Accumulated Depreciation
--   disposal       -> clears cost + accumulated depreciation, posts gain/loss
--
-- Deliberately out of scope this phase (documented, not silently skipped):
--   multi-currency, bank-feed / CSV statement import (manual entry only),
--   country e-invoicing/tax-filing formats, landed-cost and return postings
--   (folded into item cost / stock only, no GL entry yet).
--
-- Requires foundation, master-data, stock-engine, procurement, and sales
-- migrations. Idempotent.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Chart of accounts + cost centers
-- ------------------------------------------------------------------------------

create table if not exists v2.accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  code text not null,
  name text not null,
  account_type text not null check (account_type in ('asset', 'liability', 'equity', 'revenue', 'expense')),
  normal_balance text not null check (normal_balance in ('debit', 'credit')),
  parent_account_id uuid,
  -- Posting logic resolves accounts by role, not by code/name, so a tenant can
  -- freely rename/recode without breaking auto-posting. One account per role.
  system_role text,
  is_system boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code),
  unique (id, tenant_id),
  foreign key (parent_account_id, tenant_id) references v2.accounts (id, tenant_id) on delete set null (parent_account_id)
);
create unique index if not exists v2_accounts_system_role_uniq
  on v2.accounts (tenant_id, system_role) where system_role is not null;

create table if not exists v2.cost_centers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  code text not null,
  name text not null,
  center_type text not null default 'general' check (center_type in ('general', 'vehicle', 'department', 'project')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code),
  unique (id, tenant_id)
);

-- ------------------------------------------------------------------------------
-- 2. Fiscal periods (self-populating monthly buckets; closing one blocks new
--    journal entries dated inside it)
-- ------------------------------------------------------------------------------

create table if not exists v2.fiscal_periods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, period_start),
  unique (id, tenant_id),
  check (period_end >= period_start)
);

create or replace function v2.ensure_fiscal_period(p_tenant_id uuid, p_date date)
returns v2.fiscal_periods
language plpgsql
security definer
set search_path = v2
as $$
declare
  v_start date := date_trunc('month', p_date)::date;
  v_end date := (date_trunc('month', p_date) + interval '1 month - 1 day')::date;
  v_period v2.fiscal_periods;
begin
  select * into v_period from v2.fiscal_periods
  where tenant_id = p_tenant_id and period_start = v_start;
  if found then
    return v_period;
  end if;
  insert into v2.fiscal_periods (tenant_id, period_start, period_end)
  values (p_tenant_id, v_start, v_end)
  returning * into v_period;
  return v_period;
end;
$$;

-- ------------------------------------------------------------------------------
-- 3. Journal entries — the ONLY way the ledger changes
-- ------------------------------------------------------------------------------

create table if not exists v2.journal_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  entry_no text not null,
  entry_date date not null default current_date,
  source_doc_type text not null,
  source_doc_id uuid,
  memo text,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (tenant_id, entry_no),
  unique (id, tenant_id),
  foreign key (created_by, tenant_id) references v2.profiles (id, tenant_id) on delete set null (created_by)
);
create index if not exists v2_journal_entries_source_idx
  on v2.journal_entries (source_doc_type, source_doc_id);
create index if not exists v2_journal_entries_date_idx on v2.journal_entries (tenant_id, entry_date);

create table if not exists v2.journal_entry_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  entry_id uuid not null,
  account_id uuid not null,
  cost_center_id uuid,
  partner_id uuid,
  debit numeric(16,4) not null default 0 check (debit >= 0),
  credit numeric(16,4) not null default 0 check (credit >= 0),
  description text,
  created_at timestamptz not null default now(),
  foreign key (entry_id, tenant_id) references v2.journal_entries (id, tenant_id) on delete cascade,
  foreign key (account_id, tenant_id) references v2.accounts (id, tenant_id),
  foreign key (cost_center_id, tenant_id) references v2.cost_centers (id, tenant_id) on delete set null (cost_center_id),
  foreign key (partner_id, tenant_id) references v2.partners (id, tenant_id) on delete set null (partner_id),
  check (debit = 0 or credit = 0),
  check (debit > 0 or credit > 0)
);
create index if not exists v2_je_lines_entry_idx on v2.journal_entry_lines (entry_id);
create index if not exists v2_je_lines_account_idx on v2.journal_entry_lines (tenant_id, account_id);

-- Resolve a system-role account, raising a clear error if the tenant's COA is
-- missing it (should never happen once seeded).
create or replace function v2.system_account(p_tenant_id uuid, p_role text)
returns uuid
language plpgsql
security definer
set search_path = v2
as $$
declare
  v_id uuid;
begin
  select id into v_id from v2.accounts where tenant_id = p_tenant_id and system_role = p_role;
  if v_id is null then
    raise exception 'No account with system_role % configured for tenant %', p_role, p_tenant_id;
  end if;
  return v_id;
end;
$$;

-- Generic, balanced journal-entry poster. p_lines is a jsonb array of
-- {account_id?, account_role?, cost_center_id?, partner_id?, debit?, credit?,
-- description?} objects — every posting path (auto or manual) funnels
-- through this so "debits must equal credits" is enforced in exactly one
-- place. Rejects entries dated inside a closed fiscal period.
create or replace function v2.post_journal_entry(
  p_tenant_id uuid,
  p_entry_date date,
  p_source_doc_type text,
  p_source_doc_id uuid,
  p_memo text,
  p_lines jsonb,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = v2
as $$
declare
  v_period v2.fiscal_periods;
  v_entry_no text;
  v_entry_id uuid;
  v_line jsonb;
  v_account_id uuid;
  v_total_debit numeric := 0;
  v_total_credit numeric := 0;
begin
  v_period := v2.ensure_fiscal_period(p_tenant_id, p_entry_date);
  if v_period.status = 'closed' then
    raise exception 'Fiscal period covering % is closed', p_entry_date;
  end if;

  v_entry_no := v2.next_doc_number(p_tenant_id, 'journal');

  insert into v2.journal_entries
    (tenant_id, entry_no, entry_date, source_doc_type, source_doc_id, memo, created_by)
  values
    (p_tenant_id, v_entry_no, p_entry_date, p_source_doc_type, p_source_doc_id, p_memo, p_created_by)
  returning id into v_entry_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    if v_line ? 'account_id' then
      v_account_id := (v_line ->> 'account_id')::uuid;
    else
      v_account_id := v2.system_account(p_tenant_id, v_line ->> 'account_role');
    end if;

    insert into v2.journal_entry_lines
      (tenant_id, entry_id, account_id, cost_center_id, partner_id, debit, credit, description)
    values
      (p_tenant_id, v_entry_id, v_account_id,
       nullif(v_line ->> 'cost_center_id', '')::uuid,
       nullif(v_line ->> 'partner_id', '')::uuid,
       coalesce((v_line ->> 'debit')::numeric, 0),
       coalesce((v_line ->> 'credit')::numeric, 0),
       v_line ->> 'description');

    v_total_debit := v_total_debit + coalesce((v_line ->> 'debit')::numeric, 0);
    v_total_credit := v_total_credit + coalesce((v_line ->> 'credit')::numeric, 0);
  end loop;

  if round(v_total_debit, 4) <> round(v_total_credit, 4) then
    raise exception 'Journal entry does not balance: debits % <> credits %', v_total_debit, v_total_credit;
  end if;

  return v_entry_id;
end;
$$;

create or replace function v2.close_fiscal_period(p_tenant_id uuid, p_period_start date)
returns void
language plpgsql
security definer
set search_path = v2
as $$
begin
  update v2.fiscal_periods
  set status = 'closed', updated_at = now()
  where tenant_id = p_tenant_id and period_start = p_period_start;
  if not found then
    raise exception 'No fiscal period starting % for tenant %', p_period_start, p_tenant_id;
  end if;
end;
$$;

-- ------------------------------------------------------------------------------
-- 4. Payment methods, bank accounts + transactions
-- ------------------------------------------------------------------------------

create table if not exists v2.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  name text not null,
  account_number text,
  account_id uuid not null,
  opening_balance numeric(16,4) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name),
  unique (id, tenant_id),
  foreign key (account_id, tenant_id) references v2.accounts (id, tenant_id)
);

create table if not exists v2.payment_methods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  name text not null,
  method_type text not null check (method_type in ('cash', 'bank', 'card', 'cheque', 'other')),
  bank_account_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, name),
  unique (id, tenant_id),
  foreign key (bank_account_id, tenant_id) references v2.bank_accounts (id, tenant_id) on delete set null (bank_account_id)
);

create table if not exists v2.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  bank_account_id uuid not null,
  txn_date date not null default current_date,
  description text,
  amount numeric(16,4) not null check (amount <> 0),
  source text not null default 'manual' check (source in ('manual', 'receipt', 'payment')),
  source_doc_type text,
  source_doc_id uuid,
  is_reconciled boolean not null default false,
  reconciled_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  foreign key (bank_account_id, tenant_id) references v2.bank_accounts (id, tenant_id),
  foreign key (created_by, tenant_id) references v2.profiles (id, tenant_id) on delete set null (created_by)
);
create index if not exists v2_bank_txn_account_idx on v2.bank_transactions (tenant_id, bank_account_id, txn_date);

-- ------------------------------------------------------------------------------
-- 5. AR receipts / AP payments + allocations against open documents
-- ------------------------------------------------------------------------------

alter table v2.sales_invoices add column if not exists amount_paid numeric(16,4) not null default 0;
alter table v2.purchase_bills add column if not exists amount_paid numeric(16,4) not null default 0;

do $$ begin
  alter table v2.sales_invoices add constraint sales_invoices_amount_paid_check
    check (amount_paid >= 0 and amount_paid <= total);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table v2.purchase_bills add constraint purchase_bills_amount_paid_check
    check (amount_paid >= 0 and amount_paid <= total);
exception when duplicate_object then null; end $$;

create table if not exists v2.ar_receipts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  doc_no text not null,
  customer_id uuid not null,
  receipt_date date not null default current_date,
  amount numeric(16,4) not null check (amount > 0),
  payment_method_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (tenant_id, doc_no),
  unique (id, tenant_id),
  foreign key (customer_id, tenant_id) references v2.partners (id, tenant_id),
  foreign key (payment_method_id, tenant_id) references v2.payment_methods (id, tenant_id) on delete set null (payment_method_id),
  foreign key (created_by, tenant_id) references v2.profiles (id, tenant_id) on delete set null (created_by)
);

create table if not exists v2.ar_receipt_allocations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  receipt_id uuid not null,
  invoice_id uuid not null,
  amount numeric(16,4) not null check (amount > 0),
  foreign key (receipt_id, tenant_id) references v2.ar_receipts (id, tenant_id) on delete cascade,
  foreign key (invoice_id, tenant_id) references v2.sales_invoices (id, tenant_id)
);

create table if not exists v2.ap_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  doc_no text not null,
  supplier_id uuid not null,
  payment_date date not null default current_date,
  amount numeric(16,4) not null check (amount > 0),
  payment_method_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (tenant_id, doc_no),
  unique (id, tenant_id),
  foreign key (supplier_id, tenant_id) references v2.partners (id, tenant_id),
  foreign key (payment_method_id, tenant_id) references v2.payment_methods (id, tenant_id) on delete set null (payment_method_id),
  foreign key (created_by, tenant_id) references v2.profiles (id, tenant_id) on delete set null (created_by)
);

create table if not exists v2.ap_payment_allocations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  payment_id uuid not null,
  bill_id uuid not null,
  amount numeric(16,4) not null check (amount > 0),
  foreign key (payment_id, tenant_id) references v2.ap_payments (id, tenant_id) on delete cascade,
  foreign key (bill_id, tenant_id) references v2.purchase_bills (id, tenant_id)
);

-- ------------------------------------------------------------------------------
-- 6. Fixed assets (M8)
-- ------------------------------------------------------------------------------

create table if not exists v2.asset_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  name text not null,
  default_method text not null default 'straight_line' check (default_method in ('straight_line', 'declining_balance')),
  default_life_months integer not null check (default_life_months > 0),
  default_salvage_pct numeric(5,2) not null default 0 check (default_salvage_pct between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name),
  unique (id, tenant_id)
);

create table if not exists v2.assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  asset_no text not null,
  name text not null,
  category_id uuid not null,
  acquisition_date date not null default current_date,
  acquisition_cost numeric(16,4) not null check (acquisition_cost > 0),
  salvage_value numeric(16,4) not null default 0 check (salvage_value >= 0),
  useful_life_months integer not null check (useful_life_months > 0),
  method text not null check (method in ('straight_line', 'declining_balance')),
  status text not null default 'active' check (status in ('active', 'fully_depreciated', 'disposed')),
  accumulated_depreciation numeric(16,4) not null default 0,
  cost_center_id uuid,
  purchase_bill_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, asset_no),
  unique (id, tenant_id),
  foreign key (category_id, tenant_id) references v2.asset_categories (id, tenant_id),
  foreign key (cost_center_id, tenant_id) references v2.cost_centers (id, tenant_id) on delete set null (cost_center_id),
  foreign key (purchase_bill_id, tenant_id) references v2.purchase_bills (id, tenant_id) on delete set null (purchase_bill_id),
  foreign key (created_by, tenant_id) references v2.profiles (id, tenant_id) on delete set null (created_by),
  check (salvage_value <= acquisition_cost)
);
create index if not exists v2_assets_status_idx on v2.assets (tenant_id, status);

create table if not exists v2.depreciation_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  run_date date not null,
  total_amount numeric(16,4) not null default 0,
  created_by uuid,
  posted_at timestamptz not null default now(),
  unique (tenant_id, run_date),
  unique (id, tenant_id),
  foreign key (created_by, tenant_id) references v2.profiles (id, tenant_id) on delete set null (created_by)
);

create table if not exists v2.depreciation_run_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  run_id uuid not null,
  asset_id uuid not null,
  amount numeric(16,4) not null check (amount > 0),
  foreign key (run_id, tenant_id) references v2.depreciation_runs (id, tenant_id) on delete cascade,
  foreign key (asset_id, tenant_id) references v2.assets (id, tenant_id)
);

create table if not exists v2.asset_disposals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  asset_id uuid not null,
  disposal_date date not null default current_date,
  proceeds numeric(16,4) not null default 0 check (proceeds >= 0),
  gain_loss numeric(16,4) not null,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (id, tenant_id),
  foreign key (asset_id, tenant_id) references v2.assets (id, tenant_id),
  foreign key (created_by, tenant_id) references v2.profiles (id, tenant_id) on delete set null (created_by)
);

-- Register an asset and post Dr Fixed Assets / Cr <funding account chosen by
-- the caller — typically Bank/Cash, or Accounts Payable if the vendor hasn't
-- been paid yet. purchase_bill_id is for traceability only in this phase; it
-- does not reverse or re-post that bill's own journal entry.
create or replace function v2.register_asset(
  p_tenant_id uuid,
  p_asset_id uuid,
  p_funding_account_id uuid,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = v2
as $$
declare
  a record;
begin
  select * into a from v2.assets where id = p_asset_id and tenant_id = p_tenant_id;
  if not found then
    raise exception 'Asset % not found', p_asset_id;
  end if;

  return v2.post_journal_entry(
    p_tenant_id,
    a.acquisition_date,
    'asset',
    p_asset_id,
    'Asset registered: ' || a.name,
    jsonb_build_array(
      jsonb_build_object('account_role', 'fixed_assets', 'debit', a.acquisition_cost),
      jsonb_build_object('account_id', p_funding_account_id, 'credit', a.acquisition_cost)
    ),
    p_created_by
  );
end;
$$;

-- Monthly depreciation run: straight-line = (cost - salvage) / life_months,
-- capped at what remains; declining-balance = net book value * (2 / life
-- months), also capped. Idempotent per (tenant, run_date) — re-running a
-- month that already ran returns the existing run without reprocessing.
create or replace function v2.run_depreciation(p_tenant_id uuid, p_run_date date, p_created_by uuid default null)
returns uuid
language plpgsql
security definer
set search_path = v2
as $$
declare
  existing_run_id uuid;
  v_run_id uuid;
  a record;
  v_base numeric;
  v_remaining numeric;
  v_amount numeric;
  v_total numeric := 0;
  v_lines jsonb := '[]'::jsonb;
begin
  select id into existing_run_id from v2.depreciation_runs
  where tenant_id = p_tenant_id and run_date = p_run_date;
  if existing_run_id is not null then
    return existing_run_id;
  end if;

  insert into v2.depreciation_runs (tenant_id, run_date, created_by)
  values (p_tenant_id, p_run_date, p_created_by)
  returning id into v_run_id;

  for a in
    select * from v2.assets
    where tenant_id = p_tenant_id and status = 'active'
    order by created_at
    for update
  loop
    v_base := a.acquisition_cost - a.salvage_value;
    v_remaining := v_base - a.accumulated_depreciation;
    if v_remaining <= 0 then
      update v2.assets set status = 'fully_depreciated', updated_at = now() where id = a.id;
      continue;
    end if;

    if a.method = 'declining_balance' then
      v_amount := (a.acquisition_cost - a.accumulated_depreciation) * (2.0 / a.useful_life_months);
    else
      v_amount := v_base / a.useful_life_months;
    end if;
    v_amount := least(v_amount, v_remaining);

    if v_amount > 0 then
      insert into v2.depreciation_run_lines (tenant_id, run_id, asset_id, amount)
      values (p_tenant_id, v_run_id, a.id, v_amount);

      update v2.assets
      set accumulated_depreciation = accumulated_depreciation + v_amount,
          status = case when accumulated_depreciation + v_amount >= v_base then 'fully_depreciated' else status end,
          updated_at = now()
      where id = a.id;

      v_total := v_total + v_amount;
    end if;
  end loop;

  if v_total > 0 then
    perform v2.post_journal_entry(
      p_tenant_id,
      p_run_date,
      'depreciation_run',
      v_run_id,
      'Depreciation run ' || to_char(p_run_date, 'YYYY-MM'),
      jsonb_build_array(
        jsonb_build_object('account_role', 'depreciation_expense', 'debit', v_total),
        jsonb_build_object('account_role', 'accumulated_depreciation', 'credit', v_total)
      ),
      p_created_by
    );
  end if;

  update v2.depreciation_runs set total_amount = v_total where id = v_run_id;
  return v_run_id;
end;
$$;

-- Disposal: clears cost + accumulated depreciation, deposits proceeds into
-- the chosen account, and posts the gain or loss vs. net book value.
create or replace function v2.dispose_asset(
  p_tenant_id uuid,
  p_asset_id uuid,
  p_disposal_date date,
  p_proceeds numeric,
  p_deposit_account_id uuid,
  p_notes text,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = v2
as $$
declare
  a record;
  v_book_value numeric;
  v_gain_loss numeric;
  v_disposal_id uuid;
  v_lines jsonb := '[]'::jsonb;
begin
  select * into a from v2.assets where id = p_asset_id and tenant_id = p_tenant_id for update;
  if not found then
    raise exception 'Asset % not found', p_asset_id;
  end if;
  if a.status = 'disposed' then
    raise exception 'Asset % is already disposed', a.asset_no;
  end if;

  v_book_value := a.acquisition_cost - a.accumulated_depreciation;
  v_gain_loss := p_proceeds - v_book_value;

  insert into v2.asset_disposals
    (tenant_id, asset_id, disposal_date, proceeds, gain_loss, notes, created_by)
  values
    (p_tenant_id, p_asset_id, p_disposal_date, p_proceeds, v_gain_loss, p_notes, p_created_by)
  returning id into v_disposal_id;

  v_lines := jsonb_build_array(
    jsonb_build_object('account_id', p_deposit_account_id, 'debit', p_proceeds),
    jsonb_build_object('account_role', 'accumulated_depreciation', 'debit', a.accumulated_depreciation),
    jsonb_build_object('account_role', 'fixed_assets', 'credit', a.acquisition_cost)
  );
  if v_gain_loss > 0 then
    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object('account_role', 'disposal_gain_loss', 'credit', v_gain_loss)
    );
  elsif v_gain_loss < 0 then
    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object('account_role', 'disposal_gain_loss', 'debit', -v_gain_loss)
    );
  end if;

  perform v2.post_journal_entry(
    p_tenant_id,
    p_disposal_date,
    'asset_disposal',
    v_disposal_id,
    'Disposal of asset ' || a.asset_no,
    v_lines,
    p_created_by
  );

  update v2.assets set status = 'disposed', updated_at = now() where id = p_asset_id;

  return v_disposal_id;
end;
$$;

-- ------------------------------------------------------------------------------
-- 7. Auto-posting: alter the EXISTING procurement/sales posting functions
-- ------------------------------------------------------------------------------

-- Goods receipt now also posts Dr Inventory / Cr Goods-Received-Not-Invoiced
-- for the value received, on top of everything it already did in Phase 4.
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
  v_value_total numeric := 0;
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

    update v2.item_suppliers
    set last_cost = line.unit_cost
    where item_id = line.item_id and partner_id = po.supplier_id;

    v_value_total := v_value_total + (line.qty * line.unit_cost);
  end loop;

  update v2.goods_receipts
  set status = 'posted', posted_at = now()
  where id = p_doc_id;

  select coalesce(sum(qty - qty_received), 0) into remaining
  from v2.purchase_order_lines where po_id = doc.po_id;
  if remaining = 0 then
    update v2.purchase_orders set status = 'received' where id = doc.po_id;
  end if;

  if v_value_total > 0 then
    perform v2.post_journal_entry(
      p_tenant_id,
      current_date,
      'goods_receipt',
      p_doc_id,
      'Goods receipt ' || doc.doc_no,
      jsonb_build_array(
        jsonb_build_object('account_role', 'inventory', 'debit', v_value_total),
        jsonb_build_object('account_role', 'grni', 'credit', v_value_total)
      ),
      doc.created_by
    );
  end if;
end;
$$;

-- Delivery now also posts Dr COGS / Cr Inventory at the moving-average cost
-- the ledger trigger stamps onto each line, on top of everything it already
-- did in Phase 5.
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
  v_unit_cost numeric;
  v_cogs_total numeric := 0;
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
       'sale_delivery', 'delivery', p_doc_id, doc.created_by)
    returning unit_cost into v_unit_cost;

    v_cogs_total := v_cogs_total + (line.qty * v_unit_cost);

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

  if v_cogs_total > 0 then
    perform v2.post_journal_entry(
      p_tenant_id,
      current_date,
      'delivery',
      p_doc_id,
      'Delivery ' || doc.doc_no,
      jsonb_build_array(
        jsonb_build_object('account_role', 'cogs', 'debit', v_cogs_total),
        jsonb_build_object('account_role', 'inventory', 'credit', v_cogs_total)
      ),
      doc.created_by
    );
  end if;
end;
$$;

-- Allocate an AR receipt across open invoices, updating amount_paid/status,
-- and post Dr Bank-or-Cash / Cr AR for the receipt total.
create or replace function v2.post_ar_receipt(
  p_tenant_id uuid,
  p_receipt_id uuid,
  p_deposit_account_id uuid
)
returns void
language plpgsql
security definer
set search_path = v2
as $$
declare
  r record;
  alloc record;
  inv record;
begin
  select * into r from v2.ar_receipts where id = p_receipt_id and tenant_id = p_tenant_id;
  if not found then
    raise exception 'AR receipt % not found', p_receipt_id;
  end if;

  for alloc in select * from v2.ar_receipt_allocations where receipt_id = p_receipt_id loop
    select * into inv from v2.sales_invoices where id = alloc.invoice_id for update;
    if alloc.amount > (inv.total - inv.amount_paid) then
      raise exception 'Allocation % exceeds outstanding balance % on invoice %',
        alloc.amount, inv.total - inv.amount_paid, inv.doc_no;
    end if;
    update v2.sales_invoices
    set amount_paid = amount_paid + alloc.amount,
        status = case when amount_paid + alloc.amount >= total then 'paid' else status end
    where id = inv.id;
  end loop;

  perform v2.post_journal_entry(
    p_tenant_id,
    r.receipt_date,
    'ar_receipt',
    p_receipt_id,
    'Receipt ' || r.doc_no,
    jsonb_build_array(
      jsonb_build_object('account_id', p_deposit_account_id, 'debit', r.amount, 'partner_id', r.customer_id),
      jsonb_build_object('account_role', 'ar', 'credit', r.amount, 'partner_id', r.customer_id)
    ),
    r.created_by
  );
end;
$$;

-- Allocate an AP payment across open bills, updating amount_paid/status, and
-- post Dr AP / Cr Bank-or-Cash for the payment total.
create or replace function v2.post_ap_payment(
  p_tenant_id uuid,
  p_payment_id uuid,
  p_source_account_id uuid
)
returns void
language plpgsql
security definer
set search_path = v2
as $$
declare
  p record;
  alloc record;
  bill record;
begin
  select * into p from v2.ap_payments where id = p_payment_id and tenant_id = p_tenant_id;
  if not found then
    raise exception 'AP payment % not found', p_payment_id;
  end if;

  for alloc in select * from v2.ap_payment_allocations where payment_id = p_payment_id loop
    select * into bill from v2.purchase_bills where id = alloc.bill_id for update;
    if alloc.amount > (bill.total - bill.amount_paid) then
      raise exception 'Allocation % exceeds outstanding balance % on bill %',
        alloc.amount, bill.total - bill.amount_paid, bill.doc_no;
    end if;
    update v2.purchase_bills
    set amount_paid = amount_paid + alloc.amount,
        status = case when amount_paid + alloc.amount >= total then 'paid' else status end
    where id = bill.id;
  end loop;

  perform v2.post_journal_entry(
    p_tenant_id,
    p.payment_date,
    'ap_payment',
    p_payment_id,
    'Payment ' || p.doc_no,
    jsonb_build_array(
      jsonb_build_object('account_role', 'ap', 'debit', p.amount, 'partner_id', p.supplier_id),
      jsonb_build_object('account_id', p_source_account_id, 'credit', p.amount, 'partner_id', p.supplier_id)
    ),
    p.created_by
  );
end;
$$;

-- ------------------------------------------------------------------------------
-- 8. Reports
-- ------------------------------------------------------------------------------

-- Cumulative balance of asset/liability/equity accounts as of a date. Every
-- account in scope is returned (0 if it has no qualifying lines) — lines
-- outside the date window contribute 0 rather than being dropped, which
-- would otherwise make an account vanish instead of showing a zero balance.
create or replace function v2.report_balance_sheet(p_tenant_id uuid, p_as_of date)
returns table (
  account_id uuid, code text, name text, account_type text, normal_balance text, balance numeric
)
language sql
stable
security definer
set search_path = v2
as $$
  select
    a.id, a.code, a.name, a.account_type, a.normal_balance,
    case when a.normal_balance = 'debit'
      then coalesce(sum(case when e.id is not null then l.debit else 0 end), 0)
         - coalesce(sum(case when e.id is not null then l.credit else 0 end), 0)
      else coalesce(sum(case when e.id is not null then l.credit else 0 end), 0)
         - coalesce(sum(case when e.id is not null then l.debit else 0 end), 0)
    end as balance
  from v2.accounts a
  left join v2.journal_entry_lines l on l.account_id = a.id
  left join v2.journal_entries e on e.id = l.entry_id and e.entry_date <= p_as_of
  where a.tenant_id = p_tenant_id and a.account_type in ('asset', 'liability', 'equity')
  group by a.id, a.code, a.name, a.account_type, a.normal_balance
  order by a.code;
$$;

-- Period balance of revenue/expense accounts, optionally filtered to one
-- cost center (e.g. "what does truck #3 really cost"). Same zero-row-safe
-- shape as the balance sheet: every account in scope is returned.
create or replace function v2.report_profit_and_loss(
  p_tenant_id uuid, p_from date, p_to date, p_cost_center_id uuid default null
)
returns table (
  account_id uuid, code text, name text, account_type text, normal_balance text, balance numeric
)
language sql
stable
security definer
set search_path = v2
as $$
  select
    a.id, a.code, a.name, a.account_type, a.normal_balance,
    case when a.normal_balance = 'credit'
      then coalesce(sum(case when e.id is not null and (p_cost_center_id is null or l.cost_center_id = p_cost_center_id) then l.credit else 0 end), 0)
         - coalesce(sum(case when e.id is not null and (p_cost_center_id is null or l.cost_center_id = p_cost_center_id) then l.debit else 0 end), 0)
      else coalesce(sum(case when e.id is not null and (p_cost_center_id is null or l.cost_center_id = p_cost_center_id) then l.debit else 0 end), 0)
         - coalesce(sum(case when e.id is not null and (p_cost_center_id is null or l.cost_center_id = p_cost_center_id) then l.credit else 0 end), 0)
    end as balance
  from v2.accounts a
  left join v2.journal_entry_lines l on l.account_id = a.id
  left join v2.journal_entries e on e.id = l.entry_id and e.entry_date between p_from and p_to
  where a.tenant_id = p_tenant_id and a.account_type in ('revenue', 'expense')
  group by a.id, a.code, a.name, a.account_type, a.normal_balance
  order by a.code;
$$;

-- ------------------------------------------------------------------------------
-- 9. Grants, updated_at, RLS
-- ------------------------------------------------------------------------------

grant select, insert, update, delete on all tables in schema v2 to authenticated, service_role;
grant execute on all functions in schema v2 to authenticated, service_role;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'accounts', 'cost_centers', 'fiscal_periods', 'bank_accounts',
      'payment_methods', 'asset_categories', 'assets'
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
      'accounts', 'cost_centers', 'fiscal_periods', 'journal_entries', 'journal_entry_lines',
      'bank_accounts', 'payment_methods', 'bank_transactions',
      'ar_receipts', 'ar_receipt_allocations', 'ap_payments', 'ap_payment_allocations',
      'asset_categories', 'assets', 'depreciation_runs', 'depreciation_run_lines', 'asset_disposals'
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
-- 10. Seeding — chart of accounts, cost center, payment methods, bank
--     account, numbering, permissions
-- ------------------------------------------------------------------------------

create or replace function v2.seed_financial_defaults(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = v2
as $$
declare
  v_bank_gl_id uuid;
  v_bank_account_id uuid;
begin
  insert into v2.accounts (tenant_id, code, name, account_type, normal_balance, system_role, is_system) values
    (p_tenant_id, '1000', 'Cash', 'asset', 'debit', 'cash', true),
    (p_tenant_id, '1010', 'Bank - Main Account', 'asset', 'debit', 'bank', true),
    (p_tenant_id, '1100', 'Accounts Receivable', 'asset', 'debit', 'ar', true),
    (p_tenant_id, '1200', 'Inventory', 'asset', 'debit', 'inventory', true),
    (p_tenant_id, '1500', 'Fixed Assets', 'asset', 'debit', 'fixed_assets', true),
    (p_tenant_id, '1590', 'Accumulated Depreciation', 'asset', 'credit', 'accumulated_depreciation', true),
    (p_tenant_id, '1900', 'Tax Receivable (Input)', 'asset', 'debit', 'tax_receivable', true),
    (p_tenant_id, '2000', 'Accounts Payable', 'liability', 'credit', 'ap', true),
    (p_tenant_id, '2050', 'Goods Received Not Invoiced', 'liability', 'credit', 'grni', true),
    (p_tenant_id, '2100', 'Tax Payable (Output)', 'liability', 'credit', 'tax_payable', true),
    (p_tenant_id, '3000', 'Retained Earnings', 'equity', 'credit', 'retained_earnings', true),
    (p_tenant_id, '4000', 'Sales Revenue', 'revenue', 'credit', 'revenue', true),
    (p_tenant_id, '4900', 'Gain/Loss on Asset Disposal', 'revenue', 'credit', 'disposal_gain_loss', true),
    (p_tenant_id, '5000', 'Cost of Goods Sold', 'expense', 'debit', 'cogs', true),
    (p_tenant_id, '5100', 'Depreciation Expense', 'expense', 'debit', 'depreciation_expense', true)
  on conflict (tenant_id, code) do nothing;

  insert into v2.cost_centers (tenant_id, code, name, center_type)
  values (p_tenant_id, 'GEN', 'General', 'general')
  on conflict (tenant_id, code) do nothing;

  select id into v_bank_gl_id from v2.accounts
  where tenant_id = p_tenant_id and system_role = 'bank';

  insert into v2.bank_accounts (tenant_id, name, account_id, opening_balance)
  values (p_tenant_id, 'Main Account', v_bank_gl_id, 0)
  on conflict (tenant_id, name) do nothing;

  select id into v_bank_account_id from v2.bank_accounts
  where tenant_id = p_tenant_id and name = 'Main Account';

  insert into v2.payment_methods (tenant_id, name, method_type, bank_account_id) values
    (p_tenant_id, 'Cash', 'cash', null),
    (p_tenant_id, 'Bank Transfer', 'bank', v_bank_account_id)
  on conflict (tenant_id, name) do nothing;

  insert into v2.numbering_series (tenant_id, doc_type, prefix)
  values (p_tenant_id, 'fixed_asset', 'FA-')
  on conflict (tenant_id, doc_type) do nothing;
end;
$$;

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
    'fixed_assets', 'approvals', 'settings', 'users'
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
    ('fixed_assets', 'view')
  ) as perms(mod_name, act_name)
  on conflict (role_id, module, action) do nothing;

  -- Staff: read everything they work with, create on the operational
  -- (non-financial) modules only — financials/fixed_assets are sensitive by
  -- default and not granted to staff.
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

-- Re-create so NEW tenants also get the chart of accounts etc. (was missing
-- the seed_financial_defaults call before this phase).
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
    perform v2.seed_financial_defaults(org.id);
  end loop;
end;
$$;
