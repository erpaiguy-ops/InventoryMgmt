-- ==============================================================================
-- v2 foundation schema — multi-tenant, permissions, username auth, platform
-- owners. Isolated from v1 (schema `public`) via a separate Postgres schema
-- `v2` in the SAME Supabase project (dmoqvnkdnrclojhcpnre) — no new project,
-- no new cost.
--
-- MANUAL STEPS REQUIRED (cannot be scripted via SQL):
-- 1. Supabase Dashboard -> Project Settings -> API -> Data API -> add "v2" to
--    "Exposed schemas" (defaults to just public, graphql_public — PostgREST
--    will not serve v2.* tables at all, even to service-role requests, until
--    this is added).
-- 2. Regenerate types after this migration is applied:
--    `pnpm --filter @inventory-mgmt/database types:generate` (updated to
--    request both schemas — see package.json).
--
-- Safe to run standalone in the Supabase SQL Editor, or via
-- `pnpm --filter @inventory-mgmt/database migrate`.
-- ==============================================================================

create schema if not exists v2;
grant usage on schema v2 to authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 1. organizations (tenants)
-- ------------------------------------------------------------------------------
create table if not exists v2.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------------------
-- 2. platform_owners — a separate principal type from tenant users, not just
--    the top of the tenant role hierarchy. Real email (not synthetic): owners
--    are few and benefit from normal self-service password recovery.
-- ------------------------------------------------------------------------------
create table if not exists v2.platform_owners (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------------------
-- 3. roles — tenant-scoped table, not a fixed enum. Every tenant gets its own
--    row-per-role (seeded via create_organization_with_defaults below), which
--    keeps the door open for tenant-customizable roles later without a schema
--    migration touching every foreign key.
-- ------------------------------------------------------------------------------
create table if not exists v2.roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  slug text not null,
  name text not null,
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

-- ------------------------------------------------------------------------------
-- 4. permissions — role x module x action. `module`/`action` are plain text,
--    driven by shared-types constants (packages/shared-types/src/tenant-auth.ts)
--    rather than a modules lookup table, since modules are a code concept
--    (which controllers/routes exist), not tenant-editable data.
-- ------------------------------------------------------------------------------
create table if not exists v2.permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references v2.roles (id) on delete cascade,
  module text not null,
  action text not null check (action in ('view', 'create', 'update', 'delete', 'manage')),
  allow boolean not null default true,
  unique (role_id, module, action)
);

-- ------------------------------------------------------------------------------
-- 5. profiles — tenant-scoped user, extends auth.users. No email column: the
--    synthetic login email lives only in auth.users, an internal auth detail
--    never surfaced to the UI.
-- ------------------------------------------------------------------------------
create table if not exists v2.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  tenant_id uuid not null references v2.organizations (id) on delete cascade,
  username text not null,
  role_id uuid not null references v2.roles (id),
  full_name text,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, username)
);

create index if not exists v2_profiles_tenant_id_idx on v2.profiles (tenant_id);
create index if not exists v2_roles_tenant_id_idx on v2.roles (tenant_id);
create index if not exists v2_permissions_role_id_idx on v2.permissions (role_id);

grant select, insert, update, delete on all tables in schema v2 to authenticated, service_role;

-- ==============================================================================
-- Triggers & functions
-- ==============================================================================

-- updated_at maintenance, mirroring v1's pattern -------------------------------
create or replace function v2.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  for t in
    select unnest(array['organizations', 'platform_owners', 'roles', 'profiles'])
  loop
    execute format(
      'create trigger set_updated_at before update on v2.%I for each row execute function v2.set_updated_at();',
      t
    );
  end loop;
end;
$$;

-- v1 isolation guard -------------------------------------------------------------
-- v1's on_auth_user_created trigger (public.handle_new_user) fires for EVERY
-- auth.users insert, including v2 signups, which would otherwise pollute v1's
-- own public.profiles table (and its /dashboard/users admin page) with
-- synthetic-email v2 accounts. This guard clause is the one deliberate,
-- narrowly-scoped exception to leaving v1 untouched: it edits a live database
-- function, not a v1 application file, and is additive — any insert that
-- doesn't carry the v2 marker (i.e. every v1 signup, exactly as before)
-- behaves byte-for-byte identically to the original function.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data ? 'v2_principal_type' then
    return new;
  end if;

  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- v2's own auth.users -> profiles/platform_owners sync ---------------------------
-- Only fires for inserts carrying user_metadata.v2_principal_type, set by
-- AuthService/UsersService/OwnerAuthService at admin.auth.admin.createUser()
-- time — never by v1 code paths.
create or replace function v2.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = v2, public
as $$
declare
  meta jsonb := new.raw_user_meta_data;
begin
  if meta ->> 'v2_principal_type' = 'owner' then
    insert into v2.platform_owners (id, email, full_name)
    values (new.id, new.email, meta ->> 'full_name')
    on conflict (id) do nothing;
  elsif meta ->> 'v2_principal_type' = 'tenant' then
    insert into v2.profiles (id, tenant_id, username, role_id, full_name)
    values (
      new.id,
      (meta ->> 'tenant_id')::uuid,
      meta ->> 'username',
      (meta ->> 'role_id')::uuid,
      meta ->> 'full_name'
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_v2_auth_user_created on auth.users;
create trigger on_v2_auth_user_created
  after insert on auth.users
  for each row execute function v2.handle_new_auth_user();

-- ------------------------------------------------------------------------------
-- profile_with_permissions — lets the backend's AuthGuard resolve a tenant
-- principal's full permission set in one query instead of profiles -> roles
-- -> permissions as separate round trips.
-- ------------------------------------------------------------------------------
create or replace view v2.profile_with_permissions as
select
  p.id,
  p.tenant_id,
  p.username,
  p.full_name,
  p.status,
  r.id as role_id,
  r.slug as role_slug,
  r.name as role_name,
  coalesce(
    jsonb_object_agg(perm.module, perm.actions) filter (where perm.module is not null),
    '{}'::jsonb
  ) as permissions
from v2.profiles p
join v2.roles r on r.id = p.role_id
left join (
  select role_id, module, jsonb_agg(action) as actions
  from v2.permissions
  where allow = true
  group by role_id, module
) perm on perm.role_id = r.id
group by p.id, p.tenant_id, p.username, p.full_name, p.status, r.id, r.slug, r.name;

grant select on v2.profile_with_permissions to authenticated, service_role;

-- ------------------------------------------------------------------------------
-- create_organization_with_defaults — atomic RPC creating an org plus its 3
-- seeded roles (tenant_admin / manager / staff) and their default `users`
-- module permissions, called via SupabaseService.callTransaction() (the same
-- atomic-RPC pattern already used elsewhere in the backend).
-- ------------------------------------------------------------------------------
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

  insert into v2.permissions (role_id, module, action)
  select admin_role_id, 'users', action
  from unnest(array['view', 'create', 'update', 'delete', 'manage']) as action;

  insert into v2.permissions (role_id, module, action) values (manager_role_id, 'users', 'view');
  insert into v2.permissions (role_id, module, action) values (staff_role_id, 'users', 'view');

  return new_org_id;
end;
$$;

-- ==============================================================================
-- Row Level Security — defense-in-depth backstop, mirroring v1's approach.
-- As in v1, the backend's service-role client bypasses RLS; the real
-- enforcement boundary is the NestJS guards (AuthGuard/PermissionsGuard/
-- OwnerGuard). RLS here guards direct anon/authenticated access only.
-- ==============================================================================

create or replace function v2.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = v2
as $$
  select tenant_id from v2.profiles where id = auth.uid();
$$;

create or replace function v2.is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path = v2
as $$
  select exists (select 1 from v2.platform_owners where id = auth.uid());
$$;

alter table v2.organizations enable row level security;
alter table v2.platform_owners enable row level security;
alter table v2.roles enable row level security;
alter table v2.permissions enable row level security;
alter table v2.profiles enable row level security;

create policy "organizations_owner_all" on v2.organizations
  for all using (v2.is_platform_owner());

create policy "organizations_tenant_select_own" on v2.organizations
  for select using (id = v2.current_tenant_id());

create policy "platform_owners_self" on v2.platform_owners
  for select using (id = auth.uid());

create policy "roles_tenant_select" on v2.roles
  for select using (tenant_id = v2.current_tenant_id() or v2.is_platform_owner());

create policy "permissions_tenant_select" on v2.permissions
  for select using (
    v2.is_platform_owner()
    or role_id in (select id from v2.roles where tenant_id = v2.current_tenant_id())
  );

create policy "profiles_tenant_select" on v2.profiles
  for select using (tenant_id = v2.current_tenant_id() or v2.is_platform_owner());

create policy "profiles_update_self" on v2.profiles
  for update using (id = auth.uid());
