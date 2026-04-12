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
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@ecomerce/ui$': '<rootDir>/../../packages/ui/src',
    '^@ecomerce/config$': '<rootDir>/../../packages/config/src',
    '^@ecomerce/utils$': '<rootDir>/../../packages/utils/src',
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/', '<rootDir>/e2e/'],
};

module.exports = createJestConfig(customJestConfig);
