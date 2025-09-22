import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
    let controller: AppController;
    let appService: jest.Mocked<AppService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AppController],
            providers: [
                {
                    provide: AppService,
                    useValue: {
                        handleMessage: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<AppController>(AppController);
        appService = module.get(AppService) as jest.Mocked<AppService>;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('handleMessage', () => {
        it('should process SQS message body successfully', async () => {
            const messageBody = {
                Records: [
                    { body: JSON.stringify({ userId: 123, event: 'user_created' }) }
                ]
            };

            appService.handleMessage.mockResolvedValue(undefined);

            const result = await controller.handleMessage(messageBody);

            expect(appService.handleMessage).toHaveBeenCalledWith(messageBody);
            expect(result).toBeUndefined();
        });

        it('should handle multiple SQS records in message body', async () => {
            const messageBody = {
                Records: [
                    { body: JSON.stringify({ userId: 123, event: 'user_created' }) },
                    { body: JSON.stringify({ userId: 456, event: 'user_updated' }) },
                    { body: JSON.stringify({ userId: 789, event: 'user_deleted' }) }
                ]
            };

            appService.handleMessage.mockResolvedValue(undefined);

            await controller.handleMessage(messageBody);

            expect(appService.handleMessage).toHaveBeenCalledWith(messageBody);
            expect(appService.handleMessage).toHaveBeenCalledTimes(1);
        });

        it('should handle empty message body', async () => {
            const messageBody = {};

            appService.handleMessage.mockResolvedValue(undefined);

            await controller.handleMessage(messageBody);

            expect(appService.handleMessage).toHaveBeenCalledWith(messageBody);
        });

        it('should handle different user event types', async () => {
            const eventTypes = [
                {
                    Records: [
                        { body: JSON.stringify({ userId: 100, event: 'user_registered', email: 'user@example.com' }) }
                    ]
                },
                {
                    Records: [
                        { body: JSON.stringify({ userId: 101, event: 'user_profile_updated', changes: { name: 'Updated' } }) }
                    ]
                },
                {
                    Records: [
                        { body: JSON.stringify({ userId: 102, event: 'user_password_changed', timestamp: '2024-01-01' }) }
                    ]
                },
                {
                    Records: [
                        { body: JSON.stringify({ userId: 103, event: 'user_email_verified', email: 'verified@example.com' }) }
                    ]
                },
                {
                    Records: [
                        { body: JSON.stringify({ userId: 104, event: 'user_account_suspended', reason: 'violation' }) }
                    ]
                }
            ];

            for (const messageBody of eventTypes) {
                appService.handleMessage.mockResolvedValue(undefined);

                await controller.handleMessage(messageBody);

                expect(appService.handleMessage).toHaveBeenCalledWith(messageBody);
                jest.clearAllMocks();
            }
        });

        it('should handle complex message payloads', async () => {
            const complexMessage = {
                Records: [
                    {
                        body: JSON.stringify({
                            userId: 123,
                            event: 'user_subscription_updated',
                            data: {
                                subscription: {
                                    plan: 'premium',
                                    features: ['analytics', 'priority_support'],
                                    billing: { amount: 99.99, currency: 'USD' }
                                },
                                metadata: {
                                    timestamp: '2024-01-01T10:00:00Z',
                                    source: 'admin_panel',
                                    adminUserId: 456
                                }
                            }
                        })
                    }
                ]
            };

            appService.handleMessage.mockResolvedValue(undefined);

            await controller.handleMessage(complexMessage);

            expect(appService.handleMessage).toHaveBeenCalledWith(complexMessage);
        });

        it('should handle null and undefined bodies', async () => {
            const messageBodies = [null, undefined];

            for (const messageBody of messageBodies) {
                appService.handleMessage.mockResolvedValue(undefined);

                await controller.handleMessage(messageBody);

                expect(appService.handleMessage).toHaveBeenCalledWith(messageBody);
                jest.clearAllMocks();
            }
        });

        it('should handle malformed message bodies', async () => {
            const malformedBodies = [
                { Records: 'invalid_format' },
                { Records: [] },
                { Records: null },
                { invalidProperty: 'value' },
                'string_instead_of_object'
            ];

            for (const messageBody of malformedBodies) {
                appService.handleMessage.mockResolvedValue(undefined);

                await controller.handleMessage(messageBody);

                expect(appService.handleMessage).toHaveBeenCalledWith(messageBody);
                jest.clearAllMocks();
            }
        });

        it('should handle large batch messages', async () => {
            const largeBatchMessage = {
                Records: Array.from({ length: 50 }, (_, i) => ({
                    body: JSON.stringify({
                        userId: i + 1,
                        event: 'bulk_user_update',
                        batchId: 'batch_001',
                        sequenceNumber: i
                    })
                }))
            };

            appService.handleMessage.mockResolvedValue(undefined);

            await controller.handleMessage(largeBatchMessage);

            expect(appService.handleMessage).toHaveBeenCalledWith(largeBatchMessage);
            expect(appService.handleMessage).toHaveBeenCalledTimes(1);
        });

        it('should pass through service errors', async () => {
            const messageBody = {
                Records: [
                    { body: JSON.stringify({ userId: 123, event: 'problematic_event' }) }
                ]
            };
            const serviceError = new Error('Service processing failed');

            appService.handleMessage.mockRejectedValue(serviceError);

            await expect(controller.handleMessage(messageBody)).rejects.toThrow('Service processing failed');

            expect(appService.handleMessage).toHaveBeenCalledWith(messageBody);
        });

        it('should handle different error types from service', async () => {
            const messageBody = {
                Records: [
                    { body: JSON.stringify({ userId: 123, event: 'error_test' }) }
                ]
            };

            const errorTypes = [
                new Error('General error'),
                new TypeError('Type error'),
                new RangeError('Range error'),
                new ReferenceError('Reference error')
            ];

            for (const error of errorTypes) {
                appService.handleMessage.mockRejectedValue(error);

                await expect(controller.handleMessage(messageBody)).rejects.toThrow(error.message);

                expect(appService.handleMessage).toHaveBeenCalledWith(messageBody);
                jest.clearAllMocks();
            }
        });

        it('should handle SQS message format correctly', async () => {
            // Simulate actual SQS message format
            const sqsMessage = {
                Records: [
                    {
                        messageId: 'msg-123',
                        receiptHandle: 'receipt-456',
                        body: JSON.stringify({ userId: 123, event: 'user_created' }),
                        attributes: {
                            ApproximateReceiveCount: '1',
                            SentTimestamp: '1640995200000',
                            SenderId: 'AIDAIENQZJOLO23YVJ4VO',
                            ApproximateFirstReceiveTimestamp: '1640995200000'
                        },
                        messageAttributes: {},
                        md5OfBody: 'abc123',
                        eventSource: 'aws:sqs',
                        eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:user-events',
                        awsRegion: 'us-east-1'
                    }
                ]
            };

            appService.handleMessage.mockResolvedValue(undefined);

            await controller.handleMessage(sqsMessage);

            expect(appService.handleMessage).toHaveBeenCalledWith(sqsMessage);
        });

        it('should handle concurrent requests', async () => {
            const messageBodies = [
                { Records: [{ body: JSON.stringify({ userId: 123, event: 'concurrent_1' }) }] },
                { Records: [{ body: JSON.stringify({ userId: 456, event: 'concurrent_2' }) }] },
                { Records: [{ body: JSON.stringify({ userId: 789, event: 'concurrent_3' }) }] }
            ];

            appService.handleMessage.mockResolvedValue(undefined);

            // Process multiple requests concurrently
            const promises = messageBodies.map(body => controller.handleMessage(body));
            await Promise.all(promises);

            expect(appService.handleMessage).toHaveBeenCalledTimes(3);
            expect(appService.handleMessage).toHaveBeenNthCalledWith(1, messageBodies[0]);
            expect(appService.handleMessage).toHaveBeenNthCalledWith(2, messageBodies[1]);
            expect(appService.handleMessage).toHaveBeenNthCalledWith(3, messageBodies[2]);
        });

        it('should preserve message body structure exactly', async () => {
            const originalMessage = {
                Records: [
                    {
                        body: JSON.stringify({
                            userId: 123,
                            event: 'structure_test',
                            nested: { deep: { value: 'preserved' } },
                            array: [1, 2, 3],
                            boolean: true,
                            null_value: null
                        })
                    }
                ],
                customProperty: 'should_be_preserved'
            };

            appService.handleMessage.mockImplementation((receivedBody) => {
                expect(receivedBody).toEqual(originalMessage);
                return Promise.resolve();
            });

            await controller.handleMessage(originalMessage);

            expect(appService.handleMessage).toHaveBeenCalledWith(originalMessage);
        });
    });
});
