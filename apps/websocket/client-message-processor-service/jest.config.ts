export default {
    displayName: 'client-message-processor-service',
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
        '../../../coverage/apps/websocket/client-message-processor-service',
    // Exclude infrastructure/bootstrap code from coverage
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.spec.ts',
        '!src/**/*.test.ts',
        '!src/**/*.stories.{ts,tsx}',
        '!src/**/index.ts',
        '!src/**/*.d.ts',
        '!src/main.ts', // Exclude bootstrap code - tested via E2E
        '!src/app/app.module.ts', // Exclude NestJS module configuration
        '!src/app/message.handler.service.ts', // Exclude message handler infrastructure
        '!src/app/sqs.local.service.ts', // Exclude SQS polling infrastructure
    ],
};
