-- ==============================================================================
-- Row Level Security — multi-tenant isolation by organization_id
-- ==============================================================================

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.suppliers enable row level security;
alter table public.warehouses enable row level security;
alter table public.products enable row level security;
alter table public.stock_levels enable row level security;
alter table public.stock_movements enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_lines enable row level security;
alter table public.customers enable row level security;
alter table public.sales_orders enable row level security;
alter table public.sales_order_lines enable row level security;

-- organizations: members can read their own organization
create policy "organizations_select_own" on public.organizations
  for select using (id = public.current_organization_id());

-- profiles: members can read profiles within their organization
create policy "profiles_select_same_org" on public.profiles
  for select using (organization_id = public.current_organization_id());

create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid());

-- generic per-organization CRUD policy applied to each tenant-scoped table
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'categories', 'suppliers', 'warehouses', 'products',
      'stock_movements', 'purchase_orders', 'customers', 'sales_orders'
    ])
  loop
    execute format(
      'create policy "%1$s_select_same_org" on public.%1$s for select using (organization_id = public.current_organization_id());',
      t
    );
    execute format(
      'create policy "%1$s_insert_same_org" on public.%1$s for insert with check (organization_id = public.current_organization_id());',
      t
    );
    execute format(
      'create policy "%1$s_update_same_org" on public.%1$s for update using (organization_id = public.current_organization_id());',
      t
    );
    execute format(
      'create policy "%1$s_delete_admin_manager" on public.%1$s for delete using (organization_id = public.current_organization_id() and public.current_role() in (%2$L, %3$L));',
      t, 'admin', 'manager'
    );
  end loop;
end;
$$;

-- stock_levels: scoped via warehouse -> organization
create policy "stock_levels_select_same_org" on public.stock_levels
  for select using (
    exists (
      select 1 from public.warehouses w
      where w.id = stock_levels.warehouse_id
        and w.organization_id = public.current_organization_id()
    )
  );

create policy "stock_levels_upsert_same_org" on public.stock_levels
  for insert with check (
    exists (
      select 1 from public.warehouses w
      where w.id = stock_levels.warehouse_id
        and w.organization_id = public.current_organization_id()
    )
  );

create policy "stock_levels_update_same_org" on public.stock_levels
  for update using (
    exists (
      select 1 from public.warehouses w
      where w.id = stock_levels.warehouse_id
        and w.organization_id = public.current_organization_id()
    )
  );

-- purchase_order_lines / sales_order_lines: scoped via parent order -> organization
create policy "purchase_order_lines_select_same_org" on public.purchase_order_lines
  for select using (
    exists (
      select 1 from public.purchase_orders po
      where po.id = purchase_order_lines.purchase_order_id
        and po.organization_id = public.current_organization_id()
    )
  );

create policy "purchase_order_lines_write_same_org" on public.purchase_order_lines
  for all using (
    exists (
      select 1 from public.purchase_orders po
      where po.id = purchase_order_lines.purchase_order_id
        and po.organization_id = public.current_organization_id()
    )
  );

create policy "sales_order_lines_select_same_org" on public.sales_order_lines
  for select using (
    exists (
      select 1 from public.sales_orders so
      where so.id = sales_order_lines.sales_order_id
        and so.organization_id = public.current_organization_id()
    )
  );

create policy "sales_order_lines_write_same_org" on public.sales_order_lines
  for all using (
    exists (
      select 1 from public.sales_orders so
      where so.id = sales_order_lines.sales_order_id
        and so.organization_id = public.current_organization_id()
    )
  );
