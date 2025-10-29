import { AccountingDatabaseServiceModule, AccountsDatabaseService } from '@accounting-database-service';
import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AccountsController } from './accounts.controller';
import { ApproveAccountsHandler } from './command/approve-record/approve.handler';
import { CreateAccountsHandler } from './command/create/create.handler';
import { DeleteAccountsHandler } from './command/delete/delete.handler';
import { DenyAccountsHandler } from './command/deny-record/deny.handler';
import { UpdateAccountsHandler } from './command/update/update.handler';
import { GetAccountsByAccountTypeHandler } from './queries/get.by.account.type/get.accounts.by.account.type.handler';
import { GetAccountsByIdHandler } from './queries/get.by.id/get.accounts.by.id.handler';
import { GetAccountsByNameHandler } from './queries/get.by.name/get.accounts.by.name.handler';
import { GetRecordsByStatusPaginationHandler } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.handler';
import { GetRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';

const commandHandlers = [
    CreateAccountsHandler,
    UpdateAccountsHandler,
    DeleteAccountsHandler,
    ApproveAccountsHandler,
    DenyAccountsHandler,
];

const queryHandlers = [
    GetAccountsByIdHandler,
    GetAccountsByNameHandler,
    GetAccountsByAccountTypeHandler,
    GetRecordsPaginationHandler,
    GetRecordsByStatusPaginationHandler,
];

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        MessageQueueLibModule,
        AccountingDatabaseServiceModule,
    ],
    controllers: [AccountsController],
    providers: [
        ...commandHandlers,
        ...queryHandlers,
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        {
            provide: 'AccountsDatabaseService',
            useClass: AccountsDatabaseService,
        },
    ],
})
export class AccountsModule {}
