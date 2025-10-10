module.exports = {
    env: {
        browser: true,
        es2021: true,
        jest: true,
        node: true
    },
    extends: 'standard',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    rules: {
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
        'space-before-function-paren': ['error', {
            anonymous: 'always',
            named: 'never',
            asyncArrow: 'always'
        }],
        semi: ['error', 'always'],
        indent: ['error', 4],
        'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],
        'comma-dangle': ['error', 'never']
    },
    globals: {
        supabase: 'readonly',
        supabaseClient: 'readonly',
        SUPABASE_CONFIG: 'readonly'
    },
    ignorePatterns: [
        'node_modules/',
        'coverage/',
        '*.min.js',
        'dist/',
        'build/'
    ]
};
