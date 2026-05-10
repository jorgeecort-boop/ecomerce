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

const API_KEY = env.SHIPPO_API_KEY;
const BASE_URL = 'https://api.goshippo.com';

console.log('=== Verificación Shippo ===\n');

if (!API_KEY) {
  console.error('❌ SHIPPO_API_KEY no configurado');
  process.exit(1);
}

console.log(`✓ API_KEY: ${API_KEY.slice(0, 16)}...${API_KEY.slice(-8)}`);
console.log(`✓ Modo: ${API_KEY.includes('live') ? 'LIVE (producción)' : 'TEST (sandbox)'}`);

const headers = {
  Authorization: `ShippoToken ${API_KEY}`,
  'Content-Type': 'application/json',
  'Shippo-API-Version': '2018-02-08',
};

// Test 1: List carrier accounts
console.log('\n[Test 1] Listando cuentas de carrier...');
try {
  const res = await fetch(`${BASE_URL}/carrier_accounts/`, { headers });
  const data = await res.json();

  if (res.ok && Array.isArray(data.results)) {
    console.log(`✅ ${data.results.length} carrier accounts disponibles`);
    if (data.results.length > 0) {
      data.results.slice(0, 5).forEach((c) => {
        console.log(`   ${c.carrier}: ${c.description} (${c.active ? 'activo' : 'inactivo'})`);
      });
    } else {
      console.log('   (ninguna - esperado en modo test sin carriers configurados)');
    }
  } else {
    console.error(`❌ Fallo: ${JSON.stringify(data)}`);
  }
} catch (err) {
  console.error(`❌ Error: ${err.message}`);
}

// Test 2: Validate an address
console.log('\n[Test 2] Validando dirección de prueba...');
try {
  const address = {
    name: 'Test User',
    street1: '215 Clayton St',
    city: 'San Francisco',
    state: 'CA',
    zip: '94117',
    country: 'US',
    phone: '+1 555 341 9393',
    validate: true,
  };

  const res = await fetch(`${BASE_URL}/addresses/`, {
    method: 'POST',
    headers,
    body: JSON.stringify(address),
  });
  const data = await res.json();

  if (res.ok) {
    console.log('✅ Dirección validada');
    console.log(`   Completa: ${data.is_complete ? 'Sí' : 'No'}`);
    if (data.validation_results) {
      console.log(`   Válida: ${data.validation_results.is_valid ? 'Sí' : 'No'}`);
      if (data.validation_results.messages?.length) {
        data.validation_results.messages.forEach((m) => {
          console.log(`   ${m.type}: ${m.text}`);
        });
      }
    }
  } else {
    console.error(`❌ Fallo validación: ${JSON.stringify(data)}`);
  }
} catch (err) {
  console.error(`❌ Error: ${err.message}`);
}

// Test 3: Get shipping rates (test shipment)
console.log('\n[Test 3] Cotizando envío de prueba...');
try {
  const shipment = {
    address_from: {
      name: 'Ecomerce Warehouse',
      street1: '417 Montgomery St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94104',
      country: 'US',
      phone: '+1 555 341 9393',
    },
    address_to: {
      name: 'Cliente Test',
      street1: '215 Clayton St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94117',
      country: 'US',
      phone: '+1 555 341 9393',
    },
    parcels: [
      {
        length: '10',
        width: '8',
        height: '4',
        distance_unit: 'in',
        weight: '2',
        mass_unit: 'lb',
      },
    ],
    async: false,
  };

  const res = await fetch(`${BASE_URL}/shipments/`, {
    method: 'POST',
    headers,
    body: JSON.stringify(shipment),
  });
  const data = await res.json();

  if (res.ok && Array.isArray(data.rates)) {
    console.log(`✅ ${data.rates.length} tarifas obtenidas:`);
    data.rates.slice(0, 5).forEach((r) => {
      console.log(`   ${r.carrier} ${r.servicelevel?.name || 'N/A'}: $${r.amount} ${r.currency}`);
    });
  } else {
    console.error(`❌ Fallo cotización: ${JSON.stringify(data)}`);
  }
} catch (err) {
  console.error(`❌ Error: ${err.message}`);
}

// Test 4: Track a test package
console.log('\n[Test 4] Verificando tracking (USPS test)...');
try {
  const res = await fetch(`${BASE_URL}/tracks/usps/92055901755477000000000001`, {
    headers,
  });
  const data = await res.json();

  if (res.ok && data.tracking_status) {
    console.log(`✅ Tracking obtenido: ${data.tracking_status.status}`);
    console.log(`   Detalle: ${data.tracking_status.status_details || 'N/A'}`);
    if (data.tracking_number) {
      console.log(`   Número: ${data.tracking_number}`);
    }
  } else if (res.status === 404) {
    console.log('   ⚠️ Tracking no encontrado (esperado con número de prueba)');
    console.log('   ✅ API respondió correctamente');
  } else {
    console.warn(`   ⚠️ ${JSON.stringify(data)}`);
  }
} catch (err) {
  console.error(`❌ Error: ${err.message}`);
}

console.log('\n=== ✅ Shippo: Verificación completada ===');
