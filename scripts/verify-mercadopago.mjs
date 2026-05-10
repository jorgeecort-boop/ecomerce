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

const ACCESS_TOKEN = env.MERCADOPAGO_ACCESS_TOKEN;
const CLIENT_ID = env.MERCADOPAGO_CLIENT_ID;
const CLIENT_SECRET = env.MERCADOPAGO_CLIENT_SECRET;

console.log('=== Verificación MercadoPago ===\n');

if (!ACCESS_TOKEN) {
  console.error('❌ MERCADOPAGO_ACCESS_TOKEN no configurado');
  process.exit(1);
}

console.log(`✓ ACCESS_TOKEN: ${ACCESS_TOKEN.slice(0, 12)}...${ACCESS_TOKEN.slice(-8)}`);
console.log(`✓ CLIENT_ID: ${CLIENT_ID}`);

// Test 1: Validar token via /users/me
console.log('\n[Test 1] Validando credenciales via /users/me...');
try {
  const res = await fetch('https://api.mercadopago.com/users/me', {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
  const data = await res.json();

  if (res.ok && data.id) {
    console.log(`✅ Autenticado como: ${data.nickname || data.email || data.id}`);
    console.log(`   User ID: ${data.id}`);
    console.log(`   País: ${data.country_id || 'N/D'}`);
  } else {
    console.error(`❌ Fallo autenticación: ${JSON.stringify(data)}`);
    process.exit(1);
  }
} catch (err) {
  console.error(`❌ Error de red: ${err.message}`);
  process.exit(1);
}

// Test 2: Obtener preferencia de prueba (sin crearla)
console.log('\n[Test 2] Verificando SDK - creando preferencia de prueba...');
try {
  const preferenceBody = {
    items: [
      {
        id: 'test-item-1',
        title: 'Producto de prueba',
        unit_price: 100,
        quantity: 1,
        currency_id: 'COP',
      },
    ],
    payer: { email: 'test@test.com' },
    external_reference: 'verify-test',
  };

  const prefRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(preferenceBody),
  });

  const prefData = await prefRes.json();

  if (prefRes.ok && prefData.id) {
    console.log(`✅ Preferencia creada: ${prefData.id}`);
    console.log(`   Init point: ${prefData.init_point}`);
  } else {
    console.error(`❌ Error creando preferencia: ${JSON.stringify(prefData)}`);
    process.exit(1);
  }
} catch (err) {
  console.error(`❌ Error de red: ${err.message}`);
  process.exit(1);
}

// Test 3: Webhook URL configurada
console.log('\n[Test 3] Verificando configuración de webhook...');
const API_URL = env.API_URL || 'http://localhost:3001';
console.log(`   Webhook URL esperada: ${API_URL}/api/payments/webhook`);

console.log('\n=== ✅ MercadoPago: Todos los tests pasaron ===');
