import { JwtValidationService } from '@auth-guard-lib';
import { BroadcastMessageDto, WebSocketConnectionDto } from '@dto';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { WebsocketConnectionDatabaseServiceAbstract } from '@websocket-connection-database-service';
import { AwsConnectionHandler } from './aws.connection.handler';

describe('AwsConnectionHandler', () => {
    let handler: AwsConnectionHandler;
    let messageQueueService: jest.Mocked<MessageQueueServiceAbstract>;
    let configService: jest.Mocked<ConfigService>;
    let jwtValidationService: jest.Mocked<JwtValidationService>;
    let websocketConnectionDatabaseService: jest.Mocked<WebsocketConnectionDatabaseServiceAbstract>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AwsConnectionHandler,
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
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn(),
                    },
                },
                {
                    provide: JwtValidationService,
                    useValue: {
                        extractTokenFromEvent: jest.fn(),
                        validateToken: jest.fn(),
                    },
                },
            ],
        }).compile();

        handler = module.get<AwsConnectionHandler>(AwsConnectionHandler);
        messageQueueService = module.get('MessageQueueAwsLibService') as jest.Mocked<MessageQueueServiceAbstract>;
        websocketConnectionDatabaseService = module.get(
            'WebsocketConnectionDatabaseService'
        ) as jest.Mocked<WebsocketConnectionDatabaseServiceAbstract>;
        configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
        jwtValidationService = module.get(JwtValidationService) as jest.Mocked<JwtValidationService>;

        // Mock the logger
        jest.spyOn(Logger.prototype, 'log').mockImplementation();
        jest.spyOn(Logger.prototype, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
        delete process.env['BYPASS_AUTH'];
    });

    it('should be defined', () => {
        expect(handler).toBeDefined();
    });

    describe('handleMessage', () => {
        const mockValidUser = {
            email: 'test@example.com',
            sub: 'user-123',
            groups: ['admin', 'user'],
        };

        it('should handle WebSocket connection successfully with valid token', async () => {
            const mockEvent = {
                requestContext: {
                    connectionId: 'test-connection-123',
                },
            };

            const expectedSqsUrl = 'https://sqs.us-east-1.amazonaws.com/123456789/websocket-messages';
            const mockToken = 'valid-jwt-token';

            configService.get.mockReturnValue(expectedSqsUrl);
            jwtValidationService.extractTokenFromEvent.mockReturnValue(mockToken);
            jwtValidationService.validateToken.mockResolvedValue(mockValidUser);
            messageQueueService.sendMessageToSQS.mockResolvedValue(undefined);
            websocketConnectionDatabaseService.createRecord.mockResolvedValue(undefined);

            const result = await handler.handleMessage(mockEvent);

            const expectedBroadcastMessage: BroadcastMessageDto = {
                connectionId: 'test-connection-123',
                action: 'sendMessage',
                message: 'CONNECTED',
                broadcastToAll: false,
            };

            const expectedConnectionRecord: WebSocketConnectionDto = {
                connectionId: 'test-connection-123',
                userEmail: 'test@example.com',
                connectedAt: expect.any(String),
            };

            expect(jwtValidationService.extractTokenFromEvent).toHaveBeenCalledWith(mockEvent);
            expect(jwtValidationService.validateToken).toHaveBeenCalledWith(mockToken);
            expect(configService.get).toHaveBeenCalledWith('WEBSOCKET_MESSAGE_SQS');
            expect(messageQueueService.sendMessageToSQS).toHaveBeenCalledWith(
                expectedSqsUrl,
                JSON.stringify(expectedBroadcastMessage)
            );
            expect(websocketConnectionDatabaseService.createRecord).toHaveBeenCalledWith(expectedConnectionRecord);
            expect(result).toEqual({
                statusCode: 200,
                body: JSON.stringify({ message: 'Connected successfully' }),
            });
        });

        it('should handle WebSocket connection successfully with bypass auth enabled', async () => {
            process.env['BYPASS_AUTH'] = 'ENABLED';

            const mockEvent = {
                requestContext: {
                    connectionId: 'test-connection-123',
                },
            };

            const expectedSqsUrl = 'https://sqs.us-east-1.amazonaws.com/123456789/websocket-messages';

            configService.get.mockReturnValue(expectedSqsUrl);
            messageQueueService.sendMessageToSQS.mockResolvedValue(undefined);
            websocketConnectionDatabaseService.createRecord.mockResolvedValue(undefined);

            const result = await handler.handleMessage(mockEvent);

            const expectedBroadcastMessage: BroadcastMessageDto = {
                connectionId: 'test-connection-123',
                action: 'sendMessage',
                message: 'CONNECTED',
                broadcastToAll: false,
            };

            const expectedConnectionRecord: WebSocketConnectionDto = {
                connectionId: 'test-connection-123',
                userEmail: 'admin@old.st',
                connectedAt: expect.any(String),
            };

            expect(jwtValidationService.extractTokenFromEvent).not.toHaveBeenCalled();
            expect(jwtValidationService.validateToken).not.toHaveBeenCalled();
            expect(configService.get).toHaveBeenCalledWith('WEBSOCKET_MESSAGE_SQS');
            expect(messageQueueService.sendMessageToSQS).toHaveBeenCalledWith(
                expectedSqsUrl,
                JSON.stringify(expectedBroadcastMessage)
            );
            expect(websocketConnectionDatabaseService.createRecord).toHaveBeenCalledWith(expectedConnectionRecord);
            expect(result).toEqual({
                statusCode: 200,
                body: JSON.stringify({ message: 'Connected successfully' }),
            });
        });

        it('should handle missing connectionId gracefully', async () => {
            const mockEvent = {
                requestContext: {},
            };

            const result = await handler.handleMessage(mockEvent);

            expect(messageQueueService.sendMessageToSQS).not.toHaveBeenCalled();
            expect(websocketConnectionDatabaseService.createRecord).not.toHaveBeenCalled();
            expect(result).toEqual({
                statusCode: 401,
                body: JSON.stringify({ message: 'Invalid connection request' }),
            });
        });

        it('should handle missing requestContext gracefully', async () => {
            const mockEvent = {};

            const result = await handler.handleMessage(mockEvent);

            expect(messageQueueService.sendMessageToSQS).not.toHaveBeenCalled();
            expect(websocketConnectionDatabaseService.createRecord).not.toHaveBeenCalled();
            expect(result).toEqual({
                statusCode: 401,
                body: JSON.stringify({ message: 'Invalid connection request' }),
            });
        });

        it('should return error when no token provided and auth not bypassed', async () => {
            const mockEvent = {
                requestContext: {
                    connectionId: 'test-connection-123',
                },
            };

            jwtValidationService.extractTokenFromEvent.mockReturnValue(null);

            const result = await handler.handleMessage(mockEvent);

            expect(jwtValidationService.extractTokenFromEvent).toHaveBeenCalledWith(mockEvent);
            expect(messageQueueService.sendMessageToSQS).not.toHaveBeenCalled();
            expect(websocketConnectionDatabaseService.createRecord).not.toHaveBeenCalled();
            expect(result).toEqual({
                statusCode: 401,
                body: JSON.stringify({ message: 'Authorization token required' }),
            });
        });

        it('should return error when token validation fails', async () => {
            const mockEvent = {
                requestContext: {
                    connectionId: 'test-connection-123',
                },
            };

            const mockToken = 'invalid-jwt-token';
            const validationError = new Error('Token validation failed');

            jwtValidationService.extractTokenFromEvent.mockReturnValue(mockToken);
            jwtValidationService.validateToken.mockRejectedValue(validationError);

            const result = await handler.handleMessage(mockEvent);

            expect(jwtValidationService.extractTokenFromEvent).toHaveBeenCalledWith(mockEvent);
            expect(jwtValidationService.validateToken).toHaveBeenCalledWith(mockToken);
            expect(messageQueueService.sendMessageToSQS).not.toHaveBeenCalled();
            expect(websocketConnectionDatabaseService.createRecord).not.toHaveBeenCalled();
            expect(result).toEqual({
                statusCode: 401,
                body: JSON.stringify({ message: 'Authentication failed' }),
            });
        });

        it('should handle missing WEBSOCKET_MESSAGE_SQS configuration', async () => {
            const mockEvent = {
                requestContext: {
                    connectionId: 'test-connection-123',
                },
            };

            const mockToken = 'valid-jwt-token';

            configService.get.mockReturnValue(undefined);
            jwtValidationService.extractTokenFromEvent.mockReturnValue(mockToken);
            jwtValidationService.validateToken.mockResolvedValue(mockValidUser);
            websocketConnectionDatabaseService.createRecord.mockResolvedValue(undefined);

            const result = await handler.handleMessage(mockEvent);

            expect(configService.get).toHaveBeenCalledWith('WEBSOCKET_MESSAGE_SQS');
            expect(messageQueueService.sendMessageToSQS).not.toHaveBeenCalled();
            expect(websocketConnectionDatabaseService.createRecord).toHaveBeenCalled();
            expect(result).toEqual({
                statusCode: 200,
                body: JSON.stringify({ message: 'Connected successfully' }),
            });
        });

        it('should handle database service error gracefully', async () => {
            const mockEvent = {
                requestContext: {
                    connectionId: 'test-connection-123',
                },
            };

            const mockToken = 'valid-jwt-token';
            const expectedSqsUrl = 'https://sqs.us-east-1.amazonaws.com/123456789/websocket-messages';
            const databaseError = new Error('Database connection failed');

            configService.get.mockReturnValue(expectedSqsUrl);
            jwtValidationService.extractTokenFromEvent.mockReturnValue(mockToken);
            jwtValidationService.validateToken.mockResolvedValue(mockValidUser);
            messageQueueService.sendMessageToSQS.mockResolvedValue(undefined);
            websocketConnectionDatabaseService.createRecord.mockRejectedValue(databaseError);

            const result = await handler.handleMessage(mockEvent);
            expect(result).toEqual({
                statusCode: 401,
                body: JSON.stringify({ message: 'Authentication failed' }),
            });
        });

        it('should handle message queue service error gracefully', async () => {
            const mockEvent = {
                requestContext: {
                    connectionId: 'test-connection-123',
                },
            };

            const mockToken = 'valid-jwt-token';
            const expectedSqsUrl = 'https://sqs.us-east-1.amazonaws.com/123456789/websocket-messages';
            const sqsError = new Error('SQS send failed');

            configService.get.mockReturnValue(expectedSqsUrl);
            jwtValidationService.extractTokenFromEvent.mockReturnValue(mockToken);
            jwtValidationService.validateToken.mockResolvedValue(mockValidUser);
            messageQueueService.sendMessageToSQS.mockRejectedValue(sqsError);
            websocketConnectionDatabaseService.createRecord.mockResolvedValue(undefined);

            const result = await handler.handleMessage(mockEvent);
            expect(result).toEqual({
                statusCode: 401,
                body: JSON.stringify({ message: 'Authentication failed' }),
            });
        });

        it('should log event details and user authentication', async () => {
            const mockEvent = {
                requestContext: {
                    connectionId: 'test-connection-123',
                },
                body: 'test-body',
            };

            const expectedSqsUrl = 'https://sqs.us-east-1.amazonaws.com/123456789/websocket-messages';
            const mockToken = 'valid-jwt-token';

            configService.get.mockReturnValue(expectedSqsUrl);
            jwtValidationService.extractTokenFromEvent.mockReturnValue(mockToken);
            jwtValidationService.validateToken.mockResolvedValue(mockValidUser);
            messageQueueService.sendMessageToSQS.mockResolvedValue(undefined);
            websocketConnectionDatabaseService.createRecord.mockResolvedValue(undefined);

            await handler.handleMessage(mockEvent);
        });
    });
});
