import { BroadcastMessageDto } from '@dto';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
    let service: AppService;
    let messageQueueService: jest.Mocked<MessageQueueServiceAbstract>;
    let configService: jest.Mocked<ConfigService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AppService,
                {
                    provide: 'MessageQueueAwsLibService',
                    useValue: {
                        sendMessageToSQS: jest.fn(),
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

        service = module.get<AppService>(AppService);
        messageQueueService = module.get('MessageQueueAwsLibService') as jest.Mocked<MessageQueueServiceAbstract>;
        configService = module.get(ConfigService) as jest.Mocked<ConfigService>;

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

    describe('handleMessage', () => {
        it('should handle WebSocket connection successfully', async () => {
            const mockEvent = {
                requestContext: {
                    connectionId: 'test-connection-123',
                },
            };

            const expectedSqsUrl = 'https://sqs.us-east-1.amazonaws.com/123456789/websocket-messages';
            configService.get.mockReturnValue(expectedSqsUrl);
            messageQueueService.sendMessageToSQS.mockResolvedValue(undefined);

            await service.handleMessage(mockEvent);

            const expectedBroadcastMessage: BroadcastMessageDto = {
                action: 'sendMessage',
                connectionId: 'test-connection-123',
                message: 'CONNECTED ',
                broadcastToAll: false,
            };

            expect(configService.get).toHaveBeenCalledWith('WEBSOCKET_MESSAGE_SQS');
            expect(messageQueueService.sendMessageToSQS).toHaveBeenCalledWith(
                expectedSqsUrl,
                JSON.stringify(expectedBroadcastMessage)
            );
            expect(messageQueueService.sendMessageToSQS).toHaveBeenCalledTimes(1);
        });

        it('should handle missing connectionId gracefully', async () => {
            const mockEvent = {
                requestContext: {},
            };

            const errorSpy = jest.spyOn(Logger.prototype, 'error');

            await service.handleMessage(mockEvent);

            expect(errorSpy).toHaveBeenCalledWith('ConnectionId not found in event');
            expect(messageQueueService.sendMessageToSQS).not.toHaveBeenCalled();
            expect(configService.get).not.toHaveBeenCalled();
        });

        it('should handle missing requestContext gracefully', async () => {
            const mockEvent = {};

            const errorSpy = jest.spyOn(Logger.prototype, 'error');

            await service.handleMessage(mockEvent);

            expect(errorSpy).toHaveBeenCalledWith('ConnectionId not found in event');
            expect(messageQueueService.sendMessageToSQS).not.toHaveBeenCalled();
        });

        it('should handle missing WEBSOCKET_MESSAGE_SQS configuration', async () => {
            const mockEvent = {
                requestContext: {
                    connectionId: 'test-connection-123',
                },
            };

            configService.get.mockReturnValue(undefined);
            const errorSpy = jest.spyOn(Logger.prototype, 'error');

            await service.handleMessage(mockEvent);

            expect(configService.get).toHaveBeenCalledWith('WEBSOCKET_MESSAGE_SQS');
            expect(errorSpy).toHaveBeenCalledWith('No websocket message sqs found');
            expect(messageQueueService.sendMessageToSQS).not.toHaveBeenCalled();
        });

        it('should handle null WEBSOCKET_MESSAGE_SQS configuration', async () => {
            const mockEvent = {
                requestContext: {
                    connectionId: 'test-connection-123',
                },
            };

            configService.get.mockReturnValue(null);
            const errorSpy = jest.spyOn(Logger.prototype, 'error');

            await service.handleMessage(mockEvent);

            expect(configService.get).toHaveBeenCalledWith('WEBSOCKET_MESSAGE_SQS');
            expect(errorSpy).toHaveBeenCalledWith('No websocket message sqs found');
            expect(messageQueueService.sendMessageToSQS).not.toHaveBeenCalled();
        });

        it('should handle empty string WEBSOCKET_MESSAGE_SQS configuration', async () => {
            const mockEvent = {
                requestContext: {
                    connectionId: 'test-connection-123',
                },
            };

            configService.get.mockReturnValue('');
            const errorSpy = jest.spyOn(Logger.prototype, 'error');

            await service.handleMessage(mockEvent);

            expect(configService.get).toHaveBeenCalledWith('WEBSOCKET_MESSAGE_SQS');
            expect(errorSpy).toHaveBeenCalledWith('No websocket message sqs found');
            expect(messageQueueService.sendMessageToSQS).not.toHaveBeenCalled();
        });

        it('should log event details when handling message', async () => {
            const mockEvent = {
                requestContext: {
                    connectionId: 'test-connection-123',
                },
                body: 'test-body',
            };

            const expectedSqsUrl = 'https://sqs.us-east-1.amazonaws.com/123456789/websocket-messages';
            configService.get.mockReturnValue(expectedSqsUrl);
            messageQueueService.sendMessageToSQS.mockResolvedValue(undefined);

            const logSpy = jest.spyOn(Logger.prototype, 'log');

            await service.handleMessage(mockEvent);

            expect(logSpy).toHaveBeenCalledWith('event', JSON.stringify(mockEvent));
            expect(logSpy).toHaveBeenCalledWith('Sending connection Details to client from initial connection');
        });
    });
});
