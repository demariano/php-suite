import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EmailTemplateDatabaseServiceModule } from '@email-template-database-service';
import { ConfigModule } from '@nestjs/config';
import { GetEmailTemplateByTypeAndLanguageHandler } from './queries/get.email.template.by.typeand.language/get.email.template.by.typeand.language.handler';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateEmailTemplateHandler } from './commands/create.email.template/create.email.template.handler';

@Module({
  imports: [EmailTemplateDatabaseServiceModule,ConfigModule,CqrsModule],
  controllers: [AppController],
  providers: [AppService,GetEmailTemplateByTypeAndLanguageHandler,CreateEmailTemplateHandler],
})
export class AppModule {}
