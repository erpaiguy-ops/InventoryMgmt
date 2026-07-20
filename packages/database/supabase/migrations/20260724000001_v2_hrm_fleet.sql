-- ==============================================================================
-- v2 Phase 7 — HRM & Payroll (M9) + Fleet & Logistics (M6).
--
-- HRM: employees (optionally linked to a login profile, optionally assigned
-- to a cost center — a driver's salary can land on their vehicle), seeded
-- leave types, approval-gated leave requests (the same approvals engine every
-- other gated document uses), and payroll runs that snapshot each active
-- employee's salary into payslips and post ONE aggregate journal entry:
--   Dr Salary Expense (grouped by cost center, gross)
--   Cr Employee Deductions Payable (withheld)
--   Cr Salaries Payable (net)
-- followed by pay_payroll_run: Dr Salaries Payable / Cr Bank-or-Cash.
--
-- Fleet: vehicles (owned -> optional link to an M8 asset, rented -> just an
-- expense stream), each with an auto-created vehicle cost center so "what
-- does this truck really cost" is a P&L filter; vehicle documents with
-- expiry tracking; and vehicle expenses (fuel / maintenance / rental / toll)
-- posting Dr Vehicle Expense (vehicle's cost center) / Cr chosen account.
--
-- Requires all prior v2 migrations. Idempotent.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HRM — employees & leave
-- ------------------------------------------------------------------------------

create table if not exists v2.employees (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  emp_no text not null,
  full_name text not null,
  profile_id uuid,
  department text,
  designation text,
  email text,
  phone text,
  join_date date,
  is_driver boolean not null default false,
  basic_salary numeric(14,2) not null default 0 check (basic_salary >= 0),
  allowances numeric(14,2) not null default 0 check (allowances >= 0),
  deductions numeric(14,2) not null default 0 check (deductions >= 0),
  cost_center_id uuid,
  status text not null default 'active' check (status in ('active', 'inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, emp_no),
  unique (id, tenant_id),
  foreign key (profile_id, tenant_id) references v2.profiles (id, tenant_id) on delete set null (profile_id),
  foreign key (cost_center_id, tenant_id) references v2.cost_centers (id, tenant_id) on delete set null (cost_center_id)
);
create index if not exists v2_employees_status_idx on v2.employees (tenant_id, status);

create table if not exists v2.leave_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  name text not null,
  default_days integer not null default 0 check (default_days >= 0),
  is_paid boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, name),
  unique (id, tenant_id)
);

create table if not exists v2.leave_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  doc_no text not null,
  employee_id uuid not null,
  leave_type_id uuid not null,
  from_date date not null,
  to_date date not null,
  days numeric(5,1) not null check (days > 0),
  reason_text text,
  status text not null default 'pending_approval'
    check (status in ('pending_approval', 'approved', 'rejected', 'cancelled')),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, doc_no),
  unique (id, tenant_id),
  foreign key (employee_id, tenant_id) references v2.employees (id, tenant_id) on delete cascade,
  foreign key (leave_type_id, tenant_id) references v2.leave_types (id, tenant_id),
  foreign key (created_by, tenant_id) references v2.profiles (id, tenant_id) on delete set null (created_by),
  check (to_date >= from_date)
);

-- ------------------------------------------------------------------------------
-- 2. HRM — payroll
-- ------------------------------------------------------------------------------

create table if not exists v2.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  doc_no text not null,
  run_month date not null,
  status text not null default 'draft' check (status in ('draft', 'posted', 'paid')),
  total_gross numeric(16,2) not null default 0,
  total_deductions numeric(16,2) not null default 0,
  total_net numeric(16,2) not null default 0,
  notes text,
  created_by uuid,
  posted_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, doc_no),
  unique (tenant_id, run_month),
  unique (id, tenant_id),
  foreign key (created_by, tenant_id) references v2.profiles (id, tenant_id) on delete set null (created_by)
);

create table if not exists v2.payslips (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  run_id uuid not null,
  employee_id uuid not null,
  basic numeric(14,2) not null default 0,
  allowances numeric(14,2) not null default 0,
  deductions numeric(14,2) not null default 0,
  net_pay numeric(14,2) not null default 0,
  cost_center_id uuid,
  unique (run_id, employee_id),
  foreign key (run_id, tenant_id) references v2.payroll_runs (id, tenant_id) on delete cascade,
  foreign key (employee_id, tenant_id) references v2.employees (id, tenant_id),
  foreign key (cost_center_id, tenant_id) references v2.cost_centers (id, tenant_id) on delete set null (cost_center_id)
);

-- Post a draft run: one aggregate JE — salary expense grouped by cost center
-- so driver salaries land on their vehicles, deductions and net into their
-- own payables. Idempotent (already-posted runs return untouched).
create or replace function v2.post_payroll_run(p_tenant_id uuid, p_run_id uuid)
returns void
language plpgsql
security definer
set search_path = v2
as $$
declare
  run record;
  grp record;
  v_gross numeric := 0;
  v_deductions numeric := 0;
  v_net numeric := 0;
  v_lines jsonb := '[]'::jsonb;
begin
  select * into run from v2.payroll_runs
  where id = p_run_id and tenant_id = p_tenant_id
  for update;
  if not found then
    raise exception 'Payroll run % not found', p_run_id;
  end if;
  if run.status <> 'draft' then
    return;
  end if;

  select coalesce(sum(basic + allowances), 0), coalesce(sum(deductions), 0), coalesce(sum(net_pay), 0)
  into v_gross, v_deductions, v_net
  from v2.payslips where run_id = p_run_id;
  if v_gross <= 0 then
    raise exception 'Payroll run % has no payslips to post', run.doc_no;
  end if;

  for grp in
    select cost_center_id, sum(basic + allowances) as gross
    from v2.payslips where run_id = p_run_id
    group by cost_center_id
  loop
    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object(
        'account_role', 'salary_expense',
        'debit', grp.gross,
        'cost_center_id', coalesce(grp.cost_center_id::text, '')
      )
    );
  end loop;

  if v_deductions > 0 then
    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object('account_role', 'employee_deductions_payable', 'credit', v_deductions)
    );
  end if;
  v_lines := v_lines || jsonb_build_array(
    jsonb_build_object('account_role', 'salaries_payable', 'credit', v_net)
  );

  perform v2.post_journal_entry(
    p_tenant_id, run.run_month, 'payroll_run', p_run_id,
    'Payroll ' || to_char(run.run_month, 'YYYY-MM'),
    v_lines, run.created_by
  );

  update v2.payroll_runs
  set status = 'posted', posted_at = now(),
      total_gross = v_gross, total_deductions = v_deductions, total_net = v_net
  where id = p_run_id;
end;
$$;

-- Pay a posted run out of the chosen bank/cash account.
create or replace function v2.pay_payroll_run(
  p_tenant_id uuid, p_run_id uuid, p_source_account_id uuid
)
returns void
language plpgsql
security definer
set search_path = v2
as $$
declare
  run record;
begin
  select * into run from v2.payroll_runs
  where id = p_run_id and tenant_id = p_tenant_id
  for update;
  if not found then
    raise exception 'Payroll run % not found', p_run_id;
  end if;
  if run.status <> 'posted' then
    raise exception 'Only posted payroll runs can be paid (run % is %)', run.doc_no, run.status;
  end if;

  perform v2.post_journal_entry(
    p_tenant_id, current_date, 'payroll_payment', p_run_id,
    'Payroll payment ' || run.doc_no,
    jsonb_build_array(
      jsonb_build_object('account_role', 'salaries_payable', 'debit', run.total_net),
      jsonb_build_object('account_id', p_source_account_id, 'credit', run.total_net)
    ),
    run.created_by
  );

  update v2.payroll_runs set status = 'paid', paid_at = now() where id = p_run_id;
end;
$$;

-- ------------------------------------------------------------------------------
-- 3. Fleet — vehicles, documents, expenses
-- ------------------------------------------------------------------------------

create table if not exists v2.vehicles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  doc_no text not null,
  reg_no text not null,
  name text not null,
  ownership text not null default 'owned' check (ownership in ('owned', 'rented')),
  asset_id uuid,
  driver_employee_id uuid,
  cost_center_id uuid,
  capacity text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, reg_no),
  unique (tenant_id, doc_no),
  unique (id, tenant_id),
  foreign key (asset_id, tenant_id) references v2.assets (id, tenant_id) on delete set null (asset_id),
  foreign key (driver_employee_id, tenant_id) references v2.employees (id, tenant_id) on delete set null (driver_employee_id),
  foreign key (cost_center_id, tenant_id) references v2.cost_centers (id, tenant_id) on delete set null (cost_center_id)
);

create table if not exists v2.vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  vehicle_id uuid not null,
  doc_type text not null check (doc_type in ('registration', 'insurance', 'permit', 'inspection', 'other')),
  doc_ref text,
  expiry_date date,
  notes text,
  created_at timestamptz not null default now(),
  foreign key (vehicle_id, tenant_id) references v2.vehicles (id, tenant_id) on delete cascade
);
create index if not exists v2_vehicle_docs_expiry_idx on v2.vehicle_documents (tenant_id, expiry_date);

create table if not exists v2.vehicle_expenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  doc_no text not null,
  vehicle_id uuid not null,
  expense_type text not null check (expense_type in ('fuel', 'maintenance', 'rental', 'toll', 'other')),
  expense_date date not null default current_date,
  amount numeric(14,2) not null check (amount > 0),
  odometer numeric(12,1),
  quantity numeric(12,2),
  description text,
  status text not null default 'draft' check (status in ('draft', 'posted')),
  created_by uuid,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, doc_no),
  unique (id, tenant_id),
  foreign key (vehicle_id, tenant_id) references v2.vehicles (id, tenant_id),
  foreign key (created_by, tenant_id) references v2.profiles (id, tenant_id) on delete set null (created_by)
);

-- Post a vehicle expense: Dr Vehicle Expense on the vehicle's cost center,
-- Cr the caller's chosen account (bank, cash, or AP).
create or replace function v2.post_vehicle_expense(
  p_tenant_id uuid, p_expense_id uuid, p_credit_account_id uuid
)
returns void
language plpgsql
security definer
set search_path = v2
as $$
declare
  exp record;
  v_vehicle record;
begin
  select * into exp from v2.vehicle_expenses
  where id = p_expense_id and tenant_id = p_tenant_id
  for update;
  if not found then
    raise exception 'Vehicle expense % not found', p_expense_id;
  end if;
  if exp.status = 'posted' then
    return;
  end if;

  select * into v_vehicle from v2.vehicles where id = exp.vehicle_id;

  perform v2.post_journal_entry(
    p_tenant_id, exp.expense_date, 'vehicle_expense', p_expense_id,
    initcap(exp.expense_type) || ' — ' || v_vehicle.reg_no,
    jsonb_build_array(
      jsonb_build_object(
        'account_role', 'vehicle_expense',
        'debit', exp.amount,
        'cost_center_id', coalesce(v_vehicle.cost_center_id::text, '')
      ),
      jsonb_build_object('account_id', p_credit_account_id, 'credit', exp.amount)
    ),
    exp.created_by
  );

  update v2.vehicle_expenses set status = 'posted', posted_at = now() where id = p_expense_id;
end;
$$;

-- ------------------------------------------------------------------------------
-- 4. Grants, updated_at, RLS
-- ------------------------------------------------------------------------------

grant select, insert, update, delete on all tables in schema v2 to authenticated, service_role;
grant execute on all functions in schema v2 to authenticated, service_role;

do $$
declare
  t text;
begin
  for t in select unnest(array['employees', 'leave_requests', 'payroll_runs', 'vehicles']) loop
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
      'employees', 'leave_types', 'leave_requests', 'payroll_runs', 'payslips',
      'vehicles', 'vehicle_documents', 'vehicle_expenses'
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
-- 5. Seeding — accounts, permissions, workflows, leave types, numbering
-- ------------------------------------------------------------------------------

create or replace function v2.seed_hrm_fleet_defaults(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = v2
as $$
begin
  insert into v2.accounts (tenant_id, code, name, account_type, normal_balance, system_role, is_system) values
    (p_tenant_id, '2200', 'Salaries Payable', 'liability', 'credit', 'salaries_payable', true),
    (p_tenant_id, '2210', 'Employee Deductions Payable', 'liability', 'credit', 'employee_deductions_payable', true),
    (p_tenant_id, '5200', 'Salary Expense', 'expense', 'debit', 'salary_expense', true),
    (p_tenant_id, '5300', 'Vehicle Expense', 'expense', 'debit', 'vehicle_expense', true)
  on conflict (tenant_id, code) do nothing;

  insert into v2.leave_types (tenant_id, name, default_days, is_paid) values
    (p_tenant_id, 'Annual leave', 21, true),
    (p_tenant_id, 'Sick leave', 10, true),
    (p_tenant_id, 'Unpaid leave', 0, false)
  on conflict (tenant_id, name) do nothing;

  insert into v2.numbering_series (tenant_id, doc_type, prefix) values
    (p_tenant_id, 'employee', 'EMP-'),
    (p_tenant_id, 'leave_request', 'LVE-'),
    (p_tenant_id, 'payroll_run', 'PRL-'),
    (p_tenant_id, 'vehicle', 'VEH-'),
    (p_tenant_id, 'vehicle_expense', 'VEX-')
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
    'fixed_assets', 'hrm', 'fleet', 'approvals', 'settings', 'users'
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
    ('fleet', 'view'), ('fleet', 'create'), ('fleet', 'update')
  ) as perms(mod_name, act_name)
  on conflict (role_id, module, action) do nothing;

  -- Staff: operational read + create; HRM (salaries) deliberately excluded,
  -- fleet is view-only.
  insert into v2.permissions (role_id, module, action)
  select staff_role_id, mod_name, 'view'
  from unnest(array[
    'items', 'partners', 'inventory', 'procurement', 'sales', 'fleet',
    'approvals', 'settings', 'users'
  ]) as mod_name
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
    'stock_adjustment', 'stock_audit', 'purchase_order', 'sales_order',
    'sales_return', 'leave_request'
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

-- New tenants get HRM/fleet defaults too.
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
    perform v2.seed_hrm_fleet_defaults(org.id);
  end loop;
end;
$$;
