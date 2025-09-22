import { BroadcastMessageDto, WebSocketConnectionDto } from '@dto';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    MessageBody,
    OnGatewayConnection,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { WebsocketConnectionDatabaseServiceAbstract } from '@websocket-connection-database-service';

import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class LocalWebsocketService implements OnGatewayConnection {
    private readonly logger = new Logger(LocalWebsocketService.name);

    @WebSocketServer()
    server: Server;

    constructor(
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueAwsLibService: MessageQueueServiceAbstract,

        @Inject('WebsocketConnectionDatabaseService')
        private readonly websocketConnectionDatabaseService: WebsocketConnectionDatabaseServiceAbstract,

        private readonly configService: ConfigService
    ) {}

    async handleConnection(client: Socket, req: unknown) {
        this.logger.log(`Client connected: ${client.id}`);

        this.logger.log(`Sending connection Details to client from initial connection`);

        const broadcastMessageDto: BroadcastMessageDto = {
            connectionId: client.id,
            action: 'sendMessage',
            message: 'CONNECTED ',
            broadcastToAll: false,
        };

        const websocketConnectionDto: WebSocketConnectionDto = {
            connectionId: client.id,
            userEmail: 'local-websocket-service@test.com',
            connectedAt: new Date().toISOString(),
        };

        await this.websocketConnectionDatabaseService.createRecord(websocketConnectionDto);

        const websocketMessageSqs = this.configService.get('WEBSOCKET_MESSAGE_SQS');

        if (websocketMessageSqs) {
            await this.messageQueueAwsLibService.sendMessageToSQS(
                websocketMessageSqs,
                JSON.stringify(broadcastMessageDto)
            );
        } else {
            this.logger.error('No websocket message sqs found');
        }
    }

    async handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
        await this.websocketConnectionDatabaseService.deleteRecord({
            connectionId: client.id,
            userEmail: 'local-websocket-service@test.com',
            connectedAt: new Date().toISOString(),
        });
    }

    async emitMessageToAllClients(data: BroadcastMessageDto) {
        const connections = await this.websocketConnectionDatabaseService.getAllActiveConnections();

        for (const connection of connections) {
            data.connectionId = connection.connectionId;
            data.action = 'sendMessage';
            this.server.to(connection.connectionId).emit('local-server-message', JSON.stringify(data));
        }
    }

    async emitMessageToClient(data: BroadcastMessageDto) {
        this.logger.log(`Emitting message to client: ${JSON.stringify(data)}`);

        if (data.broadcastToAll) {
            await this.emitMessageToAllClients(data);
        } else {
            this.server.to(data.connectionId).emit('local-server-message', JSON.stringify(data));
        }
    }

    @SubscribeMessage('message')
    async receiveMessageFromClient(@MessageBody() data: BroadcastMessageDto) {
        this.logger.log(`Received message from client: ${JSON.stringify(data)}`);

        const clientMessageProcessorServiceUrl = this.configService.get(
            'LOCALSTACK_WEBSOCKET_CLIENT_MESSAGE_SERVICE_URL'
        );

        if (clientMessageProcessorServiceUrl) {
            const response = await fetch(clientMessageProcessorServiceUrl, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            this.logger.log(`Response from client message processor service: ${JSON.stringify(response)}`);
        } else {
            this.logger.error('No client message processor service url found');
        }
    }
}
