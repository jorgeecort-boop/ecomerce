module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/app.module.ts',
    '!**/*.dto.ts',
  ],
  coverageDirectory: '../coverage',
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 35,
      lines: 40,
      statements: 40,
    },
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@ecomerce/db$': '<rootDir>/../../../packages/db/src',
    '^@ecomerce/config$': '<rootDir>/../../../packages/config/src',
    '^@ecomerce/utils$': '<rootDir>/../../../packages/utils/src',
  },
};
