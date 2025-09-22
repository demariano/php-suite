import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { EmailTemplateDatabaseServiceModule } from '@email-template-database-service';

@Module({
  imports: [ConfigModule, EmailTemplateDatabaseServiceModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
