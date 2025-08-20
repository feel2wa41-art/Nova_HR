/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['./packages/config/eslint.config.js'],
  ignorePatterns: [
    'dist/',
    'build/',
    'node_modules/',
    '.next/',
    'coverage/',
    '**/*.config.js',
    '**/*.config.ts',
    'apps/api/prisma/generated/',
  ],
};