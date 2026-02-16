import { CustomerDatabaseServiceAbstract } from '@customer-database-service';
import { ErrorResponseDto, ResponseDto } from '@dto';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetActiveCustomerCountQuery } from './get.active.customer.count.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetActiveCustomerCountQuery)
export class GetActiveCustomerCountHandler implements IQueryHandler<GetActiveCustomerCountQuery> {
    protected readonly logger = new Logger(GetActiveCustomerCountHandler.name);

    constructor(
        @Inject('CustomerDatabaseService')
        private readonly customerDatabaseService: CustomerDatabaseServiceAbstract
    ) {}

    async execute(_query: GetActiveCustomerCountQuery): Promise<ResponseDto<{ count: number } | ErrorResponseDto>> {
        this.logger.log(`Processing get active customer count request`);

        try {
            const count = await this.customerDatabaseService.getActiveCustomerCount();

            this.logger.log(`Active customer count retrieved successfully: ${count}`);
            return new ResponseDto<{ count: number }>({ count }, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error);
        }
    }

    private handleError(error: unknown): never {
        this.logger.error(`Error processing get active customer count request:`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        throw new Error(errorMessage);
    }
}
