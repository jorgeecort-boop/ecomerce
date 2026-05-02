-- Returns any application table in public that still has RLS disabled or
-- direct anon/authenticated grants.
-- Expected result after the security migration: zero rows in both sections.

select
  'rls_disabled' as issue,
  n.nspname as schema_name,
  c.relname as table_name,
  null as grantee,
  null as privilege_type
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'users',
    'sessions',
    'stores',
    'products',
    'orders',
    'order_items',
    'payments',
    'suppliers',
    'supplier_products',
    'trending_products',
    'notifications',
    'audit_logs',
    'carts',
    'cart_items',
    'shopify_order_syncs',
    'shopify_product_mappings',
    'supplier_orders',
    'coupons',
    'reviews'
  )
  and c.relrowsecurity is not true
order by c.relname;

select
  'direct_grant_exposed' as issue,
  table_schema as schema_name,
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'users',
    'sessions',
    'stores',
    'products',
    'orders',
    'order_items',
    'payments',
    'suppliers',
    'supplier_products',
    'trending_products',
    'notifications',
    'audit_logs',
    'carts',
    'cart_items',
    'shopify_order_syncs',
    'shopify_product_mappings',
    'supplier_orders',
    'coupons',
    'reviews'
  )
  and grantee in ('anon', 'authenticated')
order by grantee, table_name, privilege_type;
