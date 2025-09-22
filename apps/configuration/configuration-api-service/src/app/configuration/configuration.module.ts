
import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationDatabaseService } from '@configuration-database-service';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { UpdateConfigurationHandler } from './commands/update.configuration/update.configuration.handler';
import { ConfigurationController } from './configuration.controller';
import { GetConfigurationRecordHandler } from './queries/get.configuration.record/get.configuration.record.handler';


@Module({
  imports: [
    CqrsModule,
    DynamoDbLibModule,
    ConfigurationLibModule,
    AuthGuardLibModule,
  ],
  controllers: [ConfigurationController],
  providers: [

    {
      provide: 'ConfigurationDatabaseService',
      useClass: ConfigurationDatabaseService,
    },

    GetConfigurationRecordHandler,
    UpdateConfigurationHandler



  ],
})
export class ConfigurationModule { }
