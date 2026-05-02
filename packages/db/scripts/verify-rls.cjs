const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const tables = [
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
  'reviews',
];

async function main() {
  const tablesWithoutRls = await prisma.$queryRawUnsafe(
    `
      select
        c.relname as table_name,
        c.relrowsecurity as rls_enabled
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and c.relname = any($1)
        and c.relrowsecurity is not true
      order by c.relname
    `,
    tables,
  );

  if (tablesWithoutRls.length > 0) {
    console.error('RLS disabled on public tables:', tablesWithoutRls);
    process.exitCode = 1;
    return;
  }

  const exposedGrants = await prisma.$queryRawUnsafe(
    `
      select
        grantee,
        table_name,
        privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name = any($1)
        and grantee in ('anon', 'authenticated')
      order by grantee, table_name, privilege_type
    `,
    tables,
  );

  if (exposedGrants.length > 0) {
    console.error('Direct Data API grants still exposed:', exposedGrants);
    process.exitCode = 1;
    return;
  }

  console.log('RLS enabled and anon/authenticated grants revoked on all expected public tables.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
