import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

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

const CLOUD_NAME = env.CLOUDINARY_CLOUD_NAME;
const API_KEY = env.CLOUDINARY_API_KEY;
const API_SECRET = env.CLOUDINARY_API_SECRET;

console.log('=== Verificación Cloudinary ===\n');

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error('❌ Cloudinary no configurado. Faltan CLOUDINARY_CLOUD_NAME, API_KEY o API_SECRET');
  process.exit(1);
}

console.log(`✓ CLOUD_NAME: ${CLOUD_NAME}`);
console.log(`✓ API_KEY: ${API_KEY.slice(0, 6)}...${API_KEY.slice(-4)}`);

// Test 1: Ping al endpoint de ping de Cloudinary
console.log('\n[Test 1] Verificando conectividad...');
try {
  const pingRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/ping`, {
    headers: { Authorization: `Basic ${Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64')}` },
  });
  const pingData = await pingRes.json();

  if (pingData.status === 'ok') {
    console.log('✅ Conexión exitosa con Cloudinary');
  } else {
    console.error(`❌ Fallo: ${JSON.stringify(pingData)}`);
    process.exit(1);
  }
} catch (err) {
  console.error(`❌ Error de red: ${err.message}`);
  process.exit(1);
}

// Test 2: Subir imagen de prueba (1x1 pixel)
console.log('\n[Test 2] Subiendo imagen de prueba...');
const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

try {
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `folder=ecomerce_test&public_id=verify_test_${Date.now()}&timestamp=${timestamp}`;
  const signature = crypto.createHash('sha1').update(paramsToSign + API_SECRET).digest('hex');

  const formBody = new URLSearchParams({
    file: testImage,
    api_key: API_KEY,
    timestamp: String(timestamp),
    folder: 'ecomerce_test',
    public_id: `verify_test_${Date.now()}`,
    signature,
  });

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formBody,
  });

  const uploadData = await uploadRes.json();

  if (uploadRes.ok && uploadData.secure_url) {
    console.log(`✅ Imagen subida: ${uploadData.secure_url}`);
    console.log(`   Public ID: ${uploadData.public_id}`);

    // Test 3: Eliminar imagen de prueba
    console.log('\n[Test 3] Eliminando imagen de prueba...');
    const delTimestamp = Math.floor(Date.now() / 1000);
    const delParamsToSign = `public_id=${uploadData.public_id}&timestamp=${delTimestamp}`;
    const delSignature = crypto.createHash('sha1').update(delParamsToSign + API_SECRET).digest('hex');

    const delBody = new URLSearchParams({
      public_id: uploadData.public_id,
      api_key: API_KEY,
      timestamp: String(delTimestamp),
      signature: delSignature,
    });

    const delRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
      method: 'POST',
      body: delBody,
    });

    const delData = await delRes.json();

    if (delData.result === 'ok') {
      console.log('✅ Imagen de prueba eliminada');
    } else {
      console.warn(`⚠️ No se pudo eliminar: ${JSON.stringify(delData)}`);
    }
  } else {
    console.error(`❌ Fallo upload: ${JSON.stringify(uploadData)}`);
    process.exit(1);
  }
} catch (err) {
  console.error(`❌ Error de red: ${err.message}`);
  process.exit(1);
}

console.log('\n=== ✅ Cloudinary: Todos los tests pasaron ===');
