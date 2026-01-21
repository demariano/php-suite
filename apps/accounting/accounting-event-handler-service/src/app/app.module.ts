import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MessageHandlerService } from './message.handler.service';
import { SqsLocalService } from './sqs.local.service';

@Module({
    imports: [],
    controllers: [AppController],
    providers: [AppService, SqsLocalService, MessageHandlerService],
})
export class AppModule { }
