#!/usr/bin/env node
/**
 * DB Sync Script — Verifica y sincroniza el schema de Prisma con la DB
 *
 * Uso:
 *   npx ts-node scripts/db-sync.ts          # dry-run (solo verificar)
 *   npx ts-node scripts/db-sync.ts --push   # aplicar cambios a la DB
 *   npx ts-node scripts/db-sync.ts --seed   # seed data de ejemplo
 */

const { execSync } = require('child_process');
const path = require('path');

const PRISMA_DIR = path.join(__dirname, '..', 'packages', 'db');
const args = process.argv.slice(2);
const shouldPush = args.includes('--push');
const shouldSeed = args.includes('--seed');

function run(cmd: string, label: string) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`🔧 ${label}`);
  console.log(`   $ ${cmd}`);
  console.log('─'.repeat(60));
  try {
    execSync(cmd, { cwd: PRISMA_DIR, stdio: 'inherit' });
    console.log(`✅ ${label} — SUCCESS\n`);
    return true;
  } catch (err) {
    console.error(`❌ ${label} — FAILED\n`);
    return false;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  📦 Ecomerce DB Sync Tool');
  console.log('═══════════════════════════════════════════════════════════');

  // 1. Validate schema
  run('npx prisma validate', 'Validating Prisma Schema');

  // 2. Generate client
  run('npx prisma generate', 'Generating Prisma Client');

  // 3. Check DB status
  console.log('\n📋 Checking DB migration status...');
  run('npx prisma migrate status', 'Migration Status');

  if (shouldPush) {
    // 4. Push schema to DB (creates/alters tables)
    run('npx prisma db push --accept-data-loss', 'Pushing Schema to Database');
  } else {
    console.log('\n💡 Run with --push to apply changes to the database');
    console.log('   npx ts-node scripts/db-sync.ts --push');
  }

  if (shouldSeed) {
    // 5. Seed example data
    console.log('\n🌱 Seeding example data...');
    run('npx prisma db seed', 'Seeding Database');
  }

  // 6. Show table summary
  console.log('\n📊 Schema Summary:');
  const tables = [
    'users', 'sessions', 'stores', 'products', 'orders', 'order_items',
    'suppliers', 'supplier_products', 'trending_products', 'notifications',
    'audit_logs', 'carts', 'cart_items', 'shopify_order_syncs',
    'shopify_product_mappings', 'supplier_orders',
  ];
  console.log(`   Total tables: ${tables.length}`);
  tables.forEach((t) => console.log(`   • ${t}`));

  console.log('\n✨ Done! DB sync check complete.\n');
}

main().catch(console.error);
