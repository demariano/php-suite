import { BroadcastMessageDto } from '@dto';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AwsWebsocketBroadcastHandler } from './aws/aws.websocket.broadcast.handler';
import { LambdaAppService } from './lambda.app.service';

describe('LambdaAppService', () => {
    let service: LambdaAppService;
    let awsWebsocketBroadcastHandler: jest.Mocked<AwsWebsocketBroadcastHandler>;
    let loggerLogSpy: jest.SpyInstance;
    let loggerErrorSpy: jest.SpyInstance;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LambdaAppService,
                {
                    provide: AwsWebsocketBroadcastHandler,
                    useValue: {
                        handleMessage: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<LambdaAppService>(LambdaAppService);
        awsWebsocketBroadcastHandler = module.get(
            AwsWebsocketBroadcastHandler
        ) as jest.Mocked<AwsWebsocketBroadcastHandler>;

        // Mock the logger
        loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
        loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('handleMessage', () => {
        it('should process single SQS record successfully', async () => {
            // Arrange
            const mockBroadcastMessage: BroadcastMessageDto = {
                connectionId: 'test-connection-123',
                action: 'sendMessage',
                message: 'Test message from Lambda',
                broadcastToAll: false,
            };

            const mockRecord = {
                messageId: 'msg-123',
                receiptHandle: 'receipt-123',
                body: JSON.stringify(mockBroadcastMessage),
                attributes: {},
                messageAttributes: {},
                md5OfBody: 'hash123',
                eventSource: 'aws:sqs',
                eventSourceARN: 'arn:aws:sqs:us-east-1:123456789:test-queue',
                awsRegion: 'us-east-1',
            };

            const mockRecords = [mockRecord];
            awsWebsocketBroadcastHandler.handleMessage.mockResolvedValue(undefined);

            // Act
            await service.handleMessage(mockRecords);

            // Assert
            expect(loggerLogSpy).toHaveBeenCalledWith(`Processing SQS Message: ${JSON.stringify(mockRecord)}`);
            expect(awsWebsocketBroadcastHandler.handleMessage).toHaveBeenCalledWith(mockRecord.body);
            expect(awsWebsocketBroadcastHandler.handleMessage).toHaveBeenCalledTimes(1);
        });

        it('should process multiple SQS records successfully', async () => {
            // Arrange
            const mockBroadcastMessage1: BroadcastMessageDto = {
                connectionId: 'test-connection-123',
                action: 'sendMessage',
                message: 'First test message',
                broadcastToAll: false,
            };

            const mockBroadcastMessage2: BroadcastMessageDto = {
                connectionId: 'test-connection-456',
                action: 'sendMessage',
                message: 'Second test message',
                broadcastToAll: true,
            };

            const mockRecord1 = {
                messageId: 'msg-123',
                receiptHandle: 'receipt-123',
                body: JSON.stringify(mockBroadcastMessage1),
                attributes: {},
                messageAttributes: {},
                md5OfBody: 'hash123',
                eventSource: 'aws:sqs',
                eventSourceARN: 'arn:aws:sqs:us-east-1:123456789:test-queue',
                awsRegion: 'us-east-1',
            };

            const mockRecord2 = {
                messageId: 'msg-456',
                receiptHandle: 'receipt-456',
                body: JSON.stringify(mockBroadcastMessage2),
                attributes: {},
                messageAttributes: {},
                md5OfBody: 'hash456',
                eventSource: 'aws:sqs',
                eventSourceARN: 'arn:aws:sqs:us-east-1:123456789:test-queue',
                awsRegion: 'us-east-1',
            };

            const mockRecords = [mockRecord1, mockRecord2];
            awsWebsocketBroadcastHandler.handleMessage.mockResolvedValue(undefined);

            // Act
            await service.handleMessage(mockRecords);

            // Assert
            expect(loggerLogSpy).toHaveBeenCalledWith(`Processing SQS Message: ${JSON.stringify(mockRecord1)}`);
            expect(loggerLogSpy).toHaveBeenCalledWith(`Processing SQS Message: ${JSON.stringify(mockRecord2)}`);
            expect(awsWebsocketBroadcastHandler.handleMessage).toHaveBeenCalledWith(mockRecord1.body);
            expect(awsWebsocketBroadcastHandler.handleMessage).toHaveBeenCalledWith(mockRecord2.body);
            expect(awsWebsocketBroadcastHandler.handleMessage).toHaveBeenCalledTimes(2);
        });

        it('should handle empty records array gracefully', async () => {
            // Arrange
            const mockRecords: any[] = [];

            // Act
            await service.handleMessage(mockRecords);

            // Assert
            // Logger should not have any service-specific calls (may have initialization logs)
            const serviceLogs = loggerLogSpy.mock.calls.filter(
                (call) => call[0] && call[0].includes('Processing SQS Message')
            );
            expect(serviceLogs).toHaveLength(0);
            expect(awsWebsocketBroadcastHandler.handleMessage).not.toHaveBeenCalled();
        });

        it('should handle individual record processing error gracefully', async () => {
            // Arrange
            const mockBroadcastMessage: BroadcastMessageDto = {
                connectionId: 'test-connection-123',
                action: 'sendMessage',
                message: 'Test message',
                broadcastToAll: false,
            };

            const mockRecord = {
                messageId: 'msg-123',
                receiptHandle: 'receipt-123',
                body: JSON.stringify(mockBroadcastMessage),
                attributes: {},
                messageAttributes: {},
                md5OfBody: 'hash123',
                eventSource: 'aws:sqs',
                eventSourceARN: 'arn:aws:sqs:us-east-1:123456789:test-queue',
                awsRegion: 'us-east-1',
            };

            const mockRecords = [mockRecord];
            const handlerError = new Error('Handler processing failed');
            awsWebsocketBroadcastHandler.handleMessage.mockRejectedValue(handlerError);

            // Act
            await service.handleMessage(mockRecords);

            // Assert
            expect(loggerLogSpy).toHaveBeenCalledWith(`Processing SQS Message: ${JSON.stringify(mockRecord)}`);
            expect(awsWebsocketBroadcastHandler.handleMessage).toHaveBeenCalledWith(mockRecord.body);
            expect(loggerErrorSpy).toHaveBeenCalledWith(
                `Error processing SQS Message: ${JSON.stringify(handlerError)}`
            );
        });

        it('should handle multiple records with partial failures', async () => {
            // Arrange
            const mockBroadcastMessage1: BroadcastMessageDto = {
                connectionId: 'test-connection-123',
                action: 'sendMessage',
                message: 'First test message',
                broadcastToAll: false,
            };

            const mockBroadcastMessage2: BroadcastMessageDto = {
                connectionId: 'test-connection-456',
                action: 'sendMessage',
                message: 'Second test message',
                broadcastToAll: false,
            };

            const mockRecord1 = {
                messageId: 'msg-123',
                receiptHandle: 'receipt-123',
                body: JSON.stringify(mockBroadcastMessage1),
                attributes: {},
                messageAttributes: {},
                md5OfBody: 'hash123',
                eventSource: 'aws:sqs',
                eventSourceARN: 'arn:aws:sqs:us-east-1:123456789:test-queue',
                awsRegion: 'us-east-1',
            };

            const mockRecord2 = {
                messageId: 'msg-456',
                receiptHandle: 'receipt-456',
                body: JSON.stringify(mockBroadcastMessage2),
                attributes: {},
                messageAttributes: {},
                md5OfBody: 'hash456',
                eventSource: 'aws:sqs',
                eventSourceARN: 'arn:aws:sqs:us-east-1:123456789:test-queue',
                awsRegion: 'us-east-1',
            };

            const mockRecords = [mockRecord1, mockRecord2];
            const handlerError = new Error('Handler processing failed for second message');

            awsWebsocketBroadcastHandler.handleMessage
                .mockResolvedValueOnce(undefined) // First record succeeds
                .mockRejectedValueOnce(handlerError); // Second record fails

            // Act
            await service.handleMessage(mockRecords);

            // Assert
            expect(loggerLogSpy).toHaveBeenCalledWith(`Processing SQS Message: ${JSON.stringify(mockRecord1)}`);
            expect(loggerLogSpy).toHaveBeenCalledWith(`Processing SQS Message: ${JSON.stringify(mockRecord2)}`);
            expect(awsWebsocketBroadcastHandler.handleMessage).toHaveBeenCalledWith(mockRecord1.body);
            expect(awsWebsocketBroadcastHandler.handleMessage).toHaveBeenCalledWith(mockRecord2.body);
            expect(awsWebsocketBroadcastHandler.handleMessage).toHaveBeenCalledTimes(2);
            expect(loggerErrorSpy).toHaveBeenCalledWith(
                `Error processing SQS Message: ${JSON.stringify(handlerError)}`
            );
        });

        it('should handle records with malformed JSON body', async () => {
            // Arrange
            const mockRecord = {
                messageId: 'msg-123',
                receiptHandle: 'receipt-123',
                body: '{ invalid json body',
                attributes: {},
                messageAttributes: {},
                md5OfBody: 'hash123',
                eventSource: 'aws:sqs',
                eventSourceARN: 'arn:aws:sqs:us-east-1:123456789:test-queue',
                awsRegion: 'us-east-1',
            };

            const mockRecords = [mockRecord];
            const jsonError = new SyntaxError('Unexpected token');
            awsWebsocketBroadcastHandler.handleMessage.mockRejectedValue(jsonError);

            // Act
            await service.handleMessage(mockRecords);

            // Assert
            expect(loggerLogSpy).toHaveBeenCalledWith(`Processing SQS Message: ${JSON.stringify(mockRecord)}`);
            expect(awsWebsocketBroadcastHandler.handleMessage).toHaveBeenCalledWith(mockRecord.body);
            expect(loggerErrorSpy).toHaveBeenCalledWith(`Error processing SQS Message: ${JSON.stringify(jsonError)}`);
        });

        it('should handle records with missing body', async () => {
            // Arrange
            const mockRecord = {
                messageId: 'msg-123',
                receiptHandle: 'receipt-123',
                body: undefined,
                attributes: {},
                messageAttributes: {},
                md5OfBody: 'hash123',
                eventSource: 'aws:sqs',
                eventSourceARN: 'arn:aws:sqs:us-east-1:123456789:test-queue',
                awsRegion: 'us-east-1',
            };

            const mockRecords = [mockRecord];
            const handlerError = new Error('No body provided');
            awsWebsocketBroadcastHandler.handleMessage.mockRejectedValue(handlerError);

            // Act
            await service.handleMessage(mockRecords);

            // Assert
            expect(loggerLogSpy).toHaveBeenCalledWith(`Processing SQS Message: ${JSON.stringify(mockRecord)}`);
            expect(awsWebsocketBroadcastHandler.handleMessage).toHaveBeenCalledWith(undefined);
            expect(loggerErrorSpy).toHaveBeenCalledWith(
                `Error processing SQS Message: ${JSON.stringify(handlerError)}`
            );
        });

        it('should process records with different message types', async () => {
            // Arrange
            const broadcastMessage: BroadcastMessageDto = {
                connectionId: 'test-connection-123',
                action: 'broadcastMessage',
                message: 'Broadcast to all',
                broadcastToAll: true,
            };

            const individualMessage: BroadcastMessageDto = {
                connectionId: 'test-connection-456',
                action: 'sendMessage',
                message: 'Individual message',
                broadcastToAll: false,
            };

            const mockRecord1 = {
                messageId: 'msg-123',
                receiptHandle: 'receipt-123',
                body: JSON.stringify(broadcastMessage),
                attributes: {},
                messageAttributes: {},
                md5OfBody: 'hash123',
                eventSource: 'aws:sqs',
                eventSourceARN: 'arn:aws:sqs:us-east-1:123456789:test-queue',
                awsRegion: 'us-east-1',
            };

            const mockRecord2 = {
                messageId: 'msg-456',
                receiptHandle: 'receipt-456',
                body: JSON.stringify(individualMessage),
                attributes: {},
                messageAttributes: {},
                md5OfBody: 'hash456',
                eventSource: 'aws:sqs',
                eventSourceARN: 'arn:aws:sqs:us-east-1:123456789:test-queue',
                awsRegion: 'us-east-1',
            };

            const mockRecords = [mockRecord1, mockRecord2];
            awsWebsocketBroadcastHandler.handleMessage.mockResolvedValue(undefined);

            // Act
            await service.handleMessage(mockRecords);

            // Assert
            expect(awsWebsocketBroadcastHandler.handleMessage).toHaveBeenCalledWith(mockRecord1.body);
            expect(awsWebsocketBroadcastHandler.handleMessage).toHaveBeenCalledWith(mockRecord2.body);
            expect(awsWebsocketBroadcastHandler.handleMessage).toHaveBeenCalledTimes(2);
        });

        it('should continue processing remaining records after error', async () => {
            // Arrange
            const mockBroadcastMessage1: BroadcastMessageDto = {
                connectionId: 'test-connection-123',
                action: 'sendMessage',
                message: 'First message',
                broadcastToAll: false,
            };

            const mockBroadcastMessage2: BroadcastMessageDto = {
                connectionId: 'test-connection-456',
                action: 'sendMessage',
                message: 'Second message',
                broadcastToAll: false,
            };

            const mockBroadcastMessage3: BroadcastMessageDto = {
                connectionId: 'test-connection-789',
                action: 'sendMessage',
                message: 'Third message',
                broadcastToAll: false,
            };

            const mockRecord1 = {
                messageId: 'msg-123',
                body: JSON.stringify(mockBroadcastMessage1),
            };

            const mockRecord2 = {
                messageId: 'msg-456',
                body: JSON.stringify(mockBroadcastMessage2),
            };

            const mockRecord3 = {
                messageId: 'msg-789',
                body: JSON.stringify(mockBroadcastMessage3),
            };

            const mockRecords = [mockRecord1, mockRecord2, mockRecord3];
            const handlerError = new Error('Processing failed for second message');

            awsWebsocketBroadcastHandler.handleMessage
                .mockResolvedValueOnce(undefined) // First record succeeds
                .mockRejectedValueOnce(handlerError) // Second record fails
                .mockResolvedValueOnce(undefined); // Third record succeeds

            // Act
            await service.handleMessage(mockRecords);

            // Assert
            expect(awsWebsocketBroadcastHandler.handleMessage).toHaveBeenCalledTimes(3);
            expect(awsWebsocketBroadcastHandler.handleMessage).toHaveBeenCalledWith(mockRecord1.body);
            expect(awsWebsocketBroadcastHandler.handleMessage).toHaveBeenCalledWith(mockRecord2.body);
            expect(awsWebsocketBroadcastHandler.handleMessage).toHaveBeenCalledWith(mockRecord3.body);
            expect(loggerErrorSpy).toHaveBeenCalledWith(
                `Error processing SQS Message: ${JSON.stringify(handlerError)}`
            );
        });
    });
});
