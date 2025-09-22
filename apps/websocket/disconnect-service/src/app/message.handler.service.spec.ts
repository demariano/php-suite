import { WebSocketConnectionDto } from '@dto';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WebsocketConnectionDatabaseServiceAbstract } from '@websocket-connection-database-service';
import { MessageHandlerService } from './message.handler.service';

describe('MessageHandlerService', () => {
    let service: MessageHandlerService;
    let websocketConnectionDatabaseService: jest.Mocked<WebsocketConnectionDatabaseServiceAbstract>;
    let loggerErrorSpy: jest.SpyInstance;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MessageHandlerService,
                {
                    provide: 'WebsocketConnectionDatabaseService',
                    useValue: {
                        findByConnectionId: jest.fn(),
                        deleteRecord: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<MessageHandlerService>(MessageHandlerService);
        websocketConnectionDatabaseService = module.get(
            'WebsocketConnectionDatabaseService'
        ) as jest.Mocked<WebsocketConnectionDatabaseServiceAbstract>;

        // Mock logger methods
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
        it('should handle disconnect message successfully', async () => {
            // Arrange
            const mockEvent = {
                requestContext: {
                    connectionId: 'test-connection-123',
                },
            };

            const mockConnection: WebSocketConnectionDto = {
                connectionId: 'test-connection-123',
                userEmail: 'test@example.com',
                connectedAt: '2024-01-01T10:00:00Z',
            };

            const deletedConnection: WebSocketConnectionDto = {
                connectionId: 'test-connection-123',
                userEmail: 'test@example.com',
                connectedAt: '2024-01-01T10:00:00Z',
            };

            websocketConnectionDatabaseService.findByConnectionId.mockResolvedValue(mockConnection);
            websocketConnectionDatabaseService.deleteRecord.mockResolvedValue(deletedConnection);

            // Act
            await service.handleMessage(mockEvent);

            // Assert
            expect(websocketConnectionDatabaseService.findByConnectionId).toHaveBeenCalledWith('test-connection-123');
            expect(websocketConnectionDatabaseService.deleteRecord).toHaveBeenCalledWith(mockConnection);
            expect(websocketConnectionDatabaseService.findByConnectionId).toHaveBeenCalledTimes(1);
            expect(websocketConnectionDatabaseService.deleteRecord).toHaveBeenCalledTimes(1);
            expect(loggerErrorSpy).not.toHaveBeenCalled();
        });

        it('should log error when connectionId is not found in event', async () => {
            // Arrange
            const mockEvent = {
                requestContext: {},
            };

            // Act
            await service.handleMessage(mockEvent);

            // Assert
            expect(loggerErrorSpy).toHaveBeenCalledWith('ConnectionId not found in event');
            expect(websocketConnectionDatabaseService.findByConnectionId).not.toHaveBeenCalled();
            expect(websocketConnectionDatabaseService.deleteRecord).not.toHaveBeenCalled();
        });

        it('should log error when requestContext is missing', async () => {
            // Arrange
            const mockEvent = {};

            // Act
            await service.handleMessage(mockEvent);

            // Assert
            expect(loggerErrorSpy).toHaveBeenCalledWith('ConnectionId not found in event');
            expect(websocketConnectionDatabaseService.findByConnectionId).not.toHaveBeenCalled();
            expect(websocketConnectionDatabaseService.deleteRecord).not.toHaveBeenCalled();
        });

        it('should log error when connectionId is null', async () => {
            // Arrange
            const mockEvent = {
                requestContext: {
                    connectionId: null,
                },
            };

            // Act
            await service.handleMessage(mockEvent);

            // Assert
            expect(loggerErrorSpy).toHaveBeenCalledWith('ConnectionId not found in event');
            expect(websocketConnectionDatabaseService.findByConnectionId).not.toHaveBeenCalled();
            expect(websocketConnectionDatabaseService.deleteRecord).not.toHaveBeenCalled();
        });

        it('should log error when connectionId is undefined', async () => {
            // Arrange
            const mockEvent = {
                requestContext: {
                    connectionId: undefined,
                },
            };

            // Act
            await service.handleMessage(mockEvent);

            // Assert
            expect(loggerErrorSpy).toHaveBeenCalledWith('ConnectionId not found in event');
            expect(websocketConnectionDatabaseService.findByConnectionId).not.toHaveBeenCalled();
            expect(websocketConnectionDatabaseService.deleteRecord).not.toHaveBeenCalled();
        });

        it('should log error when connectionId is empty string', async () => {
            // Arrange
            const mockEvent = {
                requestContext: {
                    connectionId: '',
                },
            };

            // Act
            await service.handleMessage(mockEvent);

            // Assert
            expect(loggerErrorSpy).toHaveBeenCalledWith('ConnectionId not found in event');
            expect(websocketConnectionDatabaseService.findByConnectionId).not.toHaveBeenCalled();
            expect(websocketConnectionDatabaseService.deleteRecord).not.toHaveBeenCalled();
        });

        it('should log error when connection is not found in database', async () => {
            // Arrange
            const mockEvent = {
                requestContext: {
                    connectionId: 'test-connection-123',
                },
            };

            websocketConnectionDatabaseService.findByConnectionId.mockResolvedValue(undefined);

            // Act
            await service.handleMessage(mockEvent);

            // Assert
            expect(websocketConnectionDatabaseService.findByConnectionId).toHaveBeenCalledWith('test-connection-123');
            expect(loggerErrorSpy).toHaveBeenCalledWith('Connection not found in database');
            expect(websocketConnectionDatabaseService.deleteRecord).not.toHaveBeenCalled();
        });

        it('should log error when connection is null in database', async () => {
            // Arrange
            const mockEvent = {
                requestContext: {
                    connectionId: 'test-connection-123',
                },
            };

            websocketConnectionDatabaseService.findByConnectionId.mockResolvedValue(null as any);

            // Act
            await service.handleMessage(mockEvent);

            // Assert
            expect(websocketConnectionDatabaseService.findByConnectionId).toHaveBeenCalledWith('test-connection-123');
            expect(loggerErrorSpy).toHaveBeenCalledWith('Connection not found in database');
            expect(websocketConnectionDatabaseService.deleteRecord).not.toHaveBeenCalled();
        });

        it('should handle database error during findByConnectionId', async () => {
            // Arrange
            const mockEvent = {
                requestContext: {
                    connectionId: 'test-connection-123',
                },
            };

            const databaseError = new Error('Database connection failed');
            websocketConnectionDatabaseService.findByConnectionId.mockRejectedValue(databaseError);

            // Act & Assert
            await expect(service.handleMessage(mockEvent)).rejects.toThrow('Database connection failed');
            expect(websocketConnectionDatabaseService.findByConnectionId).toHaveBeenCalledWith('test-connection-123');
            expect(websocketConnectionDatabaseService.deleteRecord).not.toHaveBeenCalled();
        });

        it('should handle database error during deleteRecord', async () => {
            // Arrange
            const mockEvent = {
                requestContext: {
                    connectionId: 'test-connection-123',
                },
            };

            const mockConnection: WebSocketConnectionDto = {
                connectionId: 'test-connection-123',
                userEmail: 'test@example.com',
                connectedAt: '2024-01-01T10:00:00Z',
            };

            const deleteError = new Error('Delete operation failed');
            websocketConnectionDatabaseService.findByConnectionId.mockResolvedValue(mockConnection);
            websocketConnectionDatabaseService.deleteRecord.mockRejectedValue(deleteError);

            // Act & Assert
            await expect(service.handleMessage(mockEvent)).rejects.toThrow('Delete operation failed');
            expect(websocketConnectionDatabaseService.findByConnectionId).toHaveBeenCalledWith('test-connection-123');
            expect(websocketConnectionDatabaseService.deleteRecord).toHaveBeenCalledWith(mockConnection);
        });

        it('should handle connection without userEmail successfully', async () => {
            // Arrange
            const mockEvent = {
                requestContext: {
                    connectionId: 'test-connection-456',
                },
            };

            const mockConnection: WebSocketConnectionDto = {
                connectionId: 'test-connection-456',
                connectedAt: '2024-01-01T10:00:00Z',
            };

            const deletedConnection: WebSocketConnectionDto = {
                connectionId: 'test-connection-456',
                connectedAt: '2024-01-01T10:00:00Z',
            };

            websocketConnectionDatabaseService.findByConnectionId.mockResolvedValue(mockConnection);
            websocketConnectionDatabaseService.deleteRecord.mockResolvedValue(deletedConnection);

            // Act
            await service.handleMessage(mockEvent);

            // Assert
            expect(websocketConnectionDatabaseService.findByConnectionId).toHaveBeenCalledWith('test-connection-456');
            expect(websocketConnectionDatabaseService.deleteRecord).toHaveBeenCalledWith(mockConnection);
            expect(loggerErrorSpy).not.toHaveBeenCalled();
        });

        it('should handle long connectionId successfully', async () => {
            // Arrange
            const longConnectionId = 'test-connection-' + 'a'.repeat(100);
            const mockEvent = {
                requestContext: {
                    connectionId: longConnectionId,
                },
            };

            const mockConnection: WebSocketConnectionDto = {
                connectionId: longConnectionId,
                userEmail: 'test@example.com',
                connectedAt: '2024-01-01T10:00:00Z',
            };

            const deletedConnection: WebSocketConnectionDto = {
                connectionId: longConnectionId,
                userEmail: 'test@example.com',
                connectedAt: '2024-01-01T10:00:00Z',
            };

            websocketConnectionDatabaseService.findByConnectionId.mockResolvedValue(mockConnection);
            websocketConnectionDatabaseService.deleteRecord.mockResolvedValue(deletedConnection);

            // Act
            await service.handleMessage(mockEvent);

            // Assert
            expect(websocketConnectionDatabaseService.findByConnectionId).toHaveBeenCalledWith(longConnectionId);
            expect(websocketConnectionDatabaseService.deleteRecord).toHaveBeenCalledWith(mockConnection);
            expect(loggerErrorSpy).not.toHaveBeenCalled();
        });

        it('should handle event with additional properties successfully', async () => {
            // Arrange
            const mockEvent = {
                requestContext: {
                    connectionId: 'test-connection-789',
                    routeKey: '$disconnect',
                    stage: 'test',
                    apiId: 'test-api',
                },
                body: 'some-body-content',
                headers: {
                    'Content-Type': 'application/json',
                },
            };

            const mockConnection: WebSocketConnectionDto = {
                connectionId: 'test-connection-789',
                userEmail: 'user@test.com',
                connectedAt: '2024-01-01T10:00:00Z',
            };

            const deletedConnection: WebSocketConnectionDto = {
                connectionId: 'test-connection-789',
                userEmail: 'user@test.com',
                connectedAt: '2024-01-01T10:00:00Z',
            };

            websocketConnectionDatabaseService.findByConnectionId.mockResolvedValue(mockConnection);
            websocketConnectionDatabaseService.deleteRecord.mockResolvedValue(deletedConnection);

            // Act
            await service.handleMessage(mockEvent);

            // Assert
            expect(websocketConnectionDatabaseService.findByConnectionId).toHaveBeenCalledWith('test-connection-789');
            expect(websocketConnectionDatabaseService.deleteRecord).toHaveBeenCalledWith(mockConnection);
            expect(loggerErrorSpy).not.toHaveBeenCalled();
        });

        it('should handle multiple disconnect operations sequentially', async () => {
            // Arrange
            const connectionIds = ['conn-1', 'conn-2', 'conn-3'];
            const mockEvents = connectionIds.map((id) => ({
                requestContext: { connectionId: id },
            }));

            const mockConnections = connectionIds.map((id) => ({
                connectionId: id,
                userEmail: `user-${id}@example.com`,
                connectedAt: '2024-01-01T10:00:00Z',
            }));

            // Mock database responses
            connectionIds.forEach((id, index) => {
                websocketConnectionDatabaseService.findByConnectionId.mockResolvedValueOnce(mockConnections[index]);
                websocketConnectionDatabaseService.deleteRecord.mockResolvedValueOnce(mockConnections[index]);
            });

            // Act
            for (const event of mockEvents) {
                await service.handleMessage(event);
            }

            // Assert
            expect(websocketConnectionDatabaseService.findByConnectionId).toHaveBeenCalledTimes(3);
            expect(websocketConnectionDatabaseService.deleteRecord).toHaveBeenCalledTimes(3);
            connectionIds.forEach((id, index) => {
                expect(websocketConnectionDatabaseService.findByConnectionId).toHaveBeenNthCalledWith(index + 1, id);
                expect(websocketConnectionDatabaseService.deleteRecord).toHaveBeenNthCalledWith(
                    index + 1,
                    mockConnections[index]
                );
            });
            expect(loggerErrorSpy).not.toHaveBeenCalled();
        });

        it('should handle concurrent disconnect operations', async () => {
            // Arrange
            const connectionIds = ['concurrent-1', 'concurrent-2', 'concurrent-3'];
            const mockEvents = connectionIds.map((id) => ({
                requestContext: { connectionId: id },
            }));

            const mockConnections = connectionIds.map((id) => ({
                connectionId: id,
                userEmail: `user-${id}@example.com`,
                connectedAt: '2024-01-01T10:00:00Z',
            }));

            websocketConnectionDatabaseService.findByConnectionId.mockImplementation((id) => {
                const connection = mockConnections.find((conn) => conn.connectionId === id);
                return Promise.resolve(connection);
            });

            websocketConnectionDatabaseService.deleteRecord.mockImplementation((connection) => {
                return Promise.resolve(connection);
            });

            // Act
            const promises = mockEvents.map((event) => service.handleMessage(event));
            await Promise.all(promises);

            // Assert
            expect(websocketConnectionDatabaseService.findByConnectionId).toHaveBeenCalledTimes(3);
            expect(websocketConnectionDatabaseService.deleteRecord).toHaveBeenCalledTimes(3);
            connectionIds.forEach((id) => {
                expect(websocketConnectionDatabaseService.findByConnectionId).toHaveBeenCalledWith(id);
            });
            expect(loggerErrorSpy).not.toHaveBeenCalled();
        });

        it('should handle null event gracefully', async () => {
            // Arrange
            const mockEvent = null;

            // Act & Assert
            await expect(service.handleMessage(mockEvent)).rejects.toThrow();
        });

        it('should handle event with special characters in connectionId', async () => {
            // Arrange
            const specialConnectionId = 'test-connection-!@#$%^&*()_+-=[]{}|;:,.<>?';
            const mockEvent = {
                requestContext: {
                    connectionId: specialConnectionId,
                },
            };

            const mockConnection: WebSocketConnectionDto = {
                connectionId: specialConnectionId,
                userEmail: 'special@example.com',
                connectedAt: '2024-01-01T10:00:00Z',
            };

            websocketConnectionDatabaseService.findByConnectionId.mockResolvedValue(mockConnection);
            websocketConnectionDatabaseService.deleteRecord.mockResolvedValue(mockConnection);

            // Act
            await service.handleMessage(mockEvent);

            // Assert
            expect(websocketConnectionDatabaseService.findByConnectionId).toHaveBeenCalledWith(specialConnectionId);
            expect(websocketConnectionDatabaseService.deleteRecord).toHaveBeenCalledWith(mockConnection);
            expect(loggerErrorSpy).not.toHaveBeenCalled();
        });
    });
});
