-- Security hardening for Supabase Data API exposure.
-- Tables created by Prisma live in the public schema. In Supabase, public
-- schema tables are exposed through the auto-generated Data API, so RLS must
-- be enabled explicitly.

alter table if exists public.users enable row level security;
alter table if exists public.sessions enable row level security;
alter table if exists public.stores enable row level security;
alter table if exists public.products enable row level security;
alter table if exists public.orders enable row level security;
alter table if exists public.order_items enable row level security;
alter table if exists public.payments enable row level security;
alter table if exists public.suppliers enable row level security;
alter table if exists public.supplier_products enable row level security;
alter table if exists public.trending_products enable row level security;
alter table if exists public.notifications enable row level security;
alter table if exists public.audit_logs enable row level security;
alter table if exists public.carts enable row level security;
alter table if exists public.cart_items enable row level security;
alter table if exists public.shopify_order_syncs enable row level security;
alter table if exists public.shopify_product_mappings enable row level security;
alter table if exists public.supplier_orders enable row level security;
alter table if exists public.coupons enable row level security;
alter table if exists public.reviews enable row level security;

-- Remove direct Data API access until explicit policies are designed.
-- The backend uses the DATABASE_URL connection and is not expected to rely on
-- anon/authenticated PostgREST access for these application tables.
revoke all on table public.users from anon, authenticated;
revoke all on table public.sessions from anon, authenticated;
revoke all on table public.stores from anon, authenticated;
revoke all on table public.products from anon, authenticated;
revoke all on table public.orders from anon, authenticated;
revoke all on table public.order_items from anon, authenticated;
revoke all on table public.payments from anon, authenticated;
revoke all on table public.suppliers from anon, authenticated;
revoke all on table public.supplier_products from anon, authenticated;
revoke all on table public.trending_products from anon, authenticated;
revoke all on table public.notifications from anon, authenticated;
revoke all on table public.audit_logs from anon, authenticated;
revoke all on table public.carts from anon, authenticated;
revoke all on table public.cart_items from anon, authenticated;
revoke all on table public.shopify_order_syncs from anon, authenticated;
revoke all on table public.shopify_product_mappings from anon, authenticated;
revoke all on table public.supplier_orders from anon, authenticated;
revoke all on table public.coupons from anon, authenticated;
revoke all on table public.reviews from anon, authenticated;
