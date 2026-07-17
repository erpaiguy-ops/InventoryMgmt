-- ==============================================================================
-- Development seed data
-- Run with: pnpm --filter @inventory-mgmt/database seed
--
-- profiles are populated automatically by the on_auth_user_created trigger
-- when a user signs up via Supabase Auth — there is nothing to seed here.
-- After your first signup, promote yourself if needed:
--   update public.profiles set role = 'super_admin' where email = 'you@example.com';
-- ==============================================================================

insert into public.suppliers (id, name, contact_person, email, phone)
values ('00000000-0000-0000-0000-000000000030', 'Acme Supply Co.', 'Jamie Rivera', 'sales@acmesupply.example', '555-0100')
on conflict (id) do nothing;

-- Inserting a product auto-creates its inventory row (quantity 0) via the
-- create_inventory_row trigger.
insert into public.products (id, sku, name, category, unit_price, cost_price, reorder_level)
values
  ('00000000-0000-0000-0000-000000000040', 'SKU-0001', 'Wireless Mouse', 'Electronics', 24.99, 12.50, 20),
  ('00000000-0000-0000-0000-000000000041', 'SKU-0002', 'A4 Paper Ream', 'Office Supplies', 5.99, 3.00, 100)
on conflict (id) do nothing;

update public.inventory set warehouse_location = 'Main Warehouse'
where product_id in ('00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000041');

-- Load initial stock through stock_movements (the canonical write path) so
-- inventory.quantity and the audit log stay consistent.
insert into public.stock_movements (product_id, quantity_change, movement_type, reference_type, notes)
values
  ('00000000-0000-0000-0000-000000000040', 75, 'adjustment', 'adjustment', 'Initial stock load'),
  ('00000000-0000-0000-0000-000000000041', 300, 'adjustment', 'adjustment', 'Initial stock load');
