/** Integration test config — picks up tests from the /test directory */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '..',
  testRegex: 'test/.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@ecomerce/db$': '<rootDir>/../../packages/db/src',
    '^@ecomerce/config$': '<rootDir>/../../packages/config/src',
    '^@ecomerce/utils$': '<rootDir>/../../packages/utils/src',
  },
};
