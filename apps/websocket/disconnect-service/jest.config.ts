export default {
    displayName: 'disconnect-service',
    preset: '../../../jest.preset.js',
    testEnvironment: 'node',
    transform: {
        '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
    },
    moduleFileExtensions: ['ts', 'js', 'html'],
    coverageDirectory: '../../../coverage/apps/websocket/disconnect-service',

    // Custom coverage thresholds for disconnect-service
    coverageThreshold: {
        global: {
            branches: 45, // Realistic for this service
            functions: 50, // Current is ~33%, target improvement
            lines: 50, // Current is ~51%, achievable
            statements: 50, // Current is ~50.87%, achievable
        },
    },

    // Coverage collection settings specific to this service
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.spec.ts',
        '!src/**/*.test.ts',
        '!src/**/*.stories.{ts,tsx}',
        '!src/**/index.ts',
        '!src/**/*.d.ts',
        '!src/main.ts', // Exclude main.ts as it's just bootstrap code
    ],

    // Coverage reporting
    coverageReporters: ['text', 'lcov', 'html'],
};
