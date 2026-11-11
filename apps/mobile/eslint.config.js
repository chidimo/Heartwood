const tseslint = require('typescript-eslint');

// Deliberately small: the type checker and Prettier cover most things. This catches what they
// don't, chiefly a promise that is neither awaited nor handled.
module.exports = tseslint.config(
  { ignores: ['node_modules/**', 'android/**', 'ios/**', '.expo/**', 'coverage/**', '*.js'] },
  {
    files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { projectService: true, tsconfigRootDir: __dirname },
    },
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/await-thenable': 'error',
      'no-nested-ternary': 'error',
    },
  }
);
