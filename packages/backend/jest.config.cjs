const { pathsToModuleNameMapper } = require('ts-jest')
const { compilerOptions } = require('./tsconfig.json')

// Add any custom config to be passed to Jest
/** @type { import('@jest/types').Config.InitialOptions } */
module.exports = {
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' })
  },
  roots: ["<rootDir>/src/"],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  }
}
