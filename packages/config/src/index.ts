export * from './colors';
export * from './constants';

// Re-export configs for easier consumption
export { default as eslintConfig } from '../eslint.config.js';
export { default as tailwindConfig } from '../tailwind.config.js';
export { default as prettierConfig } from '../prettier.config.js';