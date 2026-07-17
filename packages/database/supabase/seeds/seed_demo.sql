-- ==============================================================================
-- Demo/showcase seed data — 20+ rows in every operational table.
--
-- Run this once, pasted directly into the Supabase SQL Editor (Dashboard ->
-- SQL Editor -> New query -> paste -> Run). It is independent of seed.sql
-- (which stays minimal, for local/dev use) and does not depend on any
-- specific auth user existing.
--
-- Safe to run on top of the minimal seed.sql (products/suppliers use
-- on conflict do nothing on their natural unique keys). It is NOT safe to
-- run twice on its own: re-running will insert a second batch of suppliers
-- (no natural unique key on name) and a second batch of order line items.
-- If you need to start over, run the "reset" block commented out at the
-- bottom of this file first.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Suppliers (20)
-- ------------------------------------------------------------------------------
insert into public.suppliers (name, contact_person, email, phone, address)
select
  'Supplier ' || i,
  'Contact Person ' || i,
  'supplier' || i || '@example.com',
  '555-01' || lpad(i::text, 2, '0'),
  i || ' Industrial Ave, Springfield'
from generate_series(1, 20) as i
where not exists (select 1 from public.suppliers where name = 'Supplier ' || i);

-- ------------------------------------------------------------------------------
-- 2. Products (20) — inventory rows are auto-created at quantity 0 via the
--    create_inventory_row trigger.
-- ------------------------------------------------------------------------------
insert into public.products (sku, name, description, category, unit_price, cost_price, reorder_level)
values
  ('SKU-1001', 'Wireless Mouse',      'Ergonomic 2.4GHz wireless mouse',        'Electronics',     24.99,  14.99, 20),
  ('SKU-1002', 'Mechanical Keyboard', 'RGB backlit mechanical keyboard',        'Electronics',     59.99,  34.99, 15),
  ('SKU-1003', 'USB-C Hub',           '7-in-1 USB-C docking hub',               'Electronics',     34.99,  18.00, 25),
  ('SKU-1004', '27" Monitor',         '27-inch 1440p IPS monitor',              'Electronics',    249.99, 165.00, 10),
  ('SKU-1005', 'Webcam HD',           '1080p USB webcam with mic',              'Electronics',     45.99,  25.00, 20),
  ('SKU-1006', 'A4 Paper Ream',       '500-sheet A4 printer paper',             'Office Supplies',  5.99,   3.00, 100),
  ('SKU-1007', 'Ballpoint Pen Box',   'Box of 50 ballpoint pens',                'Office Supplies',  8.49,   4.00, 80),
  ('SKU-1008', 'Stapler',             'Heavy-duty desktop stapler',              'Office Supplies', 12.99,   6.50, 30),
  ('SKU-1009', 'Sticky Notes Pack',   '12-pad sticky notes assortment',          'Office Supplies',  4.49,   2.00, 60),
  ('SKU-1010', 'Whiteboard Markers',  'Pack of 8 dry-erase markers',              'Office Supplies',  9.99,   4.50, 50),
  ('SKU-1011', 'Office Chair',        'Ergonomic mesh-back office chair',        'Furniture',       189.99, 110.00, 10),
  ('SKU-1012', 'Standing Desk',       'Electric height-adjustable desk',          'Furniture',       349.99, 220.00, 5),
  ('SKU-1013', 'Bookshelf',           '5-shelf wooden bookshelf',                 'Furniture',       129.99,  75.00, 8),
  ('SKU-1014', 'Filing Cabinet',      '3-drawer steel filing cabinet',            'Furniture',       159.99,  95.00, 8),
  ('SKU-1015', 'Desk Lamp',           'LED desk lamp with USB charging port',    'Furniture',        29.99,  15.00, 25),
  ('SKU-1016', 'Coffee Maker',        '12-cup programmable coffee maker',         'Kitchen',          79.99,  45.00, 15),
  ('SKU-1017', 'Electric Kettle',     '1.7L stainless steel electric kettle',    'Kitchen',          34.99,  18.00, 20),
  ('SKU-1018', 'Microwave Oven',      '900W countertop microwave',                'Kitchen',         129.99,  80.00, 10),
  ('SKU-1019', 'Cordless Drill',      '20V cordless drill with battery',          'Tools',            89.99,  52.00, 15),
  ('SKU-1020', 'Tool Box Set',        '120-piece home tool box set',              'Tools',            64.99,  36.00, 20)
on conflict (sku) do nothing;

update public.inventory
set warehouse_location = 'Main Warehouse'
where warehouse_location is null;

-- ------------------------------------------------------------------------------
-- 3. Initial stock via stock_movements (the canonical write path). Generous
--    quantities so the purchase/sale movements below can never go negative.
-- ------------------------------------------------------------------------------
insert into public.stock_movements (product_id, quantity_change, movement_type, reference_type, notes)
select
  p.id,
  500 + (row_number() over (order by p.sku)) * 25,
  'adjustment',
  'adjustment',
  'Initial stock load (demo seed)'
from public.products p
where p.sku like 'SKU-10%';

-- ------------------------------------------------------------------------------
-- 4. Purchase orders (20) cycling through the 20 suppliers, varied statuses.
-- ------------------------------------------------------------------------------
with numbered_suppliers as (
  select id, row_number() over (order by name) as rn
  from public.suppliers
  where name like 'Supplier %'
)
insert into public.purchase_orders (po_number, supplier_id, order_date, expected_delivery, status, notes)
select
  'PO-2026-' || lpad(i::text, 4, '0'),
  ns.id,
  now() - ((45 - i) || ' days')::interval,
  (now() - ((45 - i) || ' days')::interval + interval '14 days')::date,
  case (i % 5)
    when 0 then 'draft'
    when 1 then 'pending'
    when 2 then 'received'
    when 3 then 'received'
    else 'cancelled'
  end,
  'Seeded demo purchase order ' || i
from generate_series(1, 20) as i
join numbered_suppliers ns on ns.rn = 1 + ((i - 1) % 20)
on conflict (po_number) do nothing;

-- 2 line items per purchase order (40 rows), unit_price = product cost_price.
with numbered_pos as (
  select id, row_number() over (order by po_number) as rn
  from public.purchase_orders
  where po_number like 'PO-2026-%'
),
numbered_products as (
  select id, cost_price, row_number() over (order by sku) as rn
  from public.products
  where sku like 'SKU-10%'
),
po_lines as (
  select po.id as po_id, po.rn as po_rn, item_num
  from numbered_pos po
  cross join (values (1), (2)) as items (item_num)
)
insert into public.purchase_order_items (po_id, product_id, quantity, unit_price)
select
  l.po_id,
  np.id,
  5 + ((l.po_rn * 7 + l.item_num * 3) % 15),
  np.cost_price
from po_lines l
join numbered_products np on np.rn = 1 + ((l.po_rn - 1 + l.item_num - 1) % 20);

update public.purchase_orders po
set total_amount = coalesce((
  select sum(poi.total_price) from public.purchase_order_items poi where poi.po_id = po.id
), 0)
where po.po_number like 'PO-2026-%';

-- Receiving stock for POs already marked 'received' (adds to inventory).
insert into public.stock_movements (product_id, quantity_change, movement_type, reference_id, reference_type, notes)
select
  poi.product_id,
  poi.quantity,
  'purchase',
  po.id,
  'purchase_order',
  'Received against ' || po.po_number
from public.purchase_orders po
join public.purchase_order_items poi on poi.po_id = po.id
where po.status = 'received' and po.po_number like 'PO-2026-%';

-- ------------------------------------------------------------------------------
-- 5. Sales orders (20), varied statuses.
-- ------------------------------------------------------------------------------
insert into public.sales_orders (order_number, customer_name, customer_email, order_date, status, notes)
select
  'SO-2026-' || lpad(i::text, 4, '0'),
  'Customer ' || i,
  'customer' || i || '@example.com',
  now() - ((40 - i) || ' days')::interval,
  case (i % 5)
    when 0 then 'draft'
    when 1 then 'confirmed'
    when 2 then 'shipped'
    when 3 then 'delivered'
    else 'cancelled'
  end,
  'Seeded demo sales order ' || i
from generate_series(1, 20) as i
on conflict (order_number) do nothing;

-- 2 line items per sales order (40 rows), unit_price = product selling price.
with numbered_sos as (
  select id, row_number() over (order by order_number) as rn
  from public.sales_orders
  where order_number like 'SO-2026-%'
),
numbered_products as (
  select id, unit_price, row_number() over (order by sku) as rn
  from public.products
  where sku like 'SKU-10%'
),
so_lines as (
  select so.id as so_id, so.rn as so_rn, item_num
  from numbered_sos so
  cross join (values (1), (2)) as items (item_num)
)
insert into public.sales_order_items (so_id, product_id, quantity, unit_price)
select
  l.so_id,
  np.id,
  2 + ((l.so_rn * 5 + l.item_num * 2) % 10),
  np.unit_price
from so_lines l
join numbered_products np on np.rn = 1 + ((l.so_rn + l.item_num) % 20);

update public.sales_orders so
set total_amount = coalesce((
  select sum(soi.total_price) from public.sales_order_items soi where soi.so_id = so.id
), 0)
where so.order_number like 'SO-2026-%';

-- Shipping stock out for SOs already confirmed/shipped/delivered (reduces inventory).
insert into public.stock_movements (product_id, quantity_change, movement_type, reference_id, reference_type, notes)
select
  soi.product_id,
  -soi.quantity,
  'sale',
  so.id,
  'sales_order',
  'Shipped against ' || so.order_number
from public.sales_orders so
join public.sales_order_items soi on soi.so_id = so.id
where so.status in ('confirmed', 'shipped', 'delivered') and so.order_number like 'SO-2026-%';

-- ==============================================================================
-- Reset (uncomment and run to remove all demo data seeded by this script):
--
-- delete from public.stock_movements where notes like '%demo seed%' or notes like 'Received against PO-2026-%' or notes like 'Shipped against SO-2026-%';
-- delete from public.purchase_order_items where po_id in (select id from public.purchase_orders where po_number like 'PO-2026-%');
-- delete from public.purchase_orders where po_number like 'PO-2026-%';
-- delete from public.sales_order_items where so_id in (select id from public.sales_orders where order_number like 'SO-2026-%');
-- delete from public.sales_orders where order_number like 'SO-2026-%';
-- delete from public.products where sku like 'SKU-10%';
-- delete from public.suppliers where name like 'Supplier %';
-- ==============================================================================
