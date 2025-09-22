import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { MessageHandlerService } from './message.handler.service';

describe('AppService', () => {
    let service: AppService;
    let messageHandlerService: jest.Mocked<MessageHandlerService>;
    let loggerLogSpy: jest.SpyInstance;
    let loggerErrorSpy: jest.SpyInstance;

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
        messageHandlerService = module.get(MessageHandlerService);

        // Mock logger methods
        loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
        loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('handleMessage', () => {
        it('should handle disconnect event successfully', async () => {
            // Arrange
            const mockEvent = {
                requestContext: {
                    connectionId: 'test-connection-123',
                },
            };

            messageHandlerService.handleMessage.mockResolvedValue(undefined);

            // Act
            await service.handleMessage(mockEvent);

            // Assert
            expect(loggerLogSpy).toHaveBeenCalledWith(`event: ${JSON.stringify(mockEvent)}`);
            expect(messageHandlerService.handleMessage).toHaveBeenCalledWith(mockEvent);
            expect(messageHandlerService.handleMessage).toHaveBeenCalledTimes(1);
            expect(loggerErrorSpy).not.toHaveBeenCalled();
        });

        it('should handle event with additional properties successfully', async () => {
            // Arrange
            const mockEvent = {
                requestContext: {
                    connectionId: 'test-connection-456',
                },
                additionalProperty: 'test-value',
                timestamp: '2024-01-01T10:00:00Z',
            };

            messageHandlerService.handleMessage.mockResolvedValue(undefined);

            // Act
            await service.handleMessage(mockEvent);

            // Assert
            expect(loggerLogSpy).toHaveBeenCalledWith(`event: ${JSON.stringify(mockEvent)}`);
            expect(messageHandlerService.handleMessage).toHaveBeenCalledWith(mockEvent);
            expect(messageHandlerService.handleMessage).toHaveBeenCalledTimes(1);
            expect(loggerErrorSpy).not.toHaveBeenCalled();
        });

        it('should handle empty event object', async () => {
            // Arrange
            const mockEvent = {};

            messageHandlerService.handleMessage.mockResolvedValue(undefined);

            // Act
            await service.handleMessage(mockEvent);

            // Assert
            expect(loggerLogSpy).toHaveBeenCalledWith(`event: ${JSON.stringify(mockEvent)}`);
            expect(messageHandlerService.handleMessage).toHaveBeenCalledWith(mockEvent);
            expect(messageHandlerService.handleMessage).toHaveBeenCalledTimes(1);
            expect(loggerErrorSpy).not.toHaveBeenCalled();
        });

        it('should handle null event', async () => {
            // Arrange
            const mockEvent = null;

            messageHandlerService.handleMessage.mockResolvedValue(undefined);

            // Act
            await service.handleMessage(mockEvent);

            // Assert
            expect(loggerLogSpy).toHaveBeenCalledWith(`event: ${JSON.stringify(mockEvent)}`);
            expect(messageHandlerService.handleMessage).toHaveBeenCalledWith(mockEvent);
            expect(messageHandlerService.handleMessage).toHaveBeenCalledTimes(1);
            expect(loggerErrorSpy).not.toHaveBeenCalled();
        });

        it('should handle undefined event', async () => {
            // Arrange
            const mockEvent = undefined;

            messageHandlerService.handleMessage.mockResolvedValue(undefined);

            // Act
            await service.handleMessage(mockEvent);

            // Assert
            expect(loggerLogSpy).toHaveBeenCalledWith(`event: ${JSON.stringify(mockEvent)}`);
            expect(messageHandlerService.handleMessage).toHaveBeenCalledWith(mockEvent);
            expect(messageHandlerService.handleMessage).toHaveBeenCalledTimes(1);
            expect(loggerErrorSpy).not.toHaveBeenCalled();
        });

        it('should handle event with complex nested structure', async () => {
            // Arrange
            const mockEvent = {
                requestContext: {
                    connectionId: 'complex-connection-789',
                    authorizer: {
                        claims: {
                            sub: 'user-123',
                            email: 'user@example.com',
                        },
                    },
                    stage: 'dev',
                },
                body: {
                    message: 'Disconnect request',
                    reason: 'User initiated',
                },
                headers: {
                    'Content-Type': 'application/json',
                },
            };

            messageHandlerService.handleMessage.mockResolvedValue(undefined);

            // Act
            await service.handleMessage(mockEvent);

            // Assert
            expect(loggerLogSpy).toHaveBeenCalledWith(`event: ${JSON.stringify(mockEvent)}`);
            expect(messageHandlerService.handleMessage).toHaveBeenCalledWith(mockEvent);
            expect(messageHandlerService.handleMessage).toHaveBeenCalledTimes(1);
            expect(loggerErrorSpy).not.toHaveBeenCalled();
        });

        it('should handle messageHandlerService error gracefully', async () => {
            // Arrange
            const mockEvent = {
                requestContext: {
                    connectionId: 'error-connection-123',
                },
            };

            const testError = new Error('Message processing failed');
            messageHandlerService.handleMessage.mockRejectedValue(testError);

            // Act & Assert
            await expect(service.handleMessage(mockEvent)).rejects.toThrow('Message processing failed');
            expect(loggerLogSpy).toHaveBeenCalledWith(`event: ${JSON.stringify(mockEvent)}`);
            expect(messageHandlerService.handleMessage).toHaveBeenCalledWith(mockEvent);
            expect(messageHandlerService.handleMessage).toHaveBeenCalledTimes(1);
        });

        it('should handle multiple consecutive calls successfully', async () => {
            // Arrange
            const mockEvents = [
                {
                    requestContext: { connectionId: 'connection-1' },
                },
                {
                    requestContext: { connectionId: 'connection-2' },
                },
                {
                    requestContext: { connectionId: 'connection-3' },
                },
            ];

            messageHandlerService.handleMessage.mockResolvedValue(undefined);

            // Act
            for (const event of mockEvents) {
                await service.handleMessage(event);
            }

            // Assert
            expect(messageHandlerService.handleMessage).toHaveBeenCalledTimes(3);
            mockEvents.forEach((event, index) => {
                expect(loggerLogSpy).toHaveBeenNthCalledWith(index + 1, `event: ${JSON.stringify(event)}`);
                expect(messageHandlerService.handleMessage).toHaveBeenNthCalledWith(index + 1, event);
            });
            expect(loggerErrorSpy).not.toHaveBeenCalled();
        });

        it('should handle event with special characters in connectionId', async () => {
            // Arrange
            const specialConnectionId = 'test-connection-!@#$%^&*()_+-=[]{}|;:,.<>?';
            const mockEvent = {
                requestContext: {
                    connectionId: specialConnectionId,
                },
            };

            messageHandlerService.handleMessage.mockResolvedValue(undefined);

            // Act
            await service.handleMessage(mockEvent);

            // Assert
            expect(loggerLogSpy).toHaveBeenCalledWith(`event: ${JSON.stringify(mockEvent)}`);
            expect(messageHandlerService.handleMessage).toHaveBeenCalledWith(mockEvent);
            expect(messageHandlerService.handleMessage).toHaveBeenCalledTimes(1);
            expect(loggerErrorSpy).not.toHaveBeenCalled();
        });

        it('should handle event with very long connectionId', async () => {
            // Arrange
            const longConnectionId = 'test-connection-' + 'a'.repeat(1000);
            const mockEvent = {
                requestContext: {
                    connectionId: longConnectionId,
                },
            };

            messageHandlerService.handleMessage.mockResolvedValue(undefined);

            // Act
            await service.handleMessage(mockEvent);

            // Assert
            expect(loggerLogSpy).toHaveBeenCalledWith(`event: ${JSON.stringify(mockEvent)}`);
            expect(messageHandlerService.handleMessage).toHaveBeenCalledWith(mockEvent);
            expect(messageHandlerService.handleMessage).toHaveBeenCalledTimes(1);
            expect(loggerErrorSpy).not.toHaveBeenCalled();
        });
    });
});
