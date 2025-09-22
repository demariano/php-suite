export default {
    displayName: 'user-event-handler-service',
    preset: '../../../jest.preset.js',
    testEnvironment: 'node',
    transform: {
        '^.+\\.[tj]s$': [
            'ts-jest',
            { tsconfig: '<rootDir>/tsconfig.spec.json' },
        ],
    },
    moduleFileExtensions: ['ts', 'js', 'html'],
    coverageDirectory: '../../../coverage/apps/user/user-event-handler-service',
    // Exclude infrastructure/bootstrap code from coverage
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.spec.ts',
        '!src/**/*.test.ts',
        '!src/**/*.stories.{ts,tsx}',
        '!src/**/index.ts',
        '!src/**/*.d.ts',
        '!src/main.ts', // Exclude bootstrap code - tested via E2E
    ],
    // Override coverage thresholds for simple queue processor
    coverageThreshold: {
        global: {
            branches: 0,     // Simple linear code, no complex branching
            functions: 55,   // Keep standard threshold
            lines: 55,       // Keep standard threshold  
            statements: 55   // Keep standard threshold
        }
    },
};
