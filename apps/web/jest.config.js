/**
 * jest.config.js for @ecomerce/web (Next.js frontend)
 *
 * Uses jest-environment-jsdom for React hook testing.
 * Mocks next/navigation and next/image.
 */
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/app/**/*.{ts,tsx}',
    '!src/components/**/*.{ts,tsx}',
    '!src/contexts/**/*.{ts,tsx}',
    '!src/hooks/**/*.{ts,tsx}',
    '!src/lib/**/*.{ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 20,
      lines: 20,
      statements: 20,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@ecomerce/ui$': '<rootDir>/../../packages/ui/src',
    '^@ecomerce/config$': '<rootDir>/../../packages/config/src',
    '^@ecomerce/utils$': '<rootDir>/../../packages/utils/src',
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/', '<rootDir>/e2e/'],
};

module.exports = createJestConfig(customJestConfig);
