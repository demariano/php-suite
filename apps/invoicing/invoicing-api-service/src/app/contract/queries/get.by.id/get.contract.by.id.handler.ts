import { ContractDto, ErrorResponseDto, ResponseDto } from '@dto';
import { ContractDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetContractByIdQuery } from './get.contract.by.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetContractByIdQuery)
export class GetContractByIdHandler implements IQueryHandler<GetContractByIdQuery> {
    protected readonly logger = new Logger(GetContractByIdHandler.name);

    constructor(
        @Inject('ContractDatabaseService')
        private readonly contractDatabaseService: ContractDatabaseServiceAbstract
    ) {}

    async execute(query: GetContractByIdQuery): Promise<ResponseDto<ContractDto | ErrorResponseDto>> {
        this.logger.log(`Processing get by id request for contract: ${query.recordId}`);

        try {
            const contract = await this.contractDatabaseService.findRecordById(query.recordId);

            if (!contract) {
                this.logger.warn(`Contract not found: ${query.recordId}`);
                throw new NotFoundException(`Contract record not found for id ${query.recordId}`);
            }

            this.logger.log(`Contract retrieved successfully: ${contract.contractId}`);
            return new ResponseDto<ContractDto>(contract, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.recordId);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing get by id request for ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException) {
            throw error;
        }

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
