
import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { UserDatabaseService, UserDatabaseServiceModule } from '@user-database-service';
import { CreateUserHandler } from './commands/create.user/create.user.handler';
import { HardDeleteUserHandler } from './commands/hard.delete.user/hard.delete.user.handler';
import { SoftDeleteUserHandler } from './commands/soft.delete.user/soft.delete.user.handler';
import { UpdateUserHandler } from './commands/update.user/update.user.handler';
import { GetEmailByApiKeyHandler } from './queries/get.by.email.by.api.key/get.email.by.api.key.handler';
import { GetUserByEmailHandler } from './queries/get.by.email/get.user.by.email.handler';
import { GetUserByIdHandler } from './queries/get.by.id/get.user.by.id.handler';
import { GetRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';

import { GetRecordsFilterHandler } from './queries/get.records.filter/get.records.pagination.handler';
import { UserController } from './user.controller';

@Module({
  imports: [
    CqrsModule,
    DynamoDbLibModule,
    ConfigurationLibModule,
    AuthGuardLibModule,
    MessageQueueLibModule,
    UserDatabaseServiceModule],
  controllers: [UserController],
  providers: [
    {
      provide: 'MessageQueueAwsLibService',
      useClass: MessageQueueAwsLibService,
    },
    {
      provide: 'UserDatabaseService',
      useClass: UserDatabaseService,
    },
    CreateUserHandler,
    GetUserByIdHandler,
    GetUserByEmailHandler,
    GetRecordsPaginationHandler,
    UpdateUserHandler,
    SoftDeleteUserHandler,
    GetEmailByApiKeyHandler,
    HardDeleteUserHandler,
    GetRecordsFilterHandler

  ],
})
export class UserModule { }
