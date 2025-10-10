module.exports = {
    testEnvironment: 'jsdom',
    collectCoverageFrom: [
        '**/*.js',
        '!node_modules/**',
        '!coverage/**',
        '!jest.config.js',
        '!babel.config.js',
        '!.eslintrc.js',
        '!**/*.test.js'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'html', 'lcov'],
    testMatch: [
        '**/__tests__/**/*.js',
        '**/*.test.js',
        '**/*.spec.js'
    ],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': '<rootDir>/test/__mocks__/styleMock.js'
    },
    transform: {
        '^.+\\.js$': 'babel-jest'
    }
};
