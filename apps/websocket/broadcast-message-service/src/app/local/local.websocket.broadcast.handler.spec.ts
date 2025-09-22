import { BroadcastMessageDto } from '@dto';
import { Test, TestingModule } from '@nestjs/testing';
import { LocalWebsocketBroadcastHandler } from './local.websocket.broadcast.handler';

// Mock the global fetch function
global.fetch = jest.fn();

describe('LocalWebsocketBroadcastHandler', () => {
    let handler: LocalWebsocketBroadcastHandler;
    let consoleLogSpy: jest.SpyInstance;
    let fetchMock: jest.MockedFunction<typeof fetch>;

    const mockServiceUrl = 'http://localhost:3001/websocket/broadcast';
    const mockBroadcastMessage: BroadcastMessageDto = {
        connectionId: 'test-connection-id',
        action: 'test-action',
        message: 'Test message',
        broadcastToAll: false,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [LocalWebsocketBroadcastHandler],
        }).compile();

        handler = module.get<LocalWebsocketBroadcastHandler>(LocalWebsocketBroadcastHandler);

        // Mock console.log
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

        // Get the mocked fetch function
        fetchMock = fetch as jest.MockedFunction<typeof fetch>;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('handleMessage', () => {
        it('should handle message successfully with valid URL', async () => {
            // Arrange
            const originalEnv = process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL;
            process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL = mockServiceUrl;
            const messageString = JSON.stringify(mockBroadcastMessage);
            const mockResponse = { ok: true, status: 200 };
            fetchMock.mockResolvedValue(mockResponse as Response);

            // Act
            await handler.handleMessage(messageString);

            // Assert
            expect(consoleLogSpy).toHaveBeenCalledWith(mockBroadcastMessage);
            expect(fetchMock).toHaveBeenCalledWith(mockServiceUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(mockBroadcastMessage),
            });
            expect(consoleLogSpy).toHaveBeenCalledWith(mockResponse);

            // Cleanup
            process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL = originalEnv;
        });

        it('should log error message when service URL is not found', async () => {
            // Arrange
            const originalEnv = process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL;
            delete process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL;
            const messageString = JSON.stringify(mockBroadcastMessage);

            // Act
            await handler.handleMessage(messageString);

            // Assert
            expect(consoleLogSpy).toHaveBeenCalledWith(mockBroadcastMessage);
            expect(fetchMock).not.toHaveBeenCalled();
            expect(consoleLogSpy).toHaveBeenCalledWith('No connect service url found');

            // Cleanup
            process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL = originalEnv;
        });

        it('should log error message when service URL is empty string', async () => {
            // Arrange
            const originalEnv = process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL;
            process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL = '';
            const messageString = JSON.stringify(mockBroadcastMessage);

            // Act
            await handler.handleMessage(messageString);

            // Assert
            expect(consoleLogSpy).toHaveBeenCalledWith(mockBroadcastMessage);
            expect(fetchMock).not.toHaveBeenCalled();
            expect(consoleLogSpy).toHaveBeenCalledWith('No connect service url found');

            // Cleanup
            process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL = originalEnv;
        });

        it('should handle JSON parsing correctly', async () => {
            // Arrange
            const originalEnv = process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL;
            process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL = mockServiceUrl;
            const messageString = JSON.stringify(mockBroadcastMessage);
            const mockResponse = { ok: true, status: 200 };
            fetchMock.mockResolvedValue(mockResponse as Response);

            // Act
            await handler.handleMessage(messageString);

            // Assert
            expect(consoleLogSpy).toHaveBeenCalledWith(mockBroadcastMessage);
            expect(fetchMock).toHaveBeenCalledWith(
                mockServiceUrl,
                expect.objectContaining({
                    body: JSON.stringify(mockBroadcastMessage),
                })
            );

            // Cleanup
            process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL = originalEnv;
        });

        it('should handle invalid JSON message', async () => {
            // Arrange
            const originalEnv = process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL;
            process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL = mockServiceUrl;
            const invalidJsonMessage = '{ invalid json';

            // Act & Assert
            await expect(handler.handleMessage(invalidJsonMessage)).rejects.toThrow();
            expect(fetchMock).not.toHaveBeenCalled();

            // Cleanup
            process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL = originalEnv;
        });

        it('should handle fetch request with correct parameters', async () => {
            // Arrange
            const originalEnv = process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL;
            process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL = mockServiceUrl;
            const messageString = JSON.stringify(mockBroadcastMessage);
            const mockResponse = { ok: true, status: 200, json: jest.fn() };
            fetchMock.mockResolvedValue(mockResponse as unknown as Response);

            // Act
            await handler.handleMessage(messageString);

            // Assert
            expect(fetchMock).toHaveBeenCalledWith(mockServiceUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(mockBroadcastMessage),
            });
            expect(fetchMock).toHaveBeenCalledTimes(1);

            // Cleanup
            process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL = originalEnv;
        });

        it('should handle message with all optional properties', async () => {
            // Arrange
            const originalEnv = process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL;
            process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL = mockServiceUrl;
            const messageWithAllProperties: BroadcastMessageDto = {
                connectionId: 'test-connection-id',
                action: 'test-action',
                message: 'Complex nested message data',
                broadcastToAll: false,
            };
            const messageString = JSON.stringify(messageWithAllProperties);
            const mockResponse = { ok: true, status: 200 };
            fetchMock.mockResolvedValue(mockResponse as Response);

            // Act
            await handler.handleMessage(messageString);

            // Assert
            expect(consoleLogSpy).toHaveBeenCalledWith(messageWithAllProperties);
            expect(fetchMock).toHaveBeenCalledWith(
                mockServiceUrl,
                expect.objectContaining({
                    body: JSON.stringify(messageWithAllProperties),
                })
            );

            // Cleanup
            process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL = originalEnv;
        });

        it('should handle message with minimal required properties', async () => {
            // Arrange
            const originalEnv = process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL;
            process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL = mockServiceUrl;
            const minimalMessage: BroadcastMessageDto = {
                connectionId: 'minimal-connection-id',
                message: 'simple message',
                broadcastToAll: false,
            };
            const messageString = JSON.stringify(minimalMessage);
            const mockResponse = { ok: true, status: 200 };
            fetchMock.mockResolvedValue(mockResponse as Response);

            // Act
            await handler.handleMessage(messageString);

            // Assert
            expect(consoleLogSpy).toHaveBeenCalledWith(minimalMessage);
            expect(fetchMock).toHaveBeenCalledWith(
                mockServiceUrl,
                expect.objectContaining({
                    body: JSON.stringify(minimalMessage),
                })
            );

            // Cleanup
            process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL = originalEnv;
        });

        it('should handle fetch error gracefully', async () => {
            // Arrange
            const originalEnv = process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL;
            process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL = mockServiceUrl;
            const messageString = JSON.stringify(mockBroadcastMessage);
            const fetchError = new Error('Network error');
            fetchMock.mockRejectedValue(fetchError);

            // Act & Assert
            await expect(handler.handleMessage(messageString)).rejects.toThrow('Network error');
            expect(consoleLogSpy).toHaveBeenCalledWith(mockBroadcastMessage);
            expect(fetchMock).toHaveBeenCalledWith(mockServiceUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(mockBroadcastMessage),
            });

            // Cleanup
            process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL = originalEnv;
        });

        it('should handle non-ok response from fetch', async () => {
            // Arrange
            const originalEnv = process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL;
            process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL = mockServiceUrl;
            const messageString = JSON.stringify(mockBroadcastMessage);
            const mockResponse = { ok: false, status: 500, statusText: 'Internal Server Error' };
            fetchMock.mockResolvedValue(mockResponse as Response);

            // Act
            await handler.handleMessage(messageString);

            // Assert
            expect(consoleLogSpy).toHaveBeenCalledWith(mockBroadcastMessage);
            expect(fetchMock).toHaveBeenCalledWith(mockServiceUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(mockBroadcastMessage),
            });
            expect(consoleLogSpy).toHaveBeenCalledWith(mockResponse);

            // Cleanup
            process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL = originalEnv;
        });

        it('should use correct environment variable', async () => {
            // Arrange
            const originalEnv = process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL;
            const customUrl = 'http://custom-service:8080/broadcast';
            process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL = customUrl;
            const messageString = JSON.stringify(mockBroadcastMessage);
            const mockResponse = { ok: true, status: 200 };
            fetchMock.mockResolvedValue(mockResponse as Response);

            // Act
            await handler.handleMessage(messageString);

            // Assert
            expect(fetchMock).toHaveBeenCalledWith(customUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(mockBroadcastMessage),
            });

            // Cleanup
            process.env.LOCALSTACK_WEBSOCKET_CONNECT_SERVICE_URL = originalEnv;
        });
    });
});
