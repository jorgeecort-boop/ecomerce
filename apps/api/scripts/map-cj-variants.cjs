/**
 * map-cj-variants.cjs
 *
 * Mapea los SupplierProduct de CJ Dropshipping:
 *   externalId: Shopify product ID → CJ pid
 *   variants[].id: Shopify variant ID → CJ vid
 *
 * Uso:
 *   node apps/api/scripts/map-cj-variants.cjs              # aplicar cambios
 *   node apps/api/scripts/map-cj-variants.cjs --dry-run     # solo mostrar qué haría
 *
 * Requisito: CJ_API_EMAIL y CJ_API_KEY en .env
 */

const { PrismaClient } = require('@prisma/client');
const { readFileSync } = require('fs');
const { resolve } = require('path');

const BASE_URL = 'https://developers.cjdropshipping.com/api2.0/v1';

// ── Load .env ──────────────────────────────────────────────────────────
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
    console.warn('⚠ Could not load .env, using process.env');
  }
}

// ── CJ API helpers ─────────────────────────────────────────────────────
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

async function searchCJProducts(productName) {
  const token = await getCJToken();
  const url = `${BASE_URL}/product/list?productName=${encodeURIComponent(productName)}&pageNum=1&pageSize=10`;
  const res = await fetch(url, { headers: { 'CJ-Access-Token': token } });
  const data = await res.json();
  if (data.code !== 200) throw new Error(`CJ search failed: ${data.message || JSON.stringify(data)}`);
  return data.data || { list: [], total: 0 };
}

async function getCJProduct(pid) {
  const token = await getCJToken();
  const url = `${BASE_URL}/product/query?pid=${encodeURIComponent(pid)}`;
  const res = await fetch(url, { headers: { 'CJ-Access-Token': token } });
  const data = await res.json();
  if (data.code !== 200) return null;
  return data.data;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  loadEnv();

  const DRY_RUN = process.argv.includes('--dry-run');
  if (DRY_RUN) console.log('🔍 DRY RUN — no se guardarán cambios\n');

  const prisma = new PrismaClient();

  // 1. Find CJ supplier
  const supplier = await prisma.supplier.findFirst({ where: { code: 'cjdropshipping' } });
  if (!supplier) {
    console.error('❌ No se encontró el supplier CJ Dropshipping en la DB');
    await prisma.$disconnect();
    process.exit(1);
  }
  console.log(`✓ CJ Supplier: ${supplier.name} (${supplier.id})\n`);

  // 2. Get all SupplierProducts for CJ
  const supplierProducts = await prisma.supplierProduct.findMany({
    where: { supplierId: supplier.id },
  });
  console.log(`📦 ${supplierProducts.length} SupplierProducts encontrados\n`);

  let mapped = 0;
  let skipped = 0;
  let failed = 0;

  for (const sp of supplierProducts) {
    const variants = (sp.variants && typeof sp.variants === 'object' ? sp.variants : { items: [] });
    const items = (variants.items || []);
    const shopifySkus = items.map(i => i.sku).filter(Boolean);
    const title = sp.title;

    console.log(`\n--- ${sp.externalId}: ${title} ---`);
    console.log(`  externalId actual: ${sp.externalId} (Shopify product ID)`);
    console.log(`  Variants: ${items.length} | SKUs: ${shopifySkus.join(', ') || '(sin SKU)'}`);
    console.log(`  IDs actuales: [${items.map(i => i.id).join(', ')}]`);

    try {
      // 3. Build search queries (ordered by specificity)
      const baseSku = shopifySkus.length > 0 ? shopifySkus[0].split('-')[0] : '';
      const searchQueries = [
        { q: baseSku, desc: `base SKU "${baseSku}"` },
        { q: title.split(' ').slice(0, 4).join(' '), desc: `title corto` },
        { q: title.split(' ').slice(0, 8).join(' '), desc: `title medio` },
      ].filter(sq => sq.q && sq.q.length > 3);

      let searchResult = { list: [], total: 0 };
      for (const sq of searchQueries) {
        console.log(`  🔍 Buscando por ${sq.desc}...`);
        searchResult = await searchCJProducts(sq.q.substring(0, 80));
        await sleep(1200);
        if (searchResult.list && searchResult.list.length > 0) {
          console.log(`  ✓ ${searchResult.list.length} resultados`);
          break;
        }
      }

      if (!searchResult.list || searchResult.list.length === 0) {
        console.log(`  ❌ SKIP: sin productos CJ para este producto`);
        skipped++;
        continue;
      }

      // 4. Try to match by variant SKU, then by title overlap
      let matchedProduct = null;
      const matchedVariantMap = {}; // SKU → { vid, variantSku, variantName, variantImage }

      for (const cjProduct of searchResult.list) {
        const cjDetail = await getCJProduct(cjProduct.pid);
        await sleep(1200);
        if (!cjDetail || !cjDetail.variants) continue;

        const cjVariants = cjDetail.variants;

        // Try CJ variant SKU match against our SKU suffix
        for (const shopifySku of shopifySkus) {
          const skuParts = shopifySku.split('-');
          const skuSuffix = skuParts.length > 1 ? skuParts.slice(1).join('-').toLowerCase() : '';
          const match = cjVariants.find(v => {
            if (!v.variantSku) return false;
            const cjSku = v.variantSku.toLowerCase();
            return cjSku === shopifySku.toLowerCase() ||
                   (skuSuffix && cjSku.endsWith(skuSuffix)) ||
                   (skuSuffix && cjSku.includes(skuSuffix));
          });
          if (match) {
            matchedProduct = cjDetail;
            matchedVariantMap[shopifySku] = {
              vid: match.vid,
              variantSku: match.variantSku,
              variantName: match.variantName,
              variantImage: match.variantImage || '',
            };
            console.log(`  ✓ SKU match: ${shopifySku} → vid=${match.vid}`);
          }
        }

        if (matchedProduct) break;

        // Fallback: title word overlap matching
        const cjTitle = (cjProduct.productNameEn || cjProduct.productName || '').toLowerCase();
        const localTitle = title.toLowerCase();
        const localWords = new Set(localTitle.split(/\s+/).filter(w => w.length > 3));
        const cjWords = cjTitle.split(/\s+/).filter(w => w.length > 3);
        const overlap = cjWords.filter(w => localWords.has(w)).length;
        const threshold = Math.min(localWords.size, cjWords.size) * 0.3;

        if (overlap >= threshold && overlap >= 2) {
          matchedProduct = cjDetail;
          console.log(`  ✓ Title match (${overlap} words overlap) → pid=${cjProduct.pid}`);
          for (let i = 0; i < Math.min(items.length, cjVariants.length); i++) {
            const sku = items[i].sku;
            const key = sku || '__default';
            matchedVariantMap[key] = {
              vid: cjVariants[i].vid,
              variantSku: cjVariants[i].variantSku || '',
              variantName: cjVariants[i].variantName || '',
              variantImage: cjVariants[i].variantImage || '',
            };
          }
          break;
        }
      }

      if (!matchedProduct) {
        console.log(`  ❌ SKIP: no se encontró producto CJ coincidente para "${title}"`);
        failed++;
        continue;
      }

      // 5. Build new variants
      const newItems = items.map(item => {
        const match = matchedVariantMap[item.sku] || matchedVariantMap['__default'] || {};
        return {
          id: match.vid || item.id,
          sku: item.sku,
          cjSku: match.variantSku || '',
          name: match.variantName || '',
          price: item.price,
          image: match.variantImage || '',
        };
      });

      const newExternalId = matchedProduct.pid;

      console.log(`  ✓ Match: CJ pid=${newExternalId}`);
      console.log(`  → externalId: ${sp.externalId} → ${newExternalId}`);
      console.log(`  → variants[0].id: ${items[0]?.id || '(none)'} → ${newItems[0]?.id || '(none)'}`);

      if (!DRY_RUN) {
        await prisma.supplierProduct.update({
          where: { id: sp.id },
          data: {
            externalId: newExternalId,
            variants: { items: newItems },
            lastSyncedAt: new Date(),
          },
        });
        console.log(`  ✅ Actualizado`);
      } else {
        console.log(`  📋 DRY RUN: pendiente de actualizar`);
      }

      mapped++;
    } catch (err) {
      console.error(`  ❌ ERROR: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n\n=== RESUMEN ===`);
  console.log(`Total:     ${supplierProducts.length}`);
  console.log(`✅ Mapeados: ${mapped}`);
  console.log(`⏭ Saltados:  ${skipped}`);
  console.log(`❌ Fallos:    ${failed}`);
  if (DRY_RUN) console.log(`\n🔍 DRY RUN — sin cambios. Ejecuta sin --dry-run para aplicar.`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
