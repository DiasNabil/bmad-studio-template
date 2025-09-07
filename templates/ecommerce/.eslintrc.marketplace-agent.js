module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'functional'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:@typescript-eslint/strict-type-checked',
    'plugin:functional/recommended'
  ],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module'
  },
  rules: {
    // Strict type checking
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    
    // Functional programming rules
    'functional/no-class': 'off', // Allow classes for this use case
    'functional/no-method-signature': 'off',
    
    // Additional type safety
    '@typescript-eslint/strict-boolean-expressions': 'error',
    '@typescript-eslint/switch-exhaustiveness-check': 'error',
    
    // Error handling
    '@typescript-eslint/no-throw-literal': 'error',
    
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
      }
    ]
  }
};