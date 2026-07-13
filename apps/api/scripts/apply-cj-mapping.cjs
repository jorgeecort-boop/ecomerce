/**
 * apply-cj-mapping.cjs
 *
 * Aplica un CSV de mapeo manual store product → CJ Dropshipping.
 *
 * Uso:
 *   node apps/api/scripts/apply-cj-mapping.cjs cj-mapping-template.csv
 *
 * Formato CSV:
 *   productId,title,price,cj_pid,cj_vid,cj_variant_sku
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const { PrismaClient } = require('@prisma/client');

const BASE_URL = 'https://developers.cjdropshipping.com/api2.0/v1';

function loadEnv() {
  const envPath = resolve(__dirname, '..', '..', '..', '.env');
  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch (err) {
    console.warn('Could not load .env');
  }
}

let cachedToken = null;
async function getCJToken() {
  if (cachedToken) return cachedToken;
  const email = process.env.CJ_API_EMAIL;
  const password = process.env.CJ_API_KEY;
  if (!email || !password) throw new Error('CJ_API_EMAIL or CJ_API_KEY not set');

  const res = await fetch(`${BASE_URL}/authentication/getAccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.code !== 200 || !data.data?.accessToken) {
    throw new Error(`CJ auth failed: ${data.message || JSON.stringify(data)}`);
  }
  cachedToken = data.data.accessToken;
  return cachedToken;
}

async function getCJProduct(pid) {
  const token = await getCJToken();
  const res = await fetch(`${BASE_URL}/product/query?pid=${encodeURIComponent(pid)}`, {
    headers: { 'CJ-Access-Token': token },
  });
  const data = await res.json();
  if (data.code !== 200 || !data.data) return null;
  return data.data;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function main() {
  loadEnv();

  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Uso: node apps/api/scripts/apply-cj-mapping.cjs <archivo.csv>');
    process.exit(1);
  }

  const DRY_RUN = process.argv.includes('--dry-run');
  if (DRY_RUN) console.log('🔍 DRY RUN — no se guardarán cambios\n');

  const csv = readFileSync(csvPath, 'utf-8');
  const lines = csv.split('\n').filter((l) => l.trim());
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(parseCsvLine);

  const prisma = new PrismaClient();
  const supplier = await prisma.supplier.findFirst({ where: { code: 'cjdropshipping' } });
  if (!supplier) {
    console.error('Supplier cjdropshipping not found');
    await prisma.$disconnect();
    process.exit(1);
  }

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const productId = row[0];
    const title = row[1];
    const cjPid = row[3]?.trim();
    const cjVid = row[4]?.trim();
    const cjVariantSku = row[5]?.trim();

    if (!cjPid || !cjVid) {
      console.log(`⏭ SKIP: ${title} — sin CJ pid/vid`);
      skipped++;
      continue;
    }

    try {
      console.log(`\n--- ${title} ---`);
      console.log(`  productId: ${productId}`);
      console.log(`  CJ pid: ${cjPid}, vid: ${cjVid}, sku: ${cjVariantSku}`);

      // Validate CJ product exists
      const cjProduct = await getCJProduct(cjPid);
      await sleep(1200);
      if (!cjProduct) {
        console.log(`  ⚠ CJ product ${cjPid} no encontrado, pero se usará el mapeo manual`);
      } else {
        const variant = cjProduct.variants?.find((v) => v.vid === cjVid);
        if (variant) {
          console.log(`  ✓ CJ variant validado: ${variant.variantName} (${variant.variantSku})`);
        } else {
          console.log(`  ⚠ CJ variant ${cjVid} no encontrado en producto`);
        }
      }

      // Find existing SupplierProduct by externalId or create new
      let supplierProduct = await prisma.supplierProduct.findFirst({
        where: { supplierId: supplier.id, externalId: cjPid },
      });

      const variantsData = {
        items: [
          {
            id: cjVid,
            sku: cjVariantSku || '',
            name: cjProduct?.variants?.find((v) => v.vid === cjVid)?.variantName || '',
            price: cjProduct?.variants?.find((v) => v.vid === cjVid)?.variantSellPrice || 0,
            image: cjProduct?.variants?.find((v) => v.vid === cjVid)?.variantImage || '',
          },
        ],
      };

      if (!DRY_RUN) {
        if (!supplierProduct) {
          supplierProduct = await prisma.supplierProduct.create({
            data: {
              supplierId: supplier.id,
              externalId: cjPid,
              title: cjProduct?.productNameEn || cjProduct?.productName || title,
              description: cjProduct?.description || '',
              price: parseFloat(String(cjProduct?.sellPrice || '0')),
              costPrice: parseFloat(String(cjProduct?.sellPrice || '0')) * 0.6,
              currency: 'USD',
              images: cjProduct?.productImages || [cjProduct?.productImage].filter(Boolean) || [],
              variants: variantsData,
              isMapped: true,
            },
          });
          console.log(`  ✅ SupplierProduct creado: ${supplierProduct.id}`);
        } else {
          supplierProduct = await prisma.supplierProduct.update({
            where: { id: supplierProduct.id },
            data: {
              variants: variantsData,
              lastSyncedAt: new Date(),
            },
          });
          console.log(`  ✅ SupplierProduct actualizado: ${supplierProduct.id}`);
        }

        // Link Product to SupplierProduct
        await prisma.product.update({
          where: { id: productId },
          data: {
            supplierId: supplier.id,
            supplierProductId: supplierProduct.id,
            sku: cjVariantSku || `CJ-${cjPid}`,
          },
        });
        console.log(`  ✅ Producto actualizado con supplier`);
      } else {
        console.log(`  📋 DRY RUN: se crearía/actualizaría SupplierProduct y vincularía Product`);
      }

      updated++;
    } catch (err) {
      console.error(`  ❌ ERROR: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n=== RESUMEN ===`);
  console.log(`Actualizados: ${updated}`);
  console.log(`Saltados: ${skipped}`);
  console.log(`Fallos: ${failed}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
