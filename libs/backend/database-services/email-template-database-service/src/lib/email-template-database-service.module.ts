import { ConfigurationLibModule } from '@configuration-lib';
import { Module } from '@nestjs/common';
import { EmailTemplateDatabaseService } from './email-template-database-service';

@Module({
  imports: [ConfigurationLibModule],
  providers: [EmailTemplateDatabaseService],
  exports: [EmailTemplateDatabaseService],
})
export class EmailTemplateDatabaseServiceModule { }
