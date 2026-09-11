module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: ['plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['node_modules/', 'dist/', '.next/'],
  rules: {
    // Existing MVP code intentionally contains a small number of explicit
    // any/empty-object compatibility types. Keep lint focused on actionable
    // correctness issues while those APIs are incrementally tightened.
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-empty-object-type': 'off',
  },
};
