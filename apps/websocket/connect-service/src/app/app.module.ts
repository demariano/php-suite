import { Module } from '@nestjs/common';

import { AuthGuardLibModule } from '@auth-guard-lib';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LocalWebsocketService } from './local.websocket.service';

@Module({
    imports: [MessageQueueLibModule, AuthGuardLibModule],
    controllers: [AppController],
    providers: [
        AppService,
        LocalWebsocketService,
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
    ],
})
export class AppModule {}
