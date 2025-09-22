import { Module } from '@nestjs/common';

import { AuthGuardLibModule } from '@auth-guard-lib';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import {
    WebsocketConnectionDatabaseService,
    WebsocketConnectionDatabaseServiceModule,
} from '@websocket-connection-database-service';
import { AwsConnectionHandler } from './aws.connection.handler';

@Module({
    imports: [MessageQueueLibModule, AuthGuardLibModule, WebsocketConnectionDatabaseServiceModule],
    providers: [
        AwsConnectionHandler,
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        {
            provide: 'WebsocketConnectionDatabaseService',
            useClass: WebsocketConnectionDatabaseService,
        },
    ],
})
export class LambdaModule {}
