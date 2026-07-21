-- ==============================================================================
-- v2 Phase 8 — Reports & Dashboards (M10) + Audit Trail (M13).
--
-- Letterhead: org_settings grows the company-identity fields (address,
-- phone, tax number) that print at the top of every exported document —
-- the in-app document studio reads these, the org name, and the existing
-- document_footer to compose PDF/Word letterhead exports.
--
-- Dashboards: three report functions the dashboard reads directly —
-- KPI snapshot, a 12-month sales-vs-purchases trend, and top items by
-- invoiced revenue.
--
-- Audit trail: an app-written audit_log (the API's interceptor records every
-- mutating request by tenant + actor). The stock ledger and journal are
-- already immutable, database-enforced audit records; this adds the "who did
-- what, when, from which endpoint" layer on top.
--
-- Requires all prior v2 migrations. Idempotent.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Letterhead fields on org settings
-- ------------------------------------------------------------------------------

alter table v2.org_settings add column if not exists address text;
alter table v2.org_settings add column if not exists phone text;
alter table v2.org_settings add column if not exists tax_number text;

-- ------------------------------------------------------------------------------
-- 2. Audit log
-- ------------------------------------------------------------------------------

create table if not exists v2.audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  actor_id uuid,
  actor_name text,
  method text not null,
  path text not null,
  module text,
  summary text,
  created_at timestamptz not null default now()
);
create index if not exists v2_audit_log_tenant_idx on v2.audit_log (tenant_id, created_at desc);

-- Append-only: the audit trail cannot be edited from anywhere.
create or replace function v2.audit_log_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_log is append-only';
end;
$$;
drop trigger if exists audit_log_immutable on v2.audit_log;
create trigger audit_log_immutable
  before update or delete on v2.audit_log
  for each row execute function v2.audit_log_immutable();

-- ------------------------------------------------------------------------------
-- 3. Dashboard report functions
-- ------------------------------------------------------------------------------

create or replace function v2.report_dashboard_kpis(p_tenant_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = v2
as $$
  select jsonb_build_object(
    'salesMtd', coalesce((
      select sum(total) from v2.sales_invoices
      where tenant_id = p_tenant_id and status <> 'cancelled'
        and invoice_date >= date_trunc('month', current_date)
    ), 0),
    'purchasesMtd', coalesce((
      select sum(total) from v2.purchase_bills
      where tenant_id = p_tenant_id and status <> 'cancelled'
        and bill_date >= date_trunc('month', current_date)
    ), 0),
    'stockValue', coalesce((
      select sum(qty_on_hand * avg_cost) from v2.item_costs where tenant_id = p_tenant_id
    ), 0),
    'openAr', coalesce((
      select sum(total - amount_paid) from v2.sales_invoices
      where tenant_id = p_tenant_id and status = 'open'
    ), 0),
    'openAp', coalesce((
      select sum(total - amount_paid) from v2.purchase_bills
      where tenant_id = p_tenant_id and status = 'open'
    ), 0),
    'pendingApprovals', coalesce((
      select count(*) from v2.approval_requests
      where tenant_id = p_tenant_id and status = 'pending'
    ), 0),
    'activeEmployees', coalesce((
      select count(*) from v2.employees
      where tenant_id = p_tenant_id and status = 'active'
    ), 0),
    'activeVehicles', coalesce((
      select count(*) from v2.vehicles
      where tenant_id = p_tenant_id and status = 'active'
    ), 0),
    'expiringVehicleDocs', coalesce((
      select count(*) from v2.vehicle_documents
      where tenant_id = p_tenant_id and expiry_date is not null
        and expiry_date <= current_date + 30
    ), 0)
  );
$$;

-- Last 12 calendar months of invoiced sales vs billed purchases, oldest first.
create or replace function v2.report_monthly_trends(p_tenant_id uuid)
returns table (month text, sales numeric, purchases numeric)
language sql
stable
security definer
set search_path = v2
as $$
  with months as (
    select date_trunc('month', current_date) - (interval '1 month' * offs) as m
    from generate_series(11, 0, -1) as offs
  )
  select
    to_char(months.m, 'YYYY-MM') as month,
    coalesce((
      select sum(total) from v2.sales_invoices
      where tenant_id = p_tenant_id and status <> 'cancelled'
        and date_trunc('month', invoice_date) = months.m
    ), 0) as sales,
    coalesce((
      select sum(total) from v2.purchase_bills
      where tenant_id = p_tenant_id and status <> 'cancelled'
        and date_trunc('month', bill_date) = months.m
    ), 0) as purchases
  from months
  order by months.m;
$$;

-- Top items by invoiced revenue in the last 90 days.
create or replace function v2.report_top_items(p_tenant_id uuid, p_limit integer default 5)
returns table (item_id uuid, sku text, name text, qty numeric, revenue numeric)
language sql
stable
security definer
set search_path = v2
as $$
  select
    i.id, i.sku, i.name,
    sum(l.qty) as qty,
    sum(l.line_total) as revenue
  from v2.sales_invoice_lines l
  join v2.sales_invoices inv on inv.id = l.invoice_id
  join v2.items i on i.id = l.item_id
  where l.tenant_id = p_tenant_id
    and inv.status <> 'cancelled'
    and inv.invoice_date >= current_date - 90
  group by i.id, i.sku, i.name
  order by revenue desc
  limit p_limit;
$$;

-- ------------------------------------------------------------------------------
-- 4. Grants + RLS
-- ------------------------------------------------------------------------------

grant select, insert, update, delete on all tables in schema v2 to authenticated, service_role;
grant execute on all functions in schema v2 to authenticated, service_role;

do $$
begin
  execute 'alter table v2.audit_log enable row level security;';
  execute 'drop policy if exists "audit_log_tenant_select" on v2.audit_log; create policy "audit_log_tenant_select" on v2.audit_log for select using (tenant_id = v2.current_tenant_id() or v2.is_platform_owner());';
end;
$$;
