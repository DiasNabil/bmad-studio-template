module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint', 
    'functional', 
    'security', 
    'promise'
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:@typescript-eslint/strict-type-checked',
    'plugin:functional/recommended',
    'plugin:security/recommended',
    'plugin:promise/recommended'
  ],
  parserOptions: {
    project: '../tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module'
  },
  rules: {
    // Type safety and strictness
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    '@typescript-eslint/strict-boolean-expressions': 'error',
    '@typescript-eslint/switch-exhaustiveness-check': 'error',

    // Functional programming guidelines
    'functional/no-class': 'off', // Allow classes for workflow
    'functional/no-method-signature': 'off',
    'functional/prefer-readonly-type': 'error',
    'functional/immutable-data': ['error', {
      ignorePattern: ['^draft', '^mutable']
    }],

    // Security rules
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-regexp': 'error',

    // Promise handling
    'promise/always-return': 'error',
    'promise/no-return-wrap': 'error',
    'promise/param-names': 'error',
    'promise/catch-or-return': 'error',

    // Error handling
    '@typescript-eslint/no-throw-literal': 'error',
    '@typescript-eslint/restrict-template-expressions': [
      'error', 
      { 
        allowNumber: true, 
        allowBoolean: false 
      }
    ],

    // Complexity management
    'complexity': ['warn', { max: 10 }],
    'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true }],
    'max-depth': ['warn', 4],

    // Naming conventions
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE', 'PascalCase']
      },
      {
        selector: 'function',
        format: ['camelCase']
      },
      {
        selector: 'class',
        format: ['PascalCase']
      },
      {
        selector: 'interface',
        format: ['PascalCase']
      },
      {
        selector: 'typeAlias',
        format: ['PascalCase']
      },
      {
        selector: 'enumMember',
        format: ['UPPER_CASE']
      }
    ],

    // Additional best practices
    'no-console': ['warn', { allow: ['error', 'warn'] }],
    '@typescript-eslint/no-unnecessary-condition': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface']
  },
  overrides: [
    {
      // Test files specific rules
      files: ['**/tests/**', '**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'security/detect-object-injection': 'off'
      }
    }
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '.eslintrc.js'
  ]
};