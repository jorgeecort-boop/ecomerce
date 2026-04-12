export const config = {
  apiUrl: process.env.API_URL || 'http://localhost:3001',
  webUrl: process.env.WEB_URL || 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV || 'development',
} as const;

export type Config = typeof config;
