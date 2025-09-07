module.exports = {
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended'
    ],
    root: true,
    rules: {
        'no-trailing-spaces': 'error',
        'eol-last': ['error', 'always'],
        'indent': ['error', 4, { 'SwitchCase': 1 }],
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
        'max-len': ['error', { 
            'code': 120, 
            'ignoreComments': true, 
            'ignoreTrailingComments': true 
        }]
    },
    env: {
        es2020: true,
        node: true
    },
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module'
    }
};