import { AccountsDatabaseServiceAbstract } from '@accounting-database-service';
import { AccountsDto, PageDto, ResponseDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetAccountsByNameQuery } from './get.accounts.by.name.query';

// Constants
const HTTP_STATUS_OK = 200;
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 255;

@QueryHandler(GetAccountsByNameQuery)
export class GetAccountsByNameHandler implements IQueryHandler<GetAccountsByNameQuery> {
    private readonly logger = new Logger(GetAccountsByNameHandler.name);

    constructor(
        @Inject('AccountsDatabaseService')
        private readonly accountsDatabaseService: AccountsDatabaseServiceAbstract
    ) {}

    async execute(query: GetAccountsByNameQuery): Promise<ResponseDto<PageDto<AccountsDto>>> {
        this.logger.log(`Processing get accounts by name request: ${query.name}`);

        try {
            // Validate name parameter
            this.validateNameParameter(query.name);

            // Fetch accounts by name
            const accounts = await this.fetchAccountsByName(
                query.name,
                query.limit,
                query.direction,
                query.cursorPointer
            );

            this.logger.log(`Accounts retrieved successfully: ${accounts.data.length} found`);
            return new ResponseDto<PageDto<AccountsDto>>(accounts, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.name);
        }
    }

    /**
     * Validates the name parameter
     */
    private validateNameParameter(name: string): void {
        if (!name || typeof name !== 'string') {
            throw new BadRequestException('Name parameter is required and must be a string');
        }

        if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
            throw new BadRequestException(`Name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters`);
        }
    }

    /**
     * Fetches accounts by name
     */
    private async fetchAccountsByName(
        name: string,
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<AccountsDto>> {
        const accounts = await this.accountsDatabaseService.findRecordContainingName(
            limit,
            name,
            direction,
            cursorPointer
        );

        return accounts;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, name: string): never {
        this.logger.error(`Error fetching accounts by name ${name}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
            throw error;
        }

        // Handle unknown errors
        throw new BadRequestException('Failed to fetch accounts by name');
    }
}
