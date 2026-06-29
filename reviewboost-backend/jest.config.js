/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFiles: ['<rootDir>/tests/envSetup.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/app.ts',
    '!src/utils/shutdown.ts',     // only exercised by OS process signals
    '!src/services/aiService.ts', // mocked in tests — calls external Claude API
    '!src/services/qrService.ts', // mocked in tests — calls external library
    '!src/config/db.ts',          // retry logic requires real network failures
  ],
  coverageThreshold: {
    global: {
      branches: 45,
      functions: 60,
      lines: 75,
      statements: 75,
    },
  },
  testTimeout: 30000,
};
