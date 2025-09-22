import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AwsSesLibModule } from '@aws-ses-lib';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { SendEmailHandler } from './commands/send.email/send.email.handler';

@Module({
  imports: [AwsSesLibModule,ConfigModule,CqrsModule],
  controllers: [AppController],
  providers: [AppService,SendEmailHandler],
})
export class AppModule {}
