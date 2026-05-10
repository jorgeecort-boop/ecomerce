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

const BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = env.TELEGRAM_CHAT_ID;
const ALLOWED_CHAT_IDS = env.TELEGRAM_ALLOWED_CHAT_IDS;

console.log('=== Verificación Telegram ===\n');

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN no configurado');
  process.exit(1);
}
if (!CHAT_ID) {
  console.error('❌ TELEGRAM_CHAT_ID no configurado');
  process.exit(1);
}

console.log(`✓ BOT_TOKEN: ${BOT_TOKEN.split(':')[0]}:...${BOT_TOKEN.slice(-8)}`);
console.log(`✓ CHAT_ID: ${CHAT_ID}`);
console.log(`✓ ALLOWED_CHAT_IDS: ${ALLOWED_CHAT_IDS}`);

// Test 1: Validar bot via /getMe
console.log('\n[Test 1] Validando bot via /getMe...');
try {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
  const data = await res.json();

  if (data.ok && data.result) {
    console.log(`✅ Bot verificado: @${data.result.username}`);
    console.log(`   Nombre: ${data.result.first_name}`);
    console.log(`   ID: ${data.result.id}`);
  } else {
    console.error(`❌ Fallo verificación: ${JSON.stringify(data)}`);
    process.exit(1);
  }
} catch (err) {
  console.error(`❌ Error de red: ${err.message}`);
  process.exit(1);
}

// Test 2: Verificar chat ID via /getChat
console.log('\n[Test 2] Verificando chat ID...');
try {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChat?chat_id=${CHAT_ID}`);
  const data = await res.json();

  if (data.ok && data.result) {
    console.log(`✅ Chat verificado: ${data.result.title || data.result.first_name || data.result.id}`);
    console.log(`   Tipo: ${data.result.type}`);
  } else {
    console.error(`❌ Fallo chat: ${JSON.stringify(data)}`);
    console.log('   ⚠️ Asegúrate de haber iniciado el bot con /start primero');
  }
} catch (err) {
  console.error(`❌ Error de red: ${err.message}`);
}

// Test 3: Enviar mensaje de prueba al chat
console.log('\n[Test 3] Enviando mensaje de prueba...');
try {
  const now = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
  const message = `<b>✅ Verificación de Sistema</b>\n\nHora: ${now}\nSistema: Ecomerce\nEstado: Conexión exitosa`;

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });

  const data = await res.json();

  if (data.ok) {
    console.log('✅ Mensaje de prueba enviado exitosamente');
  } else {
    console.error(`❌ Fallo envío: ${JSON.stringify(data)}`);
    process.exit(1);
  }
} catch (err) {
  console.error(`❌ Error de red: ${err.message}`);
  process.exit(1);
}

console.log('\n=== ✅ Telegram: Todos los tests pasaron ===');
