import { Inject, Injectable, Logger } from '@nestjs/common';
import { WebsocketConnectionDatabaseServiceAbstract } from '@websocket-connection-database-service';

@Injectable()
export class MessageHandlerService {
    private readonly logger = new Logger(MessageHandlerService.name);

    constructor(
        @Inject('WebsocketConnectionDatabaseService')
        private readonly websocketConnectionDatabaseService: WebsocketConnectionDatabaseServiceAbstract
    ) {}

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async handleMessage(event: any) {
        const connectionId = event.requestContext?.connectionId;

        if (!connectionId) {
            this.logger.error('ConnectionId not found in event');
            return;
        }

        this.logger.log(`Deleting connection: ${connectionId}`);

        //find the connection in the database
        const connection = await this.websocketConnectionDatabaseService.findByConnectionId(connectionId);

        if (!connection) {
            this.logger.error('Connection not found in database');
            return;
        }

        await this.websocketConnectionDatabaseService.deleteRecord(connection);
    }
}
