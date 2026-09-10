module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
    browser: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    // Existing M0-M3 code uses these patterns; keep lint useful without
    // making the M1 correction branch rewrite unrelated legacy code.
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-empty-object-type': 'off',
  },
  ignorePatterns: [
    'node_modules/',
    '.next/',
    'dist/',
    'coverage/',
    'prisma/generated/',
  ],
};
