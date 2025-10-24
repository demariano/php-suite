import { ContractDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetPendingPaymentContractsQuery } from './get.pending.payment.contracts.query';

@QueryHandler(GetPendingPaymentContractsQuery)
export class GetPendingPaymentContractsHandler implements IQueryHandler<GetPendingPaymentContractsQuery> {
    protected readonly logger = new Logger(GetPendingPaymentContractsHandler.name);

    constructor(
        @Inject('ContractDatabaseService')
        private readonly contractDatabaseService: ContractDatabaseServiceAbstract
    ) {}

    async execute(query: GetPendingPaymentContractsQuery) {
        const contracts = await this.contractDatabaseService.findPendingPaymentContracts(query.customerId);
        return {
            statusCode: 200,
            data: contracts || [],
        };
    }
}
