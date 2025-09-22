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

        // Mock the logger
        jest.spyOn(Logger.prototype, 'log').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('handleMessage', () => {
        it('should process message successfully', async () => {
            const testMessage = {
                action: 'sendMessage',
                connectionId: 'test-connection-123',
                message: 'Hello WebSocket',
                broadcastToAll: false,
            };

            messageHandlerService.handleMessage.mockResolvedValue(undefined);

            const result = await service.handleMessage(testMessage);

            expect(messageHandlerService.handleMessage).toHaveBeenCalledWith(testMessage);
            expect(result).toBeUndefined();
        });
    });
});
