import { Module } from '@nestjs/common';

import { MessageQueueLibModule } from '@message-queue-lib';
import { LocalWebsocketBroadcastHandler } from './local/local.websocket.broadcast.handler';
import { SqsLocalService } from './sqs.local.service';

@Module({
    imports: [MessageQueueLibModule],
    controllers: [],
    providers: [SqsLocalService, LocalWebsocketBroadcastHandler],
})
export class AppModule {}
