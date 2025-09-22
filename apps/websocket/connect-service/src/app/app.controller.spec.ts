import { BroadcastMessageDto } from '@dto';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { LocalWebsocketService } from './local.websocket.service';

describe('AppController', () => {
    let controller: AppController;
    let localWebsocketService: jest.Mocked<LocalWebsocketService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AppController],
            providers: [
                {
                    provide: LocalWebsocketService,
                    useValue: {
                        emitMessageToClient: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<AppController>(AppController);
        localWebsocketService = module.get(LocalWebsocketService) as jest.Mocked<LocalWebsocketService>;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('handleMessage', () => {
        it('should emit message to client successfully', () => {
            // Complete BroadcastMessageDto following cursor rules
            const testMessage: BroadcastMessageDto = {
                action: 'sendMessage',
                connectionId: 'test-connection-123',
                message: 'Hello WebSocket',
                broadcastToAll: false,
            };

            localWebsocketService.emitMessageToClient.mockReturnValue(undefined);

            const result = controller.handleMessage(testMessage);

            expect(localWebsocketService.emitMessageToClient).toHaveBeenCalledWith(testMessage);
            expect(localWebsocketService.emitMessageToClient).toHaveBeenCalledTimes(1);
        });

        it('should emit broadcast message to all clients successfully', () => {
            const testMessage: BroadcastMessageDto = {
                action: 'sendMessage',
                connectionId: 'test-connection-123',
                message: 'Broadcast message',
                broadcastToAll: true,
            };

            localWebsocketService.emitMessageToClient.mockReturnValue(undefined);

            const result = controller.handleMessage(testMessage);

            expect(localWebsocketService.emitMessageToClient).toHaveBeenCalledWith(testMessage);
            expect(localWebsocketService.emitMessageToClient).toHaveBeenCalledTimes(1);
        });

        it('should handle empty message gracefully', () => {
            const testMessage: BroadcastMessageDto = {
                action: 'sendMessage',
                connectionId: 'test-connection-123',
                message: '',
                broadcastToAll: false,
            };

            localWebsocketService.emitMessageToClient.mockReturnValue(undefined);

            const result = controller.handleMessage(testMessage);

            expect(localWebsocketService.emitMessageToClient).toHaveBeenCalledWith(testMessage);
        });

        it('should handle different action types', () => {
            const testMessage: BroadcastMessageDto = {
                action: 'customAction',
                connectionId: 'test-connection-123',
                message: 'Custom action message',
                broadcastToAll: false,
            };

            localWebsocketService.emitMessageToClient.mockReturnValue(undefined);

            const result = controller.handleMessage(testMessage);

            expect(localWebsocketService.emitMessageToClient).toHaveBeenCalledWith(testMessage);
        });
    });
});
