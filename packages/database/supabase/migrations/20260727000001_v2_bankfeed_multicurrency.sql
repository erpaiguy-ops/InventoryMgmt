-- ==============================================================================
-- v2 Phase 11 — Bank-feed CSV import + reconciliation matching, multi-currency.
--
-- Bank feed: bank_transactions gains a 'feed' source and a self-referencing
-- matched_txn_id. Importing a CSV statement inserts rows with source='feed',
-- unreconciled. Matching an imported row against an existing system-generated
-- row (source='manual'/'receipt'/'payment') marks BOTH reconciled — the
-- existing single-row "mark reconciled" toggle from Phase 6 still works
-- unchanged for entries that were never fed in.
--
-- Multi-currency: sales_invoices/purchase_bills/ar_receipts/ap_payments gain
-- currency + fx_rate (units of the tenant's base currency per 1 unit of that
-- document's currency). Document totals/balances stay in the document's own
-- currency throughout (invoicing, allocation, outstanding-balance checks are
-- all unaffected) — only GL posting converts to base currency. Settlement
-- (AR receipt / AP payment) captures its own fx_rate, and the difference
-- between the rate at invoice/bill time and the rate at settlement time posts
-- to a new fx_gain_loss account (same single-account gain/loss pattern
-- Phase 6 already uses for asset disposals). A receipt/payment can only be
-- allocated against documents in its own currency — cross-currency
-- allocation on one receipt is out of scope, documented rather than guessed.
--
-- A tenant that never touches multi-currency sees zero behavioral change:
-- default currency 'USD' + fx_rate 1 on both sides of every settlement
-- always nets to a zero FX difference, so no extra journal line is ever
-- posted for a single-currency tenant.
--
-- Requires all prior v2 migrations. Idempotent.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Bank feed: schema + import/match RPCs
-- ------------------------------------------------------------------------------

alter table v2.bank_transactions add column if not exists reference text;
alter table v2.bank_transactions add column if not exists matched_txn_id uuid;

do $$
begin
  alter table v2.bank_transactions drop constraint if exists bank_transactions_source_check;
  alter table v2.bank_transactions add constraint bank_transactions_source_check
    check (source in ('manual', 'receipt', 'payment', 'feed'));
exception when duplicate_object then null;
end;
$$;

-- Self-referencing FK needs (id, tenant_id) to be a unique target first —
-- bank_transactions never needed that composite uniqueness before now.
do $$
begin
  alter table v2.bank_transactions add constraint bank_transactions_id_tenant_id_key unique (id, tenant_id);
exception when duplicate_object or duplicate_table then null;
end;
$$;

do $$
begin
  alter table v2.bank_transactions add constraint bank_transactions_matched_txn_id_fkey
    foreign key (matched_txn_id, tenant_id) references v2.bank_transactions (id, tenant_id) on delete set null (matched_txn_id);
exception when duplicate_object then null;
end;
$$;

-- Bulk-insert a parsed CSV statement as unreconciled feed rows. p_rows is a
-- jsonb array of {txn_date, description, amount, reference?}.
create or replace function v2.import_bank_feed(
  p_tenant_id uuid,
  p_bank_account_id uuid,
  p_rows jsonb,
  p_created_by uuid default null
)
returns integer
language plpgsql
security definer
set search_path = v2
as $$
declare
  v_row jsonb;
  v_count integer := 0;
begin
  for v_row in select * from jsonb_array_elements(p_rows) loop
    insert into v2.bank_transactions
      (tenant_id, bank_account_id, txn_date, description, amount, reference, source, created_by)
    values
      (p_tenant_id, p_bank_account_id, (v_row ->> 'txn_date')::date, v_row ->> 'description',
       (v_row ->> 'amount')::numeric, v_row ->> 'reference', 'feed', p_created_by);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- Confirm an imported feed row is the same real-world movement as an
-- existing (manual/receipt/payment) row: same account, same amount, both
-- still unreconciled. Marks both sides reconciled and links the feed row to
-- what it matched.
create or replace function v2.match_bank_transaction(
  p_tenant_id uuid,
  p_feed_txn_id uuid,
  p_target_txn_id uuid
)
returns void
language plpgsql
security definer
set search_path = v2
as $$
declare
  feed record;
  target record;
begin
  if p_feed_txn_id = p_target_txn_id then
    raise exception 'A transaction cannot be matched to itself';
  end if;

  select * into feed from v2.bank_transactions
  where id = p_feed_txn_id and tenant_id = p_tenant_id for update;
  if not found then
    raise exception 'Bank transaction % not found', p_feed_txn_id;
  end if;
  if feed.source <> 'feed' then
    raise exception 'Transaction % is not an imported feed row', p_feed_txn_id;
  end if;
  if feed.is_reconciled then
    raise exception 'Feed row % is already reconciled', p_feed_txn_id;
  end if;

  select * into target from v2.bank_transactions
  where id = p_target_txn_id and tenant_id = p_tenant_id for update;
  if not found then
    raise exception 'Bank transaction % not found', p_target_txn_id;
  end if;
  if target.source = 'feed' then
    raise exception 'A feed row must be matched against a system entry, not another feed row';
  end if;
  if target.is_reconciled then
    raise exception 'Target transaction % is already reconciled', p_target_txn_id;
  end if;
  if target.bank_account_id <> feed.bank_account_id then
    raise exception 'Both sides of a match must be on the same bank account';
  end if;
  if target.amount <> feed.amount then
    raise exception 'Amounts do not match: % vs %', feed.amount, target.amount;
  end if;

  update v2.bank_transactions
  set matched_txn_id = target.id, is_reconciled = true, reconciled_at = now()
  where id = feed.id;
  update v2.bank_transactions
  set is_reconciled = true, reconciled_at = now()
  where id = target.id;
end;
$$;

-- ------------------------------------------------------------------------------
-- 2. Multi-currency: schema
-- ------------------------------------------------------------------------------
--
-- org_settings.currency (Phase 2R) is the tenant's base/reporting currency —
-- it already existed as a settings field but nothing read it for GL purposes
-- until now. partners.currency (Phase 2R) already exists too, as an optional
-- default-currency hint for a given customer/supplier. Neither is added
-- here; this phase is the first to actually use both.

alter table v2.sales_invoices add column if not exists currency text not null default 'USD';
alter table v2.sales_invoices add column if not exists fx_rate numeric(14,6) not null default 1;
do $$
begin
  alter table v2.sales_invoices add constraint sales_invoices_fx_rate_check check (fx_rate > 0);
exception when duplicate_object then null;
end;
$$;

alter table v2.purchase_bills add column if not exists currency text not null default 'USD';
alter table v2.purchase_bills add column if not exists fx_rate numeric(14,6) not null default 1;
do $$
begin
  alter table v2.purchase_bills add constraint purchase_bills_fx_rate_check check (fx_rate > 0);
exception when duplicate_object then null;
end;
$$;

alter table v2.ar_receipts add column if not exists currency text not null default 'USD';
alter table v2.ar_receipts add column if not exists fx_rate numeric(14,6) not null default 1;
do $$
begin
  alter table v2.ar_receipts add constraint ar_receipts_fx_rate_check check (fx_rate > 0);
exception when duplicate_object then null;
end;
$$;

alter table v2.ap_payments add column if not exists currency text not null default 'USD';
alter table v2.ap_payments add column if not exists fx_rate numeric(14,6) not null default 1;
do $$
begin
  alter table v2.ap_payments add constraint ap_payments_fx_rate_check check (fx_rate > 0);
exception when duplicate_object then null;
end;
$$;

-- ------------------------------------------------------------------------------
-- 3. Multi-currency: fx_gain_loss system account
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
    (p_tenant_id, '4950', 'Foreign Exchange Gain/Loss', 'revenue', 'credit', 'fx_gain_loss', true),
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

-- Backfill: seed_financial_defaults is fully idempotent (every insert is
-- on-conflict-do-nothing), so re-running it for every existing tenant only
-- adds the new fx_gain_loss account — everything else is a no-op.
do $$
declare
  org record;
begin
  for org in select id from v2.organizations loop
    perform v2.seed_financial_defaults(org.id);
  end loop;
end;
$$;

-- ------------------------------------------------------------------------------
-- 4. Multi-currency: settlement posting (FX gain/loss on receipt/payment)
-- ------------------------------------------------------------------------------

-- Allocate an AR receipt across open invoices (same currency only), updating
-- amount_paid/status, and post Dr Bank-or-Cash (base currency deposited) /
-- Cr AR (base currency relieved, at each invoice's own booked rate) — the
-- difference between what was deposited and what was booked is the FX
-- gain/loss. Single-currency tenants (fx_rate = 1 everywhere) always see
-- zero difference, so behavior is unchanged from Phase 6.
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
  v_ar_base_total numeric := 0;
  v_deposit_base numeric;
  v_fx_diff numeric;
  v_lines jsonb;
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
    if inv.currency <> r.currency then
      raise exception 'Receipt currency % does not match invoice % currency %',
        r.currency, inv.doc_no, inv.currency;
    end if;
    update v2.sales_invoices
    set amount_paid = amount_paid + alloc.amount,
        status = case when amount_paid + alloc.amount >= total then 'paid' else status end
    where id = inv.id;

    v_ar_base_total := v_ar_base_total + (alloc.amount * inv.fx_rate);
  end loop;

  v_deposit_base := r.amount * r.fx_rate;
  v_fx_diff := round(v_deposit_base - v_ar_base_total, 4);

  v_lines := jsonb_build_array(
    jsonb_build_object('account_id', p_deposit_account_id, 'debit', v_deposit_base, 'partner_id', r.customer_id),
    jsonb_build_object('account_role', 'ar', 'credit', v_ar_base_total, 'partner_id', r.customer_id)
  );
  if v_fx_diff > 0 then
    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object('account_role', 'fx_gain_loss', 'credit', v_fx_diff, 'partner_id', r.customer_id)
    );
  elsif v_fx_diff < 0 then
    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object('account_role', 'fx_gain_loss', 'debit', -v_fx_diff, 'partner_id', r.customer_id)
    );
  end if;

  perform v2.post_journal_entry(
    p_tenant_id,
    r.receipt_date,
    'ar_receipt',
    p_receipt_id,
    'Receipt ' || r.doc_no,
    v_lines,
    r.created_by
  );
end;
$$;

-- Mirror of post_ar_receipt for the payable side: Dr AP (base currency
-- relieved, at each bill's own booked rate) / Cr Bank-or-Cash (base currency
-- paid out), with the FX difference posted the same way.
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
  v_ap_base_total numeric := 0;
  v_payment_base numeric;
  v_fx_diff numeric;
  v_lines jsonb;
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
    if bill.currency <> p.currency then
      raise exception 'Payment currency % does not match bill % currency %',
        p.currency, bill.doc_no, bill.currency;
    end if;
    update v2.purchase_bills
    set amount_paid = amount_paid + alloc.amount,
        status = case when amount_paid + alloc.amount >= total then 'paid' else status end
    where id = bill.id;

    v_ap_base_total := v_ap_base_total + (alloc.amount * bill.fx_rate);
  end loop;

  v_payment_base := p.amount * p.fx_rate;
  v_fx_diff := round(v_ap_base_total - v_payment_base, 4);

  v_lines := jsonb_build_array(
    jsonb_build_object('account_role', 'ap', 'debit', v_ap_base_total, 'partner_id', p.supplier_id),
    jsonb_build_object('account_id', p_source_account_id, 'credit', v_payment_base, 'partner_id', p.supplier_id)
  );
  if v_fx_diff > 0 then
    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object('account_role', 'fx_gain_loss', 'credit', v_fx_diff, 'partner_id', p.supplier_id)
    );
  elsif v_fx_diff < 0 then
    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object('account_role', 'fx_gain_loss', 'debit', -v_fx_diff, 'partner_id', p.supplier_id)
    );
  end if;

  perform v2.post_journal_entry(
    p_tenant_id,
    p.payment_date,
    'ap_payment',
    p_payment_id,
    'Payment ' || p.doc_no,
    v_lines,
    p.created_by
  );
end;
$$;

-- ------------------------------------------------------------------------------
-- 5. Grants
-- ------------------------------------------------------------------------------

grant select, insert, update, delete on all tables in schema v2 to authenticated, service_role;
grant execute on all functions in schema v2 to authenticated, service_role;
