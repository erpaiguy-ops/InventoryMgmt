-- ==============================================================================
-- Development seed data
-- Run with: pnpm --filter @inventory-mgmt/database seed
-- Note: profiles reference auth.users; create a user via Supabase Auth first
-- and update the profile insert below with that user's id if you want a
-- fully linked demo login.
-- ==============================================================================

insert into public.organizations (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Demo Organization')
on conflict (id) do nothing;

insert into public.warehouses (id, organization_id, name, is_default)
values ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Main Warehouse', true)
on conflict (id) do nothing;

insert into public.categories (id, organization_id, name)
values
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'Electronics'),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 'Office Supplies')
on conflict (id) do nothing;

insert into public.suppliers (id, organization_id, name, email)
values ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000001', 'Acme Supply Co.', 'sales@acmesupply.example')
on conflict (id) do nothing;

insert into public.products (id, organization_id, sku, name, category_id, supplier_id, unit_price, cost_price, reorder_level, reorder_quantity)
values
  ('00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000001', 'SKU-0001', 'Wireless Mouse', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000030', 24.99, 12.50, 20, 50),
  ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000001', 'SKU-0002', 'A4 Paper Ream', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000030', 5.99, 3.00, 100, 200)
on conflict (id) do nothing;

insert into public.stock_levels (product_id, warehouse_id, quantity_on_hand, quantity_reserved)
values
  ('00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000010', 75, 5),
  ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000010', 300, 0)
on conflict (product_id, warehouse_id) do nothing;

insert into public.customers (id, organization_id, name, email)
values ('00000000-0000-0000-0000-000000000050', '00000000-0000-0000-0000-000000000001', 'Northwind Retail', 'orders@northwind.example')
on conflict (id) do nothing;
