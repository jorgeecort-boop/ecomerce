import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf-8');

const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIndex = trimmed.indexOf('=');
  if (eqIndex === -1) continue;
  const key = trimmed.slice(0, eqIndex).trim();
  let value = trimmed.slice(eqIndex + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  env[key] = value;
}

const EMAIL = env.CJ_API_EMAIL;
const PASSWORD = env.CJ_API_KEY;
const BASE_URL = 'https://developers.cjdropshipping.com/api2.0/v1';

console.log('=== Verificación CJ Dropshipping ===\n');

if (!EMAIL || !PASSWORD) {
  console.error('❌ CJ_API_EMAIL o CJ_API_KEY no configurados');
  process.exit(1);
}

console.log(`✓ EMAIL: ${EMAIL}`);
console.log(`✓ API_KEY: ${PASSWORD.slice(0, 8)}...${PASSWORD.slice(-4)}`);

// Test 1: Obtener access token
console.log('\n[Test 1] Obteniendo access token...');
let accessToken = '';
try {
  const res = await fetch(`${BASE_URL}/authentication/getAccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();

  if (data.code === 200 && data.data?.accessToken) {
    accessToken = data.data.accessToken;
    console.log('✅ Access token obtenido');
    console.log(`   Expira en: ~6 horas`);
    if (data.data.refreshToken) {
      console.log('   Refresh token: disponible');
    }
  } else {
    console.error(`❌ Fallo autenticación: ${JSON.stringify(data)}`);
    process.exit(1);
  }
} catch (err) {
  console.error(`❌ Error de red: ${err.message}`);
  process.exit(1);
}

// Test 2: Buscar productos
console.log('\n[Test 2] Buscando productos "bluetooth"...');
try {
  const res = await fetch(
    `${BASE_URL}/product/list?productName=bluetooth&pageNum=1&pageSize=3`,
    {
      headers: { 'CJ-Access-Token': accessToken },
    },
  );
  const data = await res.json();

  if (data.code === 200) {
    const count = data.data?.list?.length ?? data.data?.length ?? 0;
    console.log(`✅ Búsqueda exitosa: ${count} productos encontrados`);
    if (data.data?.total) {
      console.log(`   Total en catálogo: ${data.data.total}`);
    }
  } else {
    console.error(`❌ Fallo búsqueda: ${JSON.stringify(data)}`);
  }
} catch (err) {
  console.error(`❌ Error: ${err.message}`);
}

// Test 3: Obtener categorías
console.log('\n[Test 3] Obteniendo categorías...');
try {
  const res = await fetch(`${BASE_URL}/product/getCategory`, {
    headers: { 'CJ-Access-Token': accessToken },
  });
  const data = await res.json();

  if (data.code === 200) {
    const categories = data.data ?? [];
    console.log(`✅ ${categories.length} categorías disponibles`);
    if (categories.length > 0) {
      const first = categories.slice(0, 3);
      first.forEach((c) => {
        console.log(`   ${c.categoryId}: ${c.categoryName}`);
      });
    }
  } else {
    console.error(`❌ Fallo: ${JSON.stringify(data)}`);
  }
} catch (err) {
  console.error(`❌ Error: ${err.message}`);
}

console.log('\n=== ✅ CJ Dropshipping: Verificación completada ===');
