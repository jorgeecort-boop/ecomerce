module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@ecomerce/db$': '<rootDir>/../../../packages/db/src',
    '^@ecomerce/config$': '<rootDir>/../../../packages/config/src',
    '^@ecomerce/utils$': '<rootDir>/../../../packages/utils/src',
  },
};
