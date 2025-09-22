import { Module } from '@nestjs/common';

import {
    WebsocketConnectionDatabaseService,
    WebsocketConnectionDatabaseServiceModule,
} from '@websocket-connection-database-service';
import { AppService } from './app.service';
import { MessageHandlerService } from './message.handler.service';

@Module({
    imports: [WebsocketConnectionDatabaseServiceModule],
    controllers: [],
    providers: [
        AppService,
        MessageHandlerService,
        {
            provide: 'WebsocketConnectionDatabaseService',
            useClass: WebsocketConnectionDatabaseService,
        },
    ],
})
export class AppModule {}
