import { BroadcastMessageDto, WebSocketConnectionDto } from '@dto';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { WebsocketConnectionDatabaseServiceAbstract } from '@websocket-connection-database-service';
import { Server, Socket } from 'socket.io';
import { LocalWebsocketService } from './local.websocket.service';

// Mock Socket.IO types
const mockSocket = {
    id: 'test-socket-123',
    emit: jest.fn(),
    on: jest.fn(),
    disconnect: jest.fn(),
} as unknown as Socket;

const mockServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    sockets: {
        emit: jest.fn(),
    },
} as unknown as Server;

describe('LocalWebsocketService', () => {
    let service: LocalWebsocketService;
    let messageQueueService: jest.Mocked<MessageQueueServiceAbstract>;
    let configService: jest.Mocked<ConfigService>;
    let websocketConnectionDatabaseService: jest.Mocked<WebsocketConnectionDatabaseServiceAbstract>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LocalWebsocketService,
                {
                    provide: 'MessageQueueAwsLibService',
                    useValue: {
                        sendMessageToSQS: jest.fn(),
                    },
                },
                {
                    provide: 'WebsocketConnectionDatabaseService',
                    useValue: {
                        createRecord: jest.fn(),
                        deleteRecord: jest.fn(),
                        getAllActiveConnections: jest.fn(),
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

        service = module.get<LocalWebsocketService>(LocalWebsocketService);
        messageQueueService = module.get('MessageQueueAwsLibService') as jest.Mocked<MessageQueueServiceAbstract>;
        websocketConnectionDatabaseService = module.get(
            'WebsocketConnectionDatabaseService'
        ) as jest.Mocked<WebsocketConnectionDatabaseServiceAbstract>;
        configService = module.get(ConfigService) as jest.Mocked<ConfigService>;

        // Setup server mock
        service.server = mockServer;

        // Mock the logger
        jest.spyOn(Logger.prototype, 'log').mockImplementation();
        jest.spyOn(Logger.prototype, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('handleConnection', () => {
        it('should handle client connection successfully', async () => {
            const expectedSqsUrl = 'https://sqs.us-east-1.amazonaws.com/123456789/websocket-messages';

            configService.get.mockReturnValue(expectedSqsUrl);
            messageQueueService.sendMessageToSQS.mockResolvedValue(undefined);
            websocketConnectionDatabaseService.createRecord.mockResolvedValue(undefined);

            await service.handleConnection(mockSocket, {});

            const expectedBroadcastMessage: BroadcastMessageDto = {
                connectionId: 'test-socket-123',
                action: 'sendMessage',
                message: 'CONNECTED ',
                broadcastToAll: false,
            };

            const expectedConnectionRecord: WebSocketConnectionDto = {
                connectionId: 'test-socket-123',
                userEmail: 'local-websocket-service@test.com',
                connectedAt: expect.any(String),
            };

            expect(configService.get).toHaveBeenCalledWith('WEBSOCKET_MESSAGE_SQS');
            expect(messageQueueService.sendMessageToSQS).toHaveBeenCalledWith(
                expectedSqsUrl,
                JSON.stringify(expectedBroadcastMessage)
            );
            expect(websocketConnectionDatabaseService.createRecord).toHaveBeenCalledWith(expectedConnectionRecord);
        });

        it('should handle missing WEBSOCKET_MESSAGE_SQS configuration', async () => {
            configService.get.mockReturnValue(undefined);
            websocketConnectionDatabaseService.createRecord.mockResolvedValue(undefined);
            const errorSpy = jest.spyOn(Logger.prototype, 'error');

            await service.handleConnection(mockSocket, {});

            expect(configService.get).toHaveBeenCalledWith('WEBSOCKET_MESSAGE_SQS');
            expect(errorSpy).toHaveBeenCalledWith('No websocket message sqs found');
            expect(messageQueueService.sendMessageToSQS).not.toHaveBeenCalled();
            expect(websocketConnectionDatabaseService.createRecord).toHaveBeenCalled();
        });

        it('should handle database service error gracefully', async () => {
            const expectedSqsUrl = 'https://sqs.us-east-1.amazonaws.com/123456789/websocket-messages';
            const databaseError = new Error('Database connection failed');

            configService.get.mockReturnValue(expectedSqsUrl);
            messageQueueService.sendMessageToSQS.mockResolvedValue(undefined);
            websocketConnectionDatabaseService.createRecord.mockRejectedValue(databaseError);

            // Should not throw, but will reject the promise
            await expect(service.handleConnection(mockSocket, {})).rejects.toThrow(databaseError);
        });

        it('should log connection details', async () => {
            const expectedSqsUrl = 'https://sqs.us-east-1.amazonaws.com/123456789/websocket-messages';

            configService.get.mockReturnValue(expectedSqsUrl);
            messageQueueService.sendMessageToSQS.mockResolvedValue(undefined);
            websocketConnectionDatabaseService.createRecord.mockResolvedValue(undefined);

            const logSpy = jest.spyOn(Logger.prototype, 'log');

            await service.handleConnection(mockSocket, {});

            expect(logSpy).toHaveBeenCalledWith(`Client connected: ${mockSocket.id}`);
            expect(logSpy).toHaveBeenCalledWith('Sending connection Details to client from initial connection');
        });
    });

    describe('handleDisconnect', () => {
        it('should handle client disconnection successfully', async () => {
            websocketConnectionDatabaseService.deleteRecord.mockResolvedValue(undefined);

            await service.handleDisconnect(mockSocket);

            const expectedConnectionRecord: WebSocketConnectionDto = {
                connectionId: 'test-socket-123',
                userEmail: 'local-websocket-service@test.com',
                connectedAt: expect.any(String),
            };

            expect(websocketConnectionDatabaseService.deleteRecord).toHaveBeenCalledWith(expectedConnectionRecord);
        });

        it('should handle database service error gracefully during disconnect', async () => {
            const databaseError = new Error('Database delete failed');
            websocketConnectionDatabaseService.deleteRecord.mockRejectedValue(databaseError);

            // Should not throw, but will reject the promise
            await expect(service.handleDisconnect(mockSocket)).rejects.toThrow(databaseError);
        });

        it('should log disconnection details', async () => {
            websocketConnectionDatabaseService.deleteRecord.mockResolvedValue(undefined);
            const logSpy = jest.spyOn(Logger.prototype, 'log');

            await service.handleDisconnect(mockSocket);

            expect(logSpy).toHaveBeenCalledWith(`Client disconnected: ${mockSocket.id}`);
        });
    });

    describe('emitMessageToAllClients', () => {
        it('should emit message to all connected clients successfully', async () => {
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

            const testMessage: BroadcastMessageDto = {
                action: 'sendMessage',
                connectionId: 'original-connection',
                message: 'Broadcast to all',
                broadcastToAll: true,
            };

            websocketConnectionDatabaseService.getAllActiveConnections.mockResolvedValue(mockConnections);

            await service.emitMessageToAllClients(testMessage);

            expect(websocketConnectionDatabaseService.getAllActiveConnections).toHaveBeenCalled();

            // Verify each connection received the message
            expect(mockServer.to).toHaveBeenCalledWith('connection-1');
            expect(mockServer.to).toHaveBeenCalledWith('connection-2');
            expect(mockServer.emit).toHaveBeenCalledWith(
                'local-server-message',
                JSON.stringify({
                    ...testMessage,
                    connectionId: 'connection-1',
                    action: 'sendMessage',
                })
            );
            expect(mockServer.emit).toHaveBeenCalledWith(
                'local-server-message',
                JSON.stringify({
                    ...testMessage,
                    connectionId: 'connection-2',
                    action: 'sendMessage',
                })
            );
        });

        it('should handle empty connections list gracefully', async () => {
            const testMessage: BroadcastMessageDto = {
                action: 'sendMessage',
                connectionId: 'original-connection',
                message: 'Broadcast to all',
                broadcastToAll: true,
            };

            websocketConnectionDatabaseService.getAllActiveConnections.mockResolvedValue([]);

            await service.emitMessageToAllClients(testMessage);

            expect(websocketConnectionDatabaseService.getAllActiveConnections).toHaveBeenCalled();
            expect(mockServer.to).not.toHaveBeenCalled();
            expect(mockServer.emit).not.toHaveBeenCalled();
        });

        it('should handle database service error gracefully', async () => {
            const testMessage: BroadcastMessageDto = {
                action: 'sendMessage',
                connectionId: 'original-connection',
                message: 'Broadcast to all',
                broadcastToAll: true,
            };

            const databaseError = new Error('Database query failed');
            websocketConnectionDatabaseService.getAllActiveConnections.mockRejectedValue(databaseError);

            await expect(service.emitMessageToAllClients(testMessage)).rejects.toThrow(databaseError);
        });
    });

    describe('emitMessageToClient', () => {
        it('should emit message to specific client successfully', async () => {
            const testMessage: BroadcastMessageDto = {
                action: 'sendMessage',
                connectionId: 'test-connection-123',
                message: 'Hello specific client',
                broadcastToAll: false,
            };

            await service.emitMessageToClient(testMessage);

            expect(mockServer.to).toHaveBeenCalledWith('test-connection-123');
            expect(mockServer.emit).toHaveBeenCalledWith('local-server-message', JSON.stringify(testMessage));
        });

        it('should broadcast to all clients when broadcastToAll is true', async () => {
            const mockConnections: WebSocketConnectionDto[] = [
                {
                    connectionId: 'connection-1',
                    userEmail: 'user1@test.com',
                    connectedAt: '2023-01-01T00:00:00Z',
                },
            ];

            const testMessage: BroadcastMessageDto = {
                action: 'sendMessage',
                connectionId: 'original-connection',
                message: 'Broadcast message',
                broadcastToAll: true,
            };

            websocketConnectionDatabaseService.getAllActiveConnections.mockResolvedValue(mockConnections);

            await service.emitMessageToClient(testMessage);

            expect(websocketConnectionDatabaseService.getAllActiveConnections).toHaveBeenCalled();
            expect(mockServer.to).toHaveBeenCalledWith('connection-1');
            expect(mockServer.emit).toHaveBeenCalledWith(
                'local-server-message',
                JSON.stringify({
                    ...testMessage,
                    connectionId: 'connection-1',
                    action: 'sendMessage',
                })
            );
        });

        it('should log message details', async () => {
            const testMessage: BroadcastMessageDto = {
                action: 'sendMessage',
                connectionId: 'test-connection-123',
                message: 'Hello specific client',
                broadcastToAll: false,
            };

            const logSpy = jest.spyOn(Logger.prototype, 'log');

            await service.emitMessageToClient(testMessage);

            expect(logSpy).toHaveBeenCalledWith(`Emitting message to client: ${JSON.stringify(testMessage)}`);
        });
    });

    describe('receiveMessageFromClient', () => {
        beforeEach(() => {
            // Mock fetch globally
            global.fetch = jest.fn();
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should process client message successfully', async () => {
            const testMessage: BroadcastMessageDto = {
                action: 'sendMessage',
                connectionId: 'test-connection-123',
                message: 'Message from client',
                broadcastToAll: false,
            };

            const mockServiceUrl = 'http://localhost:3000/client-message-processor';
            const mockResponse = { ok: true, status: 200 };

            configService.get.mockReturnValue(mockServiceUrl);
            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            await service.receiveMessageFromClient(testMessage);

            expect(configService.get).toHaveBeenCalledWith('LOCALSTACK_WEBSOCKET_CLIENT_MESSAGE_SERVICE_URL');
            expect(global.fetch).toHaveBeenCalledWith(mockServiceUrl, {
                method: 'POST',
                body: JSON.stringify(testMessage),
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        });

        it('should handle missing client message processor service URL', async () => {
            const testMessage: BroadcastMessageDto = {
                action: 'sendMessage',
                connectionId: 'test-connection-123',
                message: 'Message from client',
                broadcastToAll: false,
            };

            configService.get.mockReturnValue(undefined);
            const errorSpy = jest.spyOn(Logger.prototype, 'error');

            await service.receiveMessageFromClient(testMessage);

            expect(configService.get).toHaveBeenCalledWith('LOCALSTACK_WEBSOCKET_CLIENT_MESSAGE_SERVICE_URL');
            expect(errorSpy).toHaveBeenCalledWith('No client message processor service url found');
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('should handle fetch error gracefully', async () => {
            const testMessage: BroadcastMessageDto = {
                action: 'sendMessage',
                connectionId: 'test-connection-123',
                message: 'Message from client',
                broadcastToAll: false,
            };

            const mockServiceUrl = 'http://localhost:3000/client-message-processor';
            const fetchError = new Error('Network error');

            configService.get.mockReturnValue(mockServiceUrl);
            (global.fetch as jest.Mock).mockRejectedValue(fetchError);

            // Should not throw, but the promise will reject
            await expect(service.receiveMessageFromClient(testMessage)).rejects.toThrow(fetchError);
        });

        it('should log message details and response', async () => {
            const testMessage: BroadcastMessageDto = {
                action: 'sendMessage',
                connectionId: 'test-connection-123',
                message: 'Message from client',
                broadcastToAll: false,
            };

            const mockServiceUrl = 'http://localhost:3000/client-message-processor';
            const mockResponse = { ok: true, status: 200 };

            configService.get.mockReturnValue(mockServiceUrl);
            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            const logSpy = jest.spyOn(Logger.prototype, 'log');

            await service.receiveMessageFromClient(testMessage);

            expect(logSpy).toHaveBeenCalledWith(`Received message from client: ${JSON.stringify(testMessage)}`);
            expect(logSpy).toHaveBeenCalledWith(
                `Response from client message processor service: ${JSON.stringify(mockResponse)}`
            );
        });
    });
});
