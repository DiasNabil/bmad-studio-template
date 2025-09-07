// Installation instructions:
// npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin 
// eslint-plugin-import eslint-config-prettier prettier eslint-plugin-jest

module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true,
        'jest/globals': true
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:jest/recommended',
        'prettier'
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    plugins: ['@typescript-eslint', 'jest', 'import'],
    root: true,
    rules: {
        // Enforce best practices
        'no-console': ['warn', { allow: ['warn', 'error'] }],
        'complexity': ['warn', { max: 10 }],
        'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true }],
        
        // TypeScript specific rules
        '@typescript-eslint/explicit-function-return-type': 'error',
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
        
        // Import organization
        'import/order': ['error', {
            'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
            'newlines-between': 'always'
        }]
    },
    overrides: [
        {
            files: ['**/*.test.ts', '**/*.spec.ts'],
            rules: {
                'max-lines-per-function': 'off'
            }
        }
    ]
};