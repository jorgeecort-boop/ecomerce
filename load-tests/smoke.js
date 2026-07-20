import http from 'k6/http';
import { check, sleep } from 'k6';

const API_URL = __ENV.API_URL || 'https://ecomerce-api-zulc.onrender.com/api';
const WEB_URL = __ENV.WEB_URL || 'https://ecomerce-web.vercel.app';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '30s', target: 20 },
    { duration: '30s', target: 10 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.1'],
  },
};

export default function () {
  const health = http.get(`${API_URL}/health`, { tags: { name: 'health' } });
  check(health, {
    'health is 200': (r) => r.status === 200,
    'health response time < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(1);

  const store = http.get(`${WEB_URL}/store/tienda-demo`, {
    tags: { name: 'store-page' },
  });
  check(store, {
    'store is 200': (r) => r.status === 200,
    'store response time < 5s': (r) => r.timings.duration < 5000,
  });

  sleep(2);
}
