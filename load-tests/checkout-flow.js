import http from 'k6/http';
import { check, sleep } from 'k6';

const API_URL = __ENV.API_URL || 'https://ecomerce-api-zulc.onrender.com/api';

export const options = {
  stages: [
    { duration: '20s', target: 5 },
    { duration: '40s', target: 5 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<10000'],
    http_req_failed: ['rate<0.2'],
  },
};

export default function () {
  const payload = JSON.stringify({
    storeSlug: 'tienda-demo',
    shippingAddress: {
      firstName: 'Test',
      lastName: 'User',
      address: 'Calle 123 #45-67',
      city: 'Bogota',
      state: 'Cundinamarca',
      postalCode: '110111',
      country: 'Colombia',
      phone: '+573001234567',
    },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Origin': __ENV.WEB_URL || 'https://ecomerce-web.vercel.app',
    },
  };

  const validateShipping = http.post(
    `${API_URL}/orders/validate-shipping`,
    payload,
    { ...params, tags: { name: 'validate-shipping' } }
  );
  check(validateShipping, {
    'validate-shipping 201': (r) => r.status === 201,
    'validate-shipping fast (< 3s)': (r) => r.timings.duration < 3000,
  });

  sleep(2);

  const health = http.get(`${API_URL}/health`, {
    tags: { name: 'health' },
  });
  check(health, {
    'health is 200': (r) => r.status === 200,
  });

  sleep(3);
}
