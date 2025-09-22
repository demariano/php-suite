import { Test, TestingModule } from '@nestjs/testing';
import { MessageHandlerService } from './message.handler.service';

describe('MessageHandlerService', () => {
    let service: MessageHandlerService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [MessageHandlerService],
        }).compile();

        service = module.get<MessageHandlerService>(MessageHandlerService);

        // Mock console.log to avoid noise in tests but verify it's called
        jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('handleMessage', () => {
        it('should handle simple string message', async () => {
            const message = 'simple string message';
            const consoleSpy = jest.spyOn(console, 'log');

            await service.handleMessage(message);

            expect(consoleSpy).toHaveBeenCalledWith(message);
        });

        it('should handle JSON string message', async () => {
            const message = JSON.stringify({ userId: 123, event: 'user_created' });
            const consoleSpy = jest.spyOn(console, 'log');

            await service.handleMessage(message);

            expect(consoleSpy).toHaveBeenCalledWith(message);
        });

        it('should handle complex JSON message', async () => {
            const complexMessage = JSON.stringify({
                userId: 123,
                event: 'user_profile_updated',
                data: {
                    changes: {
                        personalInfo: { name: 'John Doe', age: 30 },
                        preferences: { notifications: true, theme: 'dark' }
                    },
                    metadata: {
                        timestamp: '2024-01-01T10:00:00Z',
                        source: 'web_app',
                        sessionId: 'session-abc123'
                    }
                }
            });
            const consoleSpy = jest.spyOn(console, 'log');

            await service.handleMessage(complexMessage);

            expect(consoleSpy).toHaveBeenCalledWith(complexMessage);
        });

        it('should handle different user event types', async () => {
            const eventTypes = [
                JSON.stringify({ userId: 100, event: 'user_registered', email: 'new@example.com' }),
                JSON.stringify({ userId: 101, event: 'user_profile_updated', changes: { name: 'Updated Name' } }),
                JSON.stringify({ userId: 102, event: 'user_password_changed', timestamp: '2024-01-01T10:00:00Z' }),
                JSON.stringify({ userId: 103, event: 'user_email_verified', email: 'verified@example.com' }),
                JSON.stringify({ userId: 104, event: 'user_account_suspended', reason: 'Policy violation' }),
                JSON.stringify({ userId: 105, event: 'user_subscription_updated', plan: 'premium' }),
                JSON.stringify({ userId: 106, event: 'user_login', loginMethod: 'oauth', provider: 'google' }),
                JSON.stringify({ userId: 107, event: 'user_logout', sessionDuration: 3600 })
            ];

            const consoleSpy = jest.spyOn(console, 'log');

            for (const message of eventTypes) {
                await service.handleMessage(message);
                expect(consoleSpy).toHaveBeenCalledWith(message);
            }

            expect(consoleSpy).toHaveBeenCalledTimes(eventTypes.length);
        });

        it('should handle null message', async () => {
            const message = null;
            const consoleSpy = jest.spyOn(console, 'log');

            await service.handleMessage(message);

            expect(consoleSpy).toHaveBeenCalledWith(message);
        });

        it('should handle undefined message', async () => {
            const message = undefined;
            const consoleSpy = jest.spyOn(console, 'log');

            await service.handleMessage(message);

            expect(consoleSpy).toHaveBeenCalledWith(message);
        });

        it('should handle empty string message', async () => {
            const message = '';
            const consoleSpy = jest.spyOn(console, 'log');

            await service.handleMessage(message);

            expect(consoleSpy).toHaveBeenCalledWith(message);
        });

        it('should handle numeric message', async () => {
            const message = 12345;
            const consoleSpy = jest.spyOn(console, 'log');

            await service.handleMessage(message);

            expect(consoleSpy).toHaveBeenCalledWith(message);
        });

        it('should handle boolean message', async () => {
            const messages = [true, false];
            const consoleSpy = jest.spyOn(console, 'log');

            for (const message of messages) {
                await service.handleMessage(message);
                expect(consoleSpy).toHaveBeenCalledWith(message);
            }

            expect(consoleSpy).toHaveBeenCalledTimes(2);
        });

        it('should handle object message', async () => {
            const message = {
                userId: 123,
                event: 'user_action',
                data: { action: 'click', element: 'button' }
            };
            const consoleSpy = jest.spyOn(console, 'log');

            await service.handleMessage(message);

            expect(consoleSpy).toHaveBeenCalledWith(message);
        });

        it('should handle array message', async () => {
            const message = [
                { userId: 123, event: 'user_created' },
                { userId: 456, event: 'user_updated' },
                { userId: 789, event: 'user_deleted' }
            ];
            const consoleSpy = jest.spyOn(console, 'log');

            await service.handleMessage(message);

            expect(consoleSpy).toHaveBeenCalledWith(message);
        });

        it('should handle malformed JSON string', async () => {
            const message = '{ invalid json structure';
            const consoleSpy = jest.spyOn(console, 'log');

            await service.handleMessage(message);

            expect(consoleSpy).toHaveBeenCalledWith(message);
        });

        it('should handle special characters in message', async () => {
            const message = 'Message with special chars: àáâãäåæçèéêë ñòóôõö ùúûüý';
            const consoleSpy = jest.spyOn(console, 'log');

            await service.handleMessage(message);

            expect(consoleSpy).toHaveBeenCalledWith(message);
        });

        it('should handle very long message', async () => {
            const longMessage = 'A'.repeat(10000); // 10KB message
            const consoleSpy = jest.spyOn(console, 'log');

            await service.handleMessage(longMessage);

            expect(consoleSpy).toHaveBeenCalledWith(longMessage);
        });

        it('should handle message with unicode characters', async () => {
            const message = JSON.stringify({
                userId: 123,
                event: 'user_message',
                content: '👋 Hello! 🌍 Unicode test: 中文, العربية, हिन्दी, 日本語'
            });
            const consoleSpy = jest.spyOn(console, 'log');

            await service.handleMessage(message);

            expect(consoleSpy).toHaveBeenCalledWith(message);
        });

        it('should handle business critical events', async () => {
            const criticalEvents = [
                JSON.stringify({
                    userId: 123,
                    event: 'payment_processed',
                    amount: 99.99,
                    currency: 'USD',
                    transactionId: 'txn_abc123'
                }),
                JSON.stringify({
                    userId: 456,
                    event: 'account_locked',
                    reason: 'multiple_failed_attempts',
                    lockDuration: 3600
                }),
                JSON.stringify({
                    userId: 789,
                    event: 'data_export_requested',
                    exportType: 'full_profile',
                    requestedBy: 'user'
                })
            ];

            const consoleSpy = jest.spyOn(console, 'log');

            for (const message of criticalEvents) {
                await service.handleMessage(message);
                expect(consoleSpy).toHaveBeenCalledWith(message);
            }

            expect(consoleSpy).toHaveBeenCalledTimes(criticalEvents.length);
        });

        it('should handle concurrent message processing', async () => {
            const messages = [
                'concurrent_message_1',
                'concurrent_message_2',
                'concurrent_message_3'
            ];
            const consoleSpy = jest.spyOn(console, 'log');

            // Process messages concurrently
            const promises = messages.map(message => service.handleMessage(message));
            await Promise.all(promises);

            // All messages should be logged
            messages.forEach(message => {
                expect(consoleSpy).toHaveBeenCalledWith(message);
            });
            expect(consoleSpy).toHaveBeenCalledTimes(messages.length);
        });

        it('should complete successfully for any message type', async () => {
            const variousMessages = [
                'string',
                123,
                true,
                null,
                undefined,
                {},
                [],
                JSON.stringify({ test: 'object' })
            ];

            for (const message of variousMessages) {
                // Should not throw any errors
                await expect(service.handleMessage(message)).resolves.toBeUndefined();
            }
        });

        it('should handle message with nested objects and arrays', async () => {
            const complexMessage = JSON.stringify({
                userId: 123,
                event: 'complex_user_action',
                data: {
                    userProfile: {
                        personalInfo: {
                            name: 'John Doe',
                            contacts: {
                                emails: ['john@example.com', 'john.doe@work.com'],
                                phones: ['+1234567890', '+0987654321']
                            }
                        },
                        preferences: {
                            notifications: {
                                email: true,
                                sms: false,
                                push: true
                            },
                            privacy: {
                                profileVisibility: 'friends',
                                activityTracking: false
                            }
                        }
                    },
                    metadata: {
                        timestamps: {
                            created: '2024-01-01T00:00:00Z',
                            lastModified: '2024-01-15T14:30:00Z',
                            lastAccessed: '2024-01-20T09:15:00Z'
                        },
                        tracking: {
                            sessions: [
                                { id: 'session1', duration: 1200, pages: 5 },
                                { id: 'session2', duration: 800, pages: 3 }
                            ]
                        }
                    }
                }
            });

            const consoleSpy = jest.spyOn(console, 'log');

            await service.handleMessage(complexMessage);

            expect(consoleSpy).toHaveBeenCalledWith(complexMessage);
        });

        it('should preserve message content exactly as received', async () => {
            const originalMessage = JSON.stringify({
                userId: 123,
                specialChars: 'Test "quotes" and \'apostrophes\' and\ttabs\nand newlines',
                numbers: [1, 2.5, -3, 0],
                booleans: [true, false],
                nullValue: null
            });

            const consoleSpy = jest.spyOn(console, 'log');

            await service.handleMessage(originalMessage);

            // Verify the exact message was logged
            expect(consoleSpy).toHaveBeenCalledWith(originalMessage);
        });
    });
});
