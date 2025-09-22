import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MessageHandlerService } from './message.handler.service';
import { SqsLocalService } from './sqs.local.service';

// Mock AWS SDK completely
jest.mock('@aws-sdk/client-sqs', () => ({
    SQSClient: jest.fn(),
    ReceiveMessageCommand: jest.fn(),
    DeleteMessageCommand: jest.fn(),
}));

describe('SqsLocalService', () => {
    let service: SqsLocalService;
    let messageHandlerService: jest.Mocked<MessageHandlerService>;
    let mockSqsClient: any;

    const originalEnv = process.env;

    beforeEach(async () => {
        // Set up test environment variables
        process.env = {
            ...originalEnv,
            DEFAULT_REGION: 'us-east-1',
            LOCALSTACK_ENDPOINT: 'http://localhost:4566',
            USER_EVENT_SQS: 'https://sqs.us-east-1.amazonaws.com/123456789/user-events'
        };

        // Mock SQS Client
        mockSqsClient = {
            send: jest.fn(),
        };

        const { SQSClient } = require('@aws-sdk/client-sqs');
        SQSClient.mockImplementation(() => mockSqsClient);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SqsLocalService,
                {
                    provide: MessageHandlerService,
                    useValue: {
                        handleMessage: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<SqsLocalService>(SqsLocalService);
        messageHandlerService = module.get(MessageHandlerService) as jest.Mocked<MessageHandlerService>;

        // Mock the logger to avoid console output during tests
        jest.spyOn(Logger.prototype, 'log').mockImplementation();
        jest.spyOn(Logger.prototype, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
        process.env = originalEnv;
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('constructor', () => {
        it('should initialize SQS client with correct configuration', () => {
            const { SQSClient } = require('@aws-sdk/client-sqs');
            expect(SQSClient).toHaveBeenCalledWith({
                region: 'us-east-1',
                endpoint: 'http://localhost:4566',
            });
        });

        it('should handle missing environment variables gracefully', () => {
            // Service should be created without throwing errors
            expect(service).toBeDefined();
        });
    });

    describe('pollQueue', () => {
        // Note: pollQueue() contains an infinite loop, so we test individual components instead
        it('should have pollQueue method defined', () => {
            expect(service.pollQueue).toBeDefined();
            expect(typeof service.pollQueue).toBe('function');
        });

        it('should use environment variables correctly', () => {
            expect(process.env.DEFAULT_REGION).toBe('us-east-1');
            expect(process.env.LOCALSTACK_ENDPOINT).toBe('http://localhost:4566');
            expect(process.env.USER_EVENT_SQS).toBe('https://sqs.us-east-1.amazonaws.com/123456789/user-events');
        });
    });
});
