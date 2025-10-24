import { AuthGuardLibModule } from '@auth-guard-lib';
import { ConfigurationLibModule } from '@configuration-lib';
import { DynamoDbLibModule } from '@dynamo-db-lib';
import { ContractDatabaseService, InvoicingDatabaseServiceModule } from '@invoicing-database-service';
import { MessageQueueAwsLibService, MessageQueueLibModule } from '@message-queue-lib';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { ApproveContractHandler } from './command/approve-record/approve.handler';
import { CreateContractHandler } from './command/create/create.handler';
import { DeleteContractHandler } from './command/delete/delete.handler';
import { DenyContractHandler } from './command/deny-record/deny.handler';
import { UpdateContractHandler } from './command/update/update.handler';
import { ContractController } from './contract.controller';
import { GetContractByContractNoHandler } from './queries/get.by.contractNo/get.contract.by.contractNo.handler';
import { GetContractsByCustomerIdHandler } from './queries/get.by.customerId/get.contracts.by.customerId.handler';
import { GetContractByIdHandler } from './queries/get.by.id/get.contract.by.id.handler';
import { GetContractsContainingContractNoHandler } from './queries/get.containing.contractNo/get.contracts.containing.contractNo.handler';
import { GetPendingPaymentContractsHandler } from './queries/get.pending.payment.contracts/get.pending.payment.contracts.handler';
import { GetRecordsByStatusPaginationHandler } from './queries/get.records.by.status.pagination/get.records.by.status.pagination.handler';
import { GetRecordsPaginationHandler } from './queries/get.records.pagination/get.records.pagination.handler';

@Module({
    imports: [
        CqrsModule,
        DynamoDbLibModule,
        ConfigurationLibModule,
        AuthGuardLibModule,
        MessageQueueLibModule,
        InvoicingDatabaseServiceModule,
    ],
    controllers: [ContractController],
    providers: [
        {
            provide: 'MessageQueueAwsLibService',
            useClass: MessageQueueAwsLibService,
        },
        {
            provide: 'ContractDatabaseService',
            useClass: ContractDatabaseService,
        },
        CreateContractHandler,
        GetContractByIdHandler,
        GetContractByContractNoHandler,
        GetContractsContainingContractNoHandler,
        GetContractsByCustomerIdHandler,
        GetPendingPaymentContractsHandler,
        GetRecordsPaginationHandler,
        GetRecordsByStatusPaginationHandler,
        UpdateContractHandler,
        DeleteContractHandler,
        ApproveContractHandler,
        DenyContractHandler,
        
    ],
})
export class ContractModule {}
