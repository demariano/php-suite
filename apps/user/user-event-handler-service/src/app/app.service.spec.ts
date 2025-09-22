import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { MessageHandlerService } from './message.handler.service';

describe('AppService', () => {
    let service: AppService;
    let messageHandlerService: jest.Mocked<MessageHandlerService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AppService,
                {
                    provide: MessageHandlerService,
                    useValue: {
                        handleMessage: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<AppService>(AppService);
        messageHandlerService = module.get(MessageHandlerService) as jest.Mocked<MessageHandlerService>;

        // Mock the logger to avoid console output during tests
        jest.spyOn(Logger.prototype, 'log').mockImplementation();
        jest.spyOn(Logger.prototype, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('handleMessage', () => {
        it('should process single SQS record successfully', async () => {
            const mockRecord = {
                body: JSON.stringify({ userId: 123, event: 'user_created' })
            };
            const records = [mockRecord];

            messageHandlerService.handleMessage.mockResolvedValue(undefined);

            await service.handleMessage(records);

            expect(messageHandlerService.handleMessage).toHaveBeenCalledWith(mockRecord.body);
            expect(messageHandlerService.handleMessage).toHaveBeenCalledTimes(1);
        });

        it('should process multiple SQS records successfully', async () => {
            const mockRecords = [
                { body: JSON.stringify({ userId: 123, event: 'user_created' }) },
                { body: JSON.stringify({ userId: 456, event: 'user_updated' }) },
                { body: JSON.stringify({ userId: 789, event: 'user_deleted' }) }
            ];

            messageHandlerService.handleMessage.mockResolvedValue(undefined);

            await service.handleMessage(mockRecords);

            expect(messageHandlerService.handleMessage).toHaveBeenCalledTimes(3);
            expect(messageHandlerService.handleMessage).toHaveBeenNthCalledWith(1, mockRecords[0].body);
            expect(messageHandlerService.handleMessage).toHaveBeenNthCalledWith(2, mockRecords[1].body);
            expect(messageHandlerService.handleMessage).toHaveBeenNthCalledWith(3, mockRecords[2].body);
        });

        it('should handle empty records array', async () => {
            const records = [];

            await service.handleMessage(records);

            expect(messageHandlerService.handleMessage).not.toHaveBeenCalled();
        });

        it('should handle user event types correctly', async () => {
            const userEventTypes = [
                { userId: 100, event: 'user_registered', email: 'new@example.com' },
                { userId: 101, event: 'user_profile_updated', changes: { name: 'Updated Name' } },
                { userId: 102, event: 'user_password_changed', timestamp: '2024-01-01T10:00:00Z' },
                { userId: 103, event: 'user_email_verified', email: 'verified@example.com' },
                { userId: 104, event: 'user_account_suspended', reason: 'Policy violation' }
            ];

            for (const eventData of userEventTypes) {
                const record = { body: JSON.stringify(eventData) };
                messageHandlerService.handleMessage.mockResolvedValue(undefined);

                await service.handleMessage([record]);

                expect(messageHandlerService.handleMessage).toHaveBeenCalledWith(record.body);
                jest.clearAllMocks();
            }
        });

        it('should continue processing other records when one fails', async () => {
            const mockRecords = [
                { body: JSON.stringify({ userId: 123, event: 'user_created' }) },
                { body: JSON.stringify({ userId: 456, event: 'invalid_event' }) }, // This will fail
                { body: JSON.stringify({ userId: 789, event: 'user_updated' }) }
            ];

            messageHandlerService.handleMessage
                .mockResolvedValueOnce(undefined) // First record succeeds
                .mockRejectedValueOnce(new Error('Invalid event type')) // Second record fails
                .mockResolvedValueOnce(undefined); // Third record succeeds

            await service.handleMessage(mockRecords);

            expect(messageHandlerService.handleMessage).toHaveBeenCalledTimes(3);
            // All three records should have been attempted
            expect(messageHandlerService.handleMessage).toHaveBeenNthCalledWith(1, mockRecords[0].body);
            expect(messageHandlerService.handleMessage).toHaveBeenNthCalledWith(2, mockRecords[1].body);
            expect(messageHandlerService.handleMessage).toHaveBeenNthCalledWith(3, mockRecords[2].body);
        });

        it('should handle message processing errors gracefully', async () => {
            const mockRecord = {
                body: JSON.stringify({ userId: 123, event: 'problematic_event' })
            };
            const records = [mockRecord];
            const error = new Error('Message processing failed');

            messageHandlerService.handleMessage.mockRejectedValue(error);

            // Should not throw - errors are caught and logged
            await expect(service.handleMessage(records)).resolves.not.toThrow();

            expect(messageHandlerService.handleMessage).toHaveBeenCalledWith(mockRecord.body);
        });

        it('should handle different types of message processing errors', async () => {
            const errorTypes = [
                new Error('Database connection failed'),
                new Error('Invalid message format'),
                new Error('Timeout processing message'),
                new TypeError('Cannot process undefined user'),
                new RangeError('User ID out of range')
            ];

            for (const error of errorTypes) {
                const record = { body: JSON.stringify({ userId: 123, event: 'test_event' }) };
                messageHandlerService.handleMessage.mockRejectedValue(error);

                await expect(service.handleMessage([record])).resolves.not.toThrow();

                expect(messageHandlerService.handleMessage).toHaveBeenCalledWith(record.body);
                jest.clearAllMocks();
            }
        });

        it('should handle complex user event payloads', async () => {
            const complexPayloads = [
                {
                    userId: 123,
                    event: 'user_profile_updated',
                    changes: {
                        personalInfo: { name: 'John Doe', age: 30 },
                        preferences: { notifications: true, theme: 'dark' },
                        metadata: { lastLogin: '2024-01-01T10:00:00Z', ipAddress: '192.168.1.1' }
                    }
                },
                {
                    userId: 456,
                    event: 'user_subscription_changed',
                    subscription: {
                        plan: 'premium',
                        features: ['advanced_analytics', 'priority_support'],
                        billing: { amount: 99.99, currency: 'USD', interval: 'monthly' }
                    }
                }
            ];

            for (const payload of complexPayloads) {
                const record = { body: JSON.stringify(payload) };
                messageHandlerService.handleMessage.mockResolvedValue(undefined);

                await service.handleMessage([record]);

                expect(messageHandlerService.handleMessage).toHaveBeenCalledWith(record.body);
                jest.clearAllMocks();
            }
        });

        it('should handle malformed message records', async () => {
            const malformedRecords = [
                { body: '{ invalid json' }, // Invalid JSON
                { body: '' }, // Empty body
                { body: null }, // Null body
                { body: undefined }, // Undefined body
                { body: 'plain text message' } // Non-JSON text
            ];

            for (const record of malformedRecords) {
                messageHandlerService.handleMessage.mockResolvedValue(undefined);

                await service.handleMessage([record]);

                expect(messageHandlerService.handleMessage).toHaveBeenCalledWith(record.body);
                jest.clearAllMocks();
            }
        });

        it('should handle large batch of messages efficiently', async () => {
            const largeBatch = Array.from({ length: 100 }, (_, i) => ({
                body: JSON.stringify({ userId: i + 1, event: 'bulk_event', batchId: 'batch_001' })
            }));

            messageHandlerService.handleMessage.mockResolvedValue(undefined);

            await service.handleMessage(largeBatch);

            expect(messageHandlerService.handleMessage).toHaveBeenCalledTimes(100);
            // Verify first and last messages
            expect(messageHandlerService.handleMessage).toHaveBeenNthCalledWith(1, largeBatch[0].body);
            expect(messageHandlerService.handleMessage).toHaveBeenNthCalledWith(100, largeBatch[99].body);
        });

        it('should log record processing information', async () => {
            const logSpy = jest.spyOn(Logger.prototype, 'log');
            const mockRecord = {
                body: JSON.stringify({ userId: 123, event: 'user_created' })
            };
            const records = [mockRecord];

            messageHandlerService.handleMessage.mockResolvedValue(undefined);

            await service.handleMessage(records);

            expect(logSpy).toHaveBeenCalledWith(`Record Value: ${JSON.stringify(records)}`);
            expect(logSpy).toHaveBeenCalledWith(`Processing SQS Message: ${JSON.stringify(mockRecord)}`);
        });

        it('should log errors when message processing fails', async () => {
            const errorSpy = jest.spyOn(Logger.prototype, 'error');
            const mockRecord = {
                body: JSON.stringify({ userId: 123, event: 'failing_event' })
            };
            const records = [mockRecord];
            const processingError = new Error('Processing failed');

            messageHandlerService.handleMessage.mockRejectedValue(processingError);

            await service.handleMessage(records);

            expect(errorSpy).toHaveBeenCalledWith(`Error processing SQS Message: ${JSON.stringify(processingError)}`);
        });

        it('should handle concurrent message processing', async () => {
            const concurrentRecords = [
                { body: JSON.stringify({ userId: 123, event: 'concurrent_event_1' }) },
                { body: JSON.stringify({ userId: 456, event: 'concurrent_event_2' }) },
                { body: JSON.stringify({ userId: 789, event: 'concurrent_event_3' }) }
            ];

            // Simulate some async processing time
            messageHandlerService.handleMessage.mockImplementation(() => 
                new Promise(resolve => setTimeout(resolve, 10))
            );

            const startTime = Date.now();
            await service.handleMessage(concurrentRecords);
            const endTime = Date.now();

            // Should process sequentially (not in parallel) as per current implementation
            expect(messageHandlerService.handleMessage).toHaveBeenCalledTimes(3);
            expect(endTime - startTime).toBeGreaterThan(25); // Should take at least 30ms for sequential processing
        });
    });
});
