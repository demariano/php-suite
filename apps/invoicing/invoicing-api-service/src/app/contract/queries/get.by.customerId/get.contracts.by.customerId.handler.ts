import { ContractDto, ErrorResponseDto, PageDto, ResponseDto } from '@dto';
import { ContractDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetContractsByCustomerIdQuery } from './get.contracts.by.customerId.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetContractsByCustomerIdQuery)
export class GetContractsByCustomerIdHandler implements IQueryHandler<GetContractsByCustomerIdQuery> {
    protected readonly logger = new Logger(GetContractsByCustomerIdHandler.name);

    constructor(
        @Inject('ContractDatabaseService')
        private readonly contractDatabaseService: ContractDatabaseServiceAbstract
    ) {}

    async execute(query: GetContractsByCustomerIdQuery): Promise<ResponseDto<PageDto<ContractDto> | ErrorResponseDto>> {
        this.logger.log(`Processing get by customer ID request for customer: ${query.customerId}`);

        try {
            const contracts = await this.contractDatabaseService.findRecordByCustomerId(
                query.limit,
                query.customerId,
                query.direction,
                query.cursorPointer
            );

            this.logger.log(`Contracts retrieved successfully: ${contracts.data.length} records`);
            return new ResponseDto<PageDto<ContractDto>>(contracts, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.customerId);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, customerId: string): never {
        this.logger.error(`Error processing get by customer ID request for ${customerId}:`, error);

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
