import { BroadcastMessageDto } from '@dto';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
    private readonly logger = new Logger(AppService.name);

    constructor(
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueAwsLibService: MessageQueueServiceAbstract,

        private readonly configService: ConfigService
    ) {}

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async handleMessage(event: any) {
        this.logger.log('event', JSON.stringify(event));

        const connectionId = event.requestContext?.connectionId;

        if (!connectionId) {
            this.logger.error('ConnectionId not found in event');
            return;
        }

        this.logger.log(`Sending connection Details to client from initial connection`);

        const broadcastMessageDto: BroadcastMessageDto = {
            action: 'sendMessage',
            connectionId: connectionId,
            message: 'CONNECTED ',
            broadcastToAll: false,
        };

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
}
