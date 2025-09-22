export default {
    displayName: 'configuration-api-service',
    preset: '../../../jest.preset.js',
    testEnvironment: 'node',
    transform: {
        '^.+\\.[tj]s$': [
            'ts-jest',
            { tsconfig: '<rootDir>/tsconfig.spec.json' },
        ],
    },
    moduleFileExtensions: ['ts', 'js', 'html'],
    coverageDirectory:
        '../../../coverage/apps/configuration/configuration-api-service',
    // Exclude infrastructure/bootstrap code from coverage
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.spec.ts',
        '!src/**/*.test.ts',
        '!src/**/*.stories.{ts,tsx}',
        '!src/**/index.ts',
        '!src/**/*.d.ts',
        '!src/main.ts', // Exclude bootstrap code - tested via E2E
        '!src/app/app.module.ts', // Exclude module files - tested via integration
    ],
};
