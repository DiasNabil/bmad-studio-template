module.exports = {
    root: true,
    env: {
        es2022: true,
        node: true,
        browser: false,
    },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: ['./tsconfig.json'],
    },
    plugins: ['@typescript-eslint', 'import'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:import/recommended',
        'plugin:import/typescript',
    ],
    rules: {
        // Core TypeScript configurations
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-explicit-any': 'off',

        // Optional chaining and type handling
        '@typescript-eslint/prefer-optional-chain': 'warn',
        '@typescript-eslint/strict-boolean-expressions': 'off',

        // Import management
        'import/order': [
            'warn',
            {
                groups: ['builtin', 'external', ['internal', 'parent'], 'sibling', 'index'],
                'newlines-between': 'ignore',
                pathGroups: [
                    {
                        pattern: '@/**',
                        group: 'internal',
                    },
                ],
                distinctGroup: true,
                alphabetize: {
                    order: 'asc',
                    caseInsensitive: true,
                },
            },
        ],
        'import/first': 'warn',
        'import/no-unresolved': 'off',
        'import/namespace': 'off',
        'import/no-duplicates': 'off',
        'import/newline-after-import': 'off',
        'import/no-named-as-default': 'off',
        'import/no-named-as-default-member': 'off',

        // Naming and variable conventions
        '@typescript-eslint/naming-convention': [
            'warn',
            {
                selector: 'variable',
                format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
                leadingUnderscore: 'allow',
            },
            {
                selector: 'function',
                format: ['camelCase', 'PascalCase'],
            },
        ],
        '@typescript-eslint/no-unused-vars': [
            'warn',
            {
                vars: 'all',
                args: 'after-used',
                ignoreRestSiblings: true,
                varsIgnorePattern: '^_',
                argsIgnorePattern: '^_',
            },
        ],

        // Unsafe operations and flexibility
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',

        // Async and function management
        '@typescript-eslint/require-await': 'off',

        // Complexity and code health
        complexity: ['warn', { max: 25 }],
        'max-depth': ['warn', 7],
        'max-lines-per-function': ['warn', { max: 120, skipBlankLines: true }],

        // Type definition and safety
        '@typescript-eslint/ban-ts-comment': [
            'warn',
            {
                'ts-expect-error': 'allow-with-description',
                'ts-ignore': 'allow-with-description',
                'ts-nocheck': 'allow-with-description',
                'ts-check': 'allow-with-description',
                minimumDescriptionLength: 3,
            },
        ],
        '@typescript-eslint/no-unnecessary-type-constraint': 'warn',
        '@typescript-eslint/consistent-type-definitions': ['warn', 'interface'],
        '@typescript-eslint/method-signature-style': ['warn', 'property'],

        // Console and debugging
        'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
        'no-debugger': 'warn',
    },
    settings: {
        'import/parsers': {
            '@typescript-eslint/parser': ['.ts', '.tsx'],
        },
        'import/resolver': {
            node: {
                extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
            },
            typescript: {
                project: './tsconfig.json',
                alwaysTryTypes: true,
            },
        },
        'import/extensions': ['.ts', '.tsx', '.js', '.jsx', '.json'],
    },
    ignorePatterns: [
        'dist',
        'node_modules',
        '.eslintrc.js',
        '**/*.config.js',
        '**/templates/**/*.ts', // Temporarily ignore template files
    ],
};
