import { ContractDto, ErrorResponseDto, PageDto, ResponseDto } from '@dto';
import { ContractDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetContractsContainingContractNoQuery } from './get.contracts.containing.contractNo.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetContractsContainingContractNoQuery)
export class GetContractsContainingContractNoHandler implements IQueryHandler<GetContractsContainingContractNoQuery> {
    protected readonly logger = new Logger(GetContractsContainingContractNoHandler.name);

    constructor(
        @Inject('ContractDatabaseService')
        private readonly contractDatabaseService: ContractDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetContractsContainingContractNoQuery
    ): Promise<ResponseDto<PageDto<ContractDto> | ErrorResponseDto>> {
        this.logger.log(`Processing get containing contract number request for contract: ${query.contractNo}`);

        try {
            const limit = query.limit || 10;
            const direction = query.direction || undefined;
            const cursorPointer = query.cursorPointer || undefined;
            const contractNo = query.contractNo || '';

            const contracts = await this.contractDatabaseService.findRecordContainingContractNo(
                limit,
                contractNo,
                direction,
                cursorPointer
            );

            this.logger.log(`Contracts retrieved successfully: ${contracts.data.length} records`);
            return new ResponseDto<PageDto<ContractDto>>(contracts, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.contractNo);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, contractNo: string): never {
        this.logger.error(`Error processing get containing contract number request for ${contractNo}:`, error);

        // Handle unknown errors
        const errorMessage = this.extractErrorMessage(error);
        throw new Error(errorMessage);
    }

    /**
     * Extracts error message from various error types
     */
    private extractErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }

        if (typeof error === 'object' && error !== null && 'response' in error) {
            const responseError = error as { response?: { body?: { errorMessage?: string } } };
            return responseError.response?.body?.errorMessage || 'Unknown error occurred';
        }

        return 'An unexpected error occurred';
    }
}
