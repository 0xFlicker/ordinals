const { pathsToModuleNameMapper } = require("ts-jest");
const { compilerOptions } = require("./tsconfig.json");

// Add any custom config to be passed to Jest
/** @type { import('@jest/types').Config.InitialOptions } */
module.exports = {
  // preset: "jest-dynalite",
  testEnvironment: "node",
  // also treat .mjs as ESM so your jest.setup.mjs import gets picked up
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: "<rootDir>/" }),
  },
  setupFilesAfterEnv: [
    // "jest-dynalite/setupTables",
    "<rootDir>/jest.setup-after-env.ts",
  ],
  setupFiles: ["<rootDir>/jest.setup.mjs"],
  roots: ["<rootDir>/src/"],
  transform: {
    "^.+\\.(ts|mjs)$": ["ts-jest", { useESM: true }],
  },
  // stop ignoring jose so it gets compiled
  transformIgnorePatterns: [
    // "node_modules/(?!(?:@noble/secp256k1|jose|@wagmi/core)/)",
  ],
};
