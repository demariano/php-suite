import { AccountsDatabaseServiceAbstract } from '@accounting-database-service';
import { AccountsDto, ResponseDto } from '@dto';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetAccountsByIdQuery } from './get.accounts.by.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetAccountsByIdQuery)
export class GetAccountsByIdHandler implements IQueryHandler<GetAccountsByIdQuery> {
    private readonly logger = new Logger(GetAccountsByIdHandler.name);

    constructor(
        @Inject('AccountsDatabaseService')
        private readonly accountsDatabaseService: AccountsDatabaseServiceAbstract
    ) {}

    async execute(query: GetAccountsByIdQuery): Promise<ResponseDto<AccountsDto>> {
        this.logger.log(`Processing get account request for ID: ${query.recordId}`);

        try {
            // Fetch and validate account record
            const accountRecord = await this.fetchAccountById(query.recordId);

            this.logger.log(`Account retrieved successfully: ${query.recordId}`);
            return new ResponseDto<AccountsDto>(accountRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.recordId);
        }
    }

    /**
     * Fetches and validates an account record by ID
     */
    private async fetchAccountById(recordId: string): Promise<AccountsDto> {
        const accountRecord = await this.accountsDatabaseService.findRecordById(recordId);

        if (!accountRecord) {
            this.logger.warn(`Account not found for ID: ${recordId}`);
            throw new NotFoundException(`Account not found for ID: ${recordId}`);
        }

        return accountRecord;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error fetching account by ID ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException) {
            throw error;
        }

        // Handle unknown errors by throwing NotFoundException
        throw new NotFoundException(`Account not found for ID: ${recordId}`);
    }
}
