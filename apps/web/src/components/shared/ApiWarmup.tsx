'use client';

import { useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ecomerce-api-zulc.onrender.com';

export function ApiWarmup() {
  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    fetch(`${API_URL}/health`, { signal: controller.signal, cache: 'no-store' })
      .catch(() => {});

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  return null;
}
