
/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/node_modules/'],
  transform: {
    '^.+\\.tsx?$': 'babel-jest',
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};
