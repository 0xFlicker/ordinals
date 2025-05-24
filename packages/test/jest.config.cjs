const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

// Add any custom config to be passed to Jest
/** @type { import('@jest/types').Config.InitialOptions } */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),
  },
  setupFilesAfterEnv: [
    // "jest-dynalite/setupTables",
    '<rootDir>/jest.setup-after-env.ts',
  ],
  roots: ['<rootDir>/src/'],
  transform: {
    '^.+\\.(ts|mjs)$': ['ts-jest', { useESM: true }],
  },

  transformIgnorePatterns: ['node_modules/(?!@noble/secp256k1)'],
  collectCoverage: process.env.COVERAGE === 'true',
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: ['../inscriptions/src/**/*.{ts,tsx}'],
};
