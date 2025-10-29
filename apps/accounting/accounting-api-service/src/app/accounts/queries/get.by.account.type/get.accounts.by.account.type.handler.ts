import { AccountsDatabaseServiceAbstract } from '@accounting-database-service';
import { AccountsDto, PageDto, ResponseDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetAccountsByAccountTypeQuery } from './get.accounts.by.account.type.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

@QueryHandler(GetAccountsByAccountTypeQuery)
export class GetAccountsByAccountTypeHandler implements IQueryHandler<GetAccountsByAccountTypeQuery> {
    private readonly logger = new Logger(GetAccountsByAccountTypeHandler.name);

    constructor(
        @Inject('AccountsDatabaseService')
        private readonly accountsDatabaseService: AccountsDatabaseServiceAbstract
    ) {}

    async execute(query: GetAccountsByAccountTypeQuery): Promise<ResponseDto<PageDto<AccountsDto>>> {
        this.logger.log(`Processing get accounts by account type request: ${query.accountType}`);

        try {
            // Validate parameters
            this.validateParameters(query);

            // Fetch accounts by account type
            const accounts = await this.fetchAccountsByAccountType(query);

            this.logger.log(`Accounts retrieved successfully: ${accounts.data.length} found`);
            return new ResponseDto<PageDto<AccountsDto>>(accounts, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.accountType);
        }
    }

    /**
     * Validates the query parameters
     */
    private validateParameters(query: GetAccountsByAccountTypeQuery): void {
        // Validate limit
        if (!query.limit || query.limit < MIN_LIMIT || query.limit > MAX_LIMIT) {
            throw new BadRequestException(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
        }

        // Validate account type
        if (!query.accountType || typeof query.accountType !== 'string') {
            throw new BadRequestException('Account type is required and must be a string');
        }
    }

    /**
     * Fetches accounts by account type
     */
    private async fetchAccountsByAccountType(query: GetAccountsByAccountTypeQuery): Promise<PageDto<AccountsDto>> {
        return await this.accountsDatabaseService.findRecordsByAccountTypePagination(
            query.limit,
            query.accountType,
            query.direction,
            query.cursorPointer
        );
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, accountType: string): never {
        this.logger.error(`Error fetching accounts by account type ${accountType}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        throw new BadRequestException('Failed to fetch accounts by account type');
    }
}
