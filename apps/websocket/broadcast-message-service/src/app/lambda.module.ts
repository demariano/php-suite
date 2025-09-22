import { Module } from '@nestjs/common';

import { MessageQueueLibModule } from '@message-queue-lib';
import {
    WebsocketConnectionDatabaseService,
    WebsocketConnectionDatabaseServiceModule,
} from '@websocket-connection-database-service';
import { AwsWebsocketBroadcastHandler } from './aws/aws.websocket.broadcast.handler';
import { LambdaAppService } from './lambda.app.service';

@Module({
    imports: [MessageQueueLibModule, WebsocketConnectionDatabaseServiceModule],
    controllers: [],
    providers: [
        LambdaAppService,
        AwsWebsocketBroadcastHandler,
        {
            provide: 'WebsocketConnectionDatabaseService',
            useClass: WebsocketConnectionDatabaseService,
        },
    ],
})
export class LambdaModule {}
