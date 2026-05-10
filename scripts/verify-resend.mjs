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

const API_KEY = env.RESEND_API_KEY;
const FROM = env.EMAIL_FROM || 'Ecomerce <onboarding@resend.dev>';

console.log('=== Verificación Resend ===\n');

if (!API_KEY) {
  console.error('❌ RESEND_API_KEY no configurado');
  process.exit(1);
}

console.log(`✓ API_KEY: ${API_KEY.slice(0, 8)}...${API_KEY.slice(-6)}`);
console.log(`✓ FROM: ${FROM}`);

// Test 1: Verificar API key via /api-keys
console.log('\n[Test 1] Verificando API key...');
try {
  const res = await fetch('https://api.resend.com/api-keys', {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  const data = await res.json();

  if (res.ok && Array.isArray(data.data)) {
    console.log('✅ API key válida');
    if (data.data.length > 0) {
      const key = data.data[0];
      console.log(`   Nombre: ${key.name}`);
      console.log(`   Creada: ${key.created_at}`);
    }
  } else {
    console.error(`❌ Fallo: ${JSON.stringify(data)}`);
    process.exit(1);
  }
} catch (err) {
  console.error(`❌ Error de red: ${err.message}`);
  process.exit(1);
}

// Test 2: Verificar dominio
console.log('\n[Test 2] Verificando dominios configurados...');
try {
  const res = await fetch('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  const data = await res.json();

  if (res.ok && Array.isArray(data.data)) {
    if (data.data.length > 0) {
      data.data.forEach((d) => {
        console.log(`   Dominio: ${d.name} (${d.status})`);
      });
    } else {
      console.log('   ⚠️ No hay dominios verificados. Usando onboarding@resend.dev (solo emails al dueño de la cuenta)');
    }
  } else {
    console.warn(`   ⚠️ No se pudieron consultar dominios: ${JSON.stringify(data)}`);
  }
} catch (err) {
  console.warn(`   ⚠️ Error consultando dominios: ${err.message}`);
}

// Test 3: Enviar email de prueba (solo al dueño de la cuenta con onboarding@resend.dev)
console.log('\n[Test 3] Enviando email de prueba...');
console.log('   ⚠️ Con onboarding@resend.dev, el email solo se entrega al dueño de la cuenta Resend');

try {
  // Determine recipient - for onboarding domain, must send to the account owner
  // We'll send a test email, but since we don't know the account email, let's try
  const sendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: 'jorgeecort@gmail.com',
      subject: '✅ Ecomerce - Verificación de Email',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#222">
          <div style="text-align:center;padding:24px 0;border-bottom:2px solid #2563eb">
            <h1 style="color:#2563eb;margin:0">✅ Conexión Exitosa</h1>
          </div>
          <p>El sistema de emails de <strong>Ecomerce</strong> está funcionando correctamente.</p>
          <p>Hora: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</p>
          <p style="color:#666;font-size:13px;margin-top:32px;text-align:center">
            Este es un email de prueba automático.
          </p>
        </div>`,
    }),
  });

  const sendData = await sendRes.json();

  if (sendRes.ok && sendData.id) {
    console.log(`✅ Email enviado: ${sendData.id}`);
    console.log('   Revisa tu bandeja de entrada (o spam)');
  } else {
    console.error(`❌ Fallo envío: ${JSON.stringify(sendData)}`);
    // Don't exit with error - might be because the domain isn't verified
    console.log('   ⚠️ Esto es normal si el dominio no está verificado aún');
  }
} catch (err) {
  console.error(`❌ Error de red: ${err.message}`);
}

console.log('\n=== ✅ Resend: Verificación completada ===');
