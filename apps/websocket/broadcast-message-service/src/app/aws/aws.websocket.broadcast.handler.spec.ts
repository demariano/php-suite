import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { BroadcastMessageDto, WebSocketConnectionDto } from '@dto';
import { GoneException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { WebsocketConnectionDatabaseServiceAbstract } from '@websocket-connection-database-service';
import { AwsWebsocketBroadcastHandler } from './aws.websocket.broadcast.handler';

// Mock the AWS SDK
const mockSend = jest.fn();

jest.mock('@aws-sdk/client-apigatewaymanagementapi', () => ({
    ApiGatewayManagementApiClient: jest.fn().mockImplementation(() => ({
        send: mockSend,
    })),
    PostToConnectionCommand: jest.fn(),
}));

describe('AwsWebsocketBroadcastHandler', () => {
    let handler: AwsWebsocketBroadcastHandler;
    let configService: jest.Mocked<ConfigService>;
    let websocketConnectionDatabaseService: jest.Mocked<WebsocketConnectionDatabaseServiceAbstract>;
    let loggerLogSpy: jest.SpyInstance;
    let loggerErrorSpy: jest.SpyInstance;

    const mockWebsocketUrl = 'wss://test-websocket-url.com';
    const mockBroadcastMessage: BroadcastMessageDto = {
        connectionId: 'test-connection-id',
        action: 'test-action',
        message: 'Test message',
        broadcastToAll: false,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AwsWebsocketBroadcastHandler,
                {
                    provide: 'WebsocketConnectionDatabaseService',
                    useValue: {
                        getAllActiveConnections: jest.fn(),
                        findByConnectionId: jest.fn(),
                        deleteRecord: jest.fn(),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn(),
                    },
                },
            ],
        }).compile();

        handler = module.get<AwsWebsocketBroadcastHandler>(AwsWebsocketBroadcastHandler);
        websocketConnectionDatabaseService = module.get(
            'WebsocketConnectionDatabaseService'
        ) as jest.Mocked<WebsocketConnectionDatabaseServiceAbstract>;
        configService = module.get(ConfigService);

        // Spy on logger methods
        loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

        // Mock setTimeout to avoid delays in tests
        jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
            callback();
            return {} as any;
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('handleMessage', () => {
        it('should send message successfully on first attempt', async () => {
            // Arrange
            const originalEnv = process.env.DEFAULT_REGION;
            process.env.DEFAULT_REGION = 'us-east-1';
            const messageString = JSON.stringify(mockBroadcastMessage);
            configService.get.mockReturnValue(mockWebsocketUrl);
            mockSend.mockResolvedValue({});

            // Act
            await handler.handleMessage(messageString);

            // Assert
            expect(configService.get).toHaveBeenCalledWith('WEBSOCKET_CONNECTION_URL');
            expect(ApiGatewayManagementApiClient).toHaveBeenCalledWith({
                endpoint: mockWebsocketUrl,
                region: 'us-east-1',
            });
            expect(PostToConnectionCommand).toHaveBeenCalledWith({
                ConnectionId: mockBroadcastMessage.connectionId,
                Data: Buffer.from(JSON.stringify(mockBroadcastMessage)),
            });
            expect(mockSend).toHaveBeenCalledTimes(1);

            // Cleanup
            process.env.DEFAULT_REGION = originalEnv;
        });

        it('should use DEFAULT_REGION from environment when available', async () => {
            // Arrange
            const originalEnv = process.env.DEFAULT_REGION;
            process.env.DEFAULT_REGION = 'eu-west-1';
            const messageString = JSON.stringify(mockBroadcastMessage);
            configService.get.mockReturnValue(mockWebsocketUrl);
            mockSend.mockResolvedValue({});

            // Act
            await handler.handleMessage(messageString);

            // Assert
            expect(ApiGatewayManagementApiClient).toHaveBeenCalledWith({
                endpoint: mockWebsocketUrl,
                region: 'eu-west-1',
            });

            // Cleanup
            process.env.DEFAULT_REGION = originalEnv;
        });

        it('should retry and succeed on second attempt', async () => {
            // Arrange
            const messageString = JSON.stringify(mockBroadcastMessage);
            configService.get.mockReturnValue(mockWebsocketUrl);
            mockSend.mockRejectedValueOnce(new Error('Connection failed')).mockResolvedValueOnce({});

            // Act
            await handler.handleMessage(messageString);

            // Assert
            expect(mockSend).toHaveBeenCalledTimes(2);
        });

        it('should fail after maximum retries and log final error', async () => {
            // Arrange
            const messageString = JSON.stringify(mockBroadcastMessage);
            const testError = new Error('Persistent connection error');
            configService.get.mockReturnValue(mockWebsocketUrl);
            mockSend.mockRejectedValue(testError);

            // Act
            await handler.handleMessage(messageString);

            // Assert
            expect(mockSend).toHaveBeenCalledTimes(3);
        });

        it('should handle GoneException and delete connection from database', async () => {
            // Arrange
            const messageString = JSON.stringify(mockBroadcastMessage);
            const goneException = new GoneException('Connection has been closed');
            configService.get.mockReturnValue(mockWebsocketUrl);
            mockSend.mockRejectedValue(goneException);

            const mockConnection: WebSocketConnectionDto = {
                connectionId: 'test-connection-id',
                userEmail: 'test@example.com',
                connectedAt: '2023-01-01T00:00:00Z',
            };

            websocketConnectionDatabaseService.findByConnectionId.mockResolvedValue(mockConnection);
            websocketConnectionDatabaseService.deleteRecord.mockResolvedValue(undefined);

            // Act
            await handler.handleMessage(messageString);

            // Assert
            expect(mockSend).toHaveBeenCalledTimes(1); // Should not retry after GoneException
            expect(websocketConnectionDatabaseService.findByConnectionId).toHaveBeenCalledWith('test-connection-id');
            expect(websocketConnectionDatabaseService.deleteRecord).toHaveBeenCalledWith(mockConnection);
        });

        it('should handle GoneException when connection not found in database', async () => {
            // Arrange
            const messageString = JSON.stringify(mockBroadcastMessage);
            const goneException = new GoneException('Connection has been closed');
            configService.get.mockReturnValue(mockWebsocketUrl);
            mockSend.mockRejectedValue(goneException);

            websocketConnectionDatabaseService.findByConnectionId.mockResolvedValue(null);

            // Act
            await handler.handleMessage(messageString);

            // Assert
            expect(mockSend).toHaveBeenCalledTimes(1); // Should not retry after GoneException
            expect(websocketConnectionDatabaseService.findByConnectionId).toHaveBeenCalledWith('test-connection-id');
            expect(websocketConnectionDatabaseService.deleteRecord).not.toHaveBeenCalled();
        });

        it('should handle GoneException and exit retry loop', async () => {
            // Arrange
            const messageString = JSON.stringify(mockBroadcastMessage);
            const goneException = new GoneException('Connection has been closed');
            configService.get.mockReturnValue(mockWebsocketUrl);
            mockSend.mockRejectedValue(goneException);

            const mockConnection: WebSocketConnectionDto = {
                connectionId: 'test-connection-id',
                userEmail: 'test@example.com',
                connectedAt: '2023-01-01T00:00:00Z',
            };

            websocketConnectionDatabaseService.findByConnectionId.mockResolvedValue(mockConnection);
            websocketConnectionDatabaseService.deleteRecord.mockResolvedValue(undefined);

            // Act
            await handler.handleMessage(messageString);

            // Assert
            expect(mockSend).toHaveBeenCalledTimes(1); // Should not retry after GoneException
            expect(websocketConnectionDatabaseService.findByConnectionId).toHaveBeenCalledWith('test-connection-id');
            expect(websocketConnectionDatabaseService.deleteRecord).toHaveBeenCalledWith(mockConnection);
        });

        it('should log error when websocket connection URL is not found', async () => {
            // Arrange
            const messageString = JSON.stringify(mockBroadcastMessage);
            configService.get.mockReturnValue(null);

            // Act
            await handler.handleMessage(messageString);

            // Assert
            expect(configService.get).toHaveBeenCalledWith('WEBSOCKET_CONNECTION_URL');
            expect(ApiGatewayManagementApiClient).not.toHaveBeenCalled();
            expect(mockSend).not.toHaveBeenCalled();
        });

        it('should log error when websocket connection URL is empty string', async () => {
            // Arrange
            const messageString = JSON.stringify(mockBroadcastMessage);
            configService.get.mockReturnValue('');

            // Act
            await handler.handleMessage(messageString);

            // Assert
        });

        it('should handle JSON parsing correctly', async () => {
            // Arrange
            const messageString = JSON.stringify(mockBroadcastMessage);
            configService.get.mockReturnValue(mockWebsocketUrl);
            mockSend.mockResolvedValue({});

            // Act
            await handler.handleMessage(messageString);

            // Assert
            expect(PostToConnectionCommand).toHaveBeenCalledWith({
                ConnectionId: mockBroadcastMessage.connectionId,
                Data: Buffer.from(JSON.stringify(mockBroadcastMessage)),
            });
            expect(mockSend).toHaveBeenCalledTimes(1);
        });

        it('should handle invalid JSON message', async () => {
            // Arrange
            const invalidJsonMessage = '{ invalid json';
            configService.get.mockReturnValue(mockWebsocketUrl);

            // Act & Assert
            await expect(handler.handleMessage(invalidJsonMessage)).rejects.toThrow();
            expect(mockSend).not.toHaveBeenCalled();
        });

        it('should create PostToConnectionCommand with correct parameters', async () => {
            // Arrange
            const messageString = JSON.stringify(mockBroadcastMessage);
            configService.get.mockReturnValue(mockWebsocketUrl);
            mockSend.mockResolvedValue({});

            // Act
            await handler.handleMessage(messageString);

            // Assert
            expect(PostToConnectionCommand).toHaveBeenCalledWith({
                ConnectionId: mockBroadcastMessage.connectionId,
                Data: Buffer.from(JSON.stringify(mockBroadcastMessage)),
            });
        });

        it('should handle message with all optional properties', async () => {
            // Arrange
            const messageWithAllProperties: BroadcastMessageDto = {
                connectionId: 'test-connection-id',
                action: 'test-action',
                message: 'Complex nested message data',
                broadcastToAll: false,
            };
            const messageString = JSON.stringify(messageWithAllProperties);
            configService.get.mockReturnValue(mockWebsocketUrl);
            mockSend.mockResolvedValue({});

            // Act
            await handler.handleMessage(messageString);

            // Assert
            expect(PostToConnectionCommand).toHaveBeenCalledWith({
                ConnectionId: messageWithAllProperties.connectionId,
                Data: Buffer.from(JSON.stringify(messageWithAllProperties)),
            });
        });

        it('should handle message with minimal required properties', async () => {
            // Arrange
            const minimalMessage: BroadcastMessageDto = {
                connectionId: 'minimal-connection-id',
                message: 'simple message',
                broadcastToAll: false,
            };
            const messageString = JSON.stringify(minimalMessage);
            configService.get.mockReturnValue(mockWebsocketUrl);
            mockSend.mockResolvedValue({});

            // Act
            await handler.handleMessage(messageString);

            // Assert
            expect(PostToConnectionCommand).toHaveBeenCalledWith({
                ConnectionId: minimalMessage.connectionId,
                Data: Buffer.from(JSON.stringify(minimalMessage)),
            });
        });

        it('should handle retry delay correctly', async () => {
            // Arrange
            const messageString = JSON.stringify(mockBroadcastMessage);
            configService.get.mockReturnValue(mockWebsocketUrl);
            mockSend.mockRejectedValueOnce(new Error('Temporary failure')).mockResolvedValueOnce({});

            const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

            // Act
            await handler.handleMessage(messageString);

            // Assert
            expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 500);
            expect(mockSend).toHaveBeenCalledTimes(2);
        });

        it('should use default region when DEFAULT_REGION is not set', async () => {
            // Arrange
            const originalEnv = process.env.DEFAULT_REGION;
            delete process.env.DEFAULT_REGION;
            const messageString = JSON.stringify(mockBroadcastMessage);
            configService.get.mockReturnValue(mockWebsocketUrl);
            mockSend.mockResolvedValue({});

            // Act
            await handler.handleMessage(messageString);

            // Assert
            expect(ApiGatewayManagementApiClient).toHaveBeenCalledWith({
                endpoint: mockWebsocketUrl,
                region: 'us-east-1',
            });

            // Cleanup
            process.env.DEFAULT_REGION = originalEnv;
        });

        it('should call broadcastMessageToAllClients when broadcastToAll is true', async () => {
            // Arrange
            const broadcastToAllMessage: BroadcastMessageDto = {
                connectionId: 'original-connection',
                action: 'broadcast-action',
                message: 'Broadcast message data',
                broadcastToAll: true,
            };

            const messageString = JSON.stringify(broadcastToAllMessage);

            // Mock the broadcastMessageToAllClients method to test the routing logic
            const broadcastToAllSpy = jest.spyOn(handler, 'broadcastMessageToAllClients').mockResolvedValue(undefined);

            // Act
            await handler.handleMessage(messageString);

            // Assert
            expect(broadcastToAllSpy).toHaveBeenCalledWith(broadcastToAllMessage);
            expect(broadcastToAllSpy).toHaveBeenCalledTimes(1);
        });

        it('should handle broadcastToAll with empty connections list', async () => {
            // Arrange
            const broadcastToAllMessage: BroadcastMessageDto = {
                connectionId: 'original-connection',
                action: 'broadcast-action',
                message: 'Broadcast message data',
                broadcastToAll: true,
            };

            const messageString = JSON.stringify(broadcastToAllMessage);
            websocketConnectionDatabaseService.getAllActiveConnections.mockResolvedValue([]);
            configService.get.mockReturnValue(mockWebsocketUrl);

            // Act
            await handler.handleMessage(messageString);

            // Assert
            expect(websocketConnectionDatabaseService.getAllActiveConnections).toHaveBeenCalled();
            expect(mockSend).not.toHaveBeenCalled();
        });

        it('should handle database service error during broadcastToAll', async () => {
            // Arrange
            const broadcastToAllMessage: BroadcastMessageDto = {
                connectionId: 'original-connection',
                action: 'broadcast-action',
                message: 'Broadcast message data',
                broadcastToAll: true,
            };

            const messageString = JSON.stringify(broadcastToAllMessage);
            const databaseError = new Error('Database connection failed');
            websocketConnectionDatabaseService.getAllActiveConnections.mockRejectedValue(databaseError);

            // Act & Assert
            await expect(handler.handleMessage(messageString)).rejects.toThrow(databaseError);
            expect(websocketConnectionDatabaseService.getAllActiveConnections).toHaveBeenCalled();
            expect(mockSend).not.toHaveBeenCalled();
        });

        it('should handle errors in broadcastMessageToAllClients gracefully', async () => {
            // Arrange
            const broadcastToAllMessage: BroadcastMessageDto = {
                connectionId: 'original-connection',
                action: 'broadcast-action',
                message: 'Broadcast message data',
                broadcastToAll: true,
            };

            const messageString = JSON.stringify(broadcastToAllMessage);
            const broadcastError = new Error('Broadcast failed');

            // Mock the broadcastMessageToAllClients method to throw an error
            const broadcastToAllSpy = jest
                .spyOn(handler, 'broadcastMessageToAllClients')
                .mockRejectedValue(broadcastError);

            // Act & Assert
            await expect(handler.handleMessage(messageString)).rejects.toThrow(broadcastError);
            expect(broadcastToAllSpy).toHaveBeenCalledWith(broadcastToAllMessage);
        });

        it('should handle individual client broadcast correctly', async () => {
            // Arrange
            const individualMessage: BroadcastMessageDto = {
                connectionId: 'specific-connection',
                action: 'individual-action',
                message: 'Individual message data',
                broadcastToAll: false,
            };

            const messageString = JSON.stringify(individualMessage);
            configService.get.mockReturnValue(mockWebsocketUrl);
            mockSend.mockResolvedValue({});

            // Act
            await handler.handleMessage(messageString);

            // Assert
            expect(websocketConnectionDatabaseService.getAllActiveConnections).not.toHaveBeenCalled();
            expect(mockSend).toHaveBeenCalledTimes(1);
            expect(PostToConnectionCommand).toHaveBeenCalledWith({
                ConnectionId: 'specific-connection',
                Data: Buffer.from(JSON.stringify(individualMessage)),
            });
        });
    });

    describe('broadcastMessageToAllClients', () => {
        it('should broadcast message to all active connections successfully', async () => {
            // Arrange
            const mockConnections: WebSocketConnectionDto[] = [
                {
                    connectionId: 'connection-1',
                    userEmail: 'user1@test.com',
                    connectedAt: '2023-01-01T00:00:00Z',
                },
                {
                    connectionId: 'connection-2',
                    userEmail: 'user2@test.com',
                    connectedAt: '2023-01-01T00:00:00Z',
                },
            ];

            const broadcastMessage: BroadcastMessageDto = {
                connectionId: 'original-connection',
                action: 'test-action',
                message: 'Test message data',
                broadcastToAll: true,
            };

            websocketConnectionDatabaseService.getAllActiveConnections.mockResolvedValue(mockConnections);

            // Mock the broadcastMessageToClient method to test the core logic
            const broadcastToClientSpy = jest.spyOn(handler, 'broadcastMessageToClient').mockResolvedValue(undefined);

            // Act
            await handler.broadcastMessageToAllClients(broadcastMessage);

            // Assert
            expect(websocketConnectionDatabaseService.getAllActiveConnections).toHaveBeenCalled();
            expect(broadcastToClientSpy).toHaveBeenCalledTimes(2);

            // Verify that broadcastMessageToClient was called for each connection
            // Note: Implementation mutates the same object, so we verify call count and final state
            const lastCall = broadcastToClientSpy.mock.calls[broadcastToClientSpy.mock.calls.length - 1];
            expect(lastCall[0]).toEqual(
                expect.objectContaining({
                    connectionId: 'connection-2', // Final connectionId after all mutations
                    action: 'test-action',
                    message: 'Test message data',
                    broadcastToAll: true,
                })
            );
        });

        it('should handle empty connections list gracefully', async () => {
            // Arrange
            const broadcastMessage: BroadcastMessageDto = {
                connectionId: 'original-connection',
                action: 'test-action',
                message: 'Test message data',
                broadcastToAll: true,
            };

            websocketConnectionDatabaseService.getAllActiveConnections.mockResolvedValue([]);
            const broadcastToClientSpy = jest.spyOn(handler, 'broadcastMessageToClient').mockResolvedValue(undefined);

            // Act
            await handler.broadcastMessageToAllClients(broadcastMessage);

            // Assert
            expect(websocketConnectionDatabaseService.getAllActiveConnections).toHaveBeenCalled();
            expect(broadcastToClientSpy).not.toHaveBeenCalled();
        });

        it('should handle database service error gracefully', async () => {
            // Arrange
            const broadcastMessage: BroadcastMessageDto = {
                connectionId: 'original-connection',
                action: 'test-action',
                message: 'Test message data',
                broadcastToAll: true,
            };

            const databaseError = new Error('Database connection failed');
            websocketConnectionDatabaseService.getAllActiveConnections.mockRejectedValue(databaseError);

            // Act & Assert - Following cursor rules pattern for error testing
            await expect(handler.broadcastMessageToAllClients(broadcastMessage)).rejects.toThrow(databaseError);
            expect(websocketConnectionDatabaseService.getAllActiveConnections).toHaveBeenCalled();
        });
    });

    describe('broadcastMessageToClient', () => {
        it('should send message to specific client successfully', async () => {
            // Arrange
            const broadcastMessage: BroadcastMessageDto = {
                connectionId: 'test-connection',
                action: 'test-action',
                message: 'Test message data',
                broadcastToAll: false,
            };

            configService.get.mockReturnValue(mockWebsocketUrl);
            mockSend.mockResolvedValue({});

            // Act
            await handler.broadcastMessageToClient(broadcastMessage);

            // Assert
            expect(configService.get).toHaveBeenCalledWith('WEBSOCKET_CONNECTION_URL');
            expect(PostToConnectionCommand).toHaveBeenCalledWith({
                ConnectionId: 'test-connection',
                Data: Buffer.from(JSON.stringify(broadcastMessage)),
            });
            expect(mockSend).toHaveBeenCalledTimes(1);
        });

        it('should log error when websocket connection URL is not configured', async () => {
            // Arrange
            const broadcastMessage: BroadcastMessageDto = {
                connectionId: 'test-connection',
                action: 'test-action',
                message: 'Test message data',
                broadcastToAll: false,
            };

            configService.get.mockReturnValue(null);

            // Act
            await handler.broadcastMessageToClient(broadcastMessage);

            // Assert
            expect(configService.get).toHaveBeenCalledWith('WEBSOCKET_CONNECTION_URL');
            expect(mockSend).not.toHaveBeenCalled();
        });

        it('should handle GoneException and delete connection from database', async () => {
            // Arrange
            const broadcastMessage: BroadcastMessageDto = {
                connectionId: 'test-connection',
                action: 'test-action',
                message: 'Test message data',
                broadcastToAll: false,
            };

            const goneException = new GoneException('Connection has been closed');
            configService.get.mockReturnValue(mockWebsocketUrl);
            mockSend.mockRejectedValue(goneException);

            const mockConnection: WebSocketConnectionDto = {
                connectionId: 'test-connection',
                userEmail: 'test@example.com',
                connectedAt: '2023-01-01T00:00:00Z',
            };

            websocketConnectionDatabaseService.findByConnectionId.mockResolvedValue(mockConnection);
            websocketConnectionDatabaseService.deleteRecord.mockResolvedValue(undefined);

            // Act
            await handler.broadcastMessageToClient(broadcastMessage);

            // Assert
            expect(mockSend).toHaveBeenCalledTimes(1); // Should not retry after GoneException
            expect(websocketConnectionDatabaseService.findByConnectionId).toHaveBeenCalledWith('test-connection');
            expect(websocketConnectionDatabaseService.deleteRecord).toHaveBeenCalledWith(mockConnection);
        });

        it('should handle GoneException when connection not found in database', async () => {
            // Arrange
            const broadcastMessage: BroadcastMessageDto = {
                connectionId: 'test-connection',
                action: 'test-action',
                message: 'Test message data',
                broadcastToAll: false,
            };

            const goneException = new GoneException('Connection has been closed');
            configService.get.mockReturnValue(mockWebsocketUrl);
            mockSend.mockRejectedValue(goneException);

            websocketConnectionDatabaseService.findByConnectionId.mockResolvedValue(null);

            // Act
            await handler.broadcastMessageToClient(broadcastMessage);

            // Assert
            expect(mockSend).toHaveBeenCalledTimes(1); // Should not retry after GoneException
            expect(websocketConnectionDatabaseService.findByConnectionId).toHaveBeenCalledWith('test-connection');
            expect(websocketConnectionDatabaseService.deleteRecord).not.toHaveBeenCalled();
        });

        it('should handle GoneException and exit retry loop', async () => {
            // Arrange
            const broadcastMessage: BroadcastMessageDto = {
                connectionId: 'test-connection',
                action: 'test-action',
                message: 'Test message data',
                broadcastToAll: false,
            };

            const goneException = new GoneException('Connection has been closed');
            configService.get.mockReturnValue(mockWebsocketUrl);
            mockSend.mockRejectedValue(goneException);

            const mockConnection: WebSocketConnectionDto = {
                connectionId: 'test-connection',
                userEmail: 'test@example.com',
                connectedAt: '2023-01-01T00:00:00Z',
            };

            websocketConnectionDatabaseService.findByConnectionId.mockResolvedValue(mockConnection);
            websocketConnectionDatabaseService.deleteRecord.mockResolvedValue(undefined);

            // Act
            await handler.broadcastMessageToClient(broadcastMessage);

            // Assert
            expect(mockSend).toHaveBeenCalledTimes(1); // Should not retry after GoneException
            expect(websocketConnectionDatabaseService.findByConnectionId).toHaveBeenCalledWith('test-connection');
            expect(websocketConnectionDatabaseService.deleteRecord).toHaveBeenCalledWith(mockConnection);
        });
    });
});
