module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        module: 'ESNext',
        target: 'ES2021',
        esModuleInterop: true,
        isolatedModules: true
      },
      diagnostics: false,
      useESM: true
    }]
  },
  testEnvironment: 'node',
};
