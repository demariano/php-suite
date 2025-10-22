import { ContractDto, ErrorResponseDto, ResponseDto } from '@dto';
import { ContractDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetContractByContractNoQuery } from './get.contract.by.contractNo.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetContractByContractNoQuery)
export class GetContractByContractNoHandler implements IQueryHandler<GetContractByContractNoQuery> {
    protected readonly logger = new Logger(GetContractByContractNoHandler.name);

    constructor(
        @Inject('ContractDatabaseService')
        private readonly contractDatabaseService: ContractDatabaseServiceAbstract
    ) {}

    async execute(query: GetContractByContractNoQuery): Promise<ResponseDto<ContractDto | ErrorResponseDto>> {
        this.logger.log(`Processing get by contract number request for contract: ${query.contractNo}`);

        try {
            const contract = await this.contractDatabaseService.findRecordByContractNo(query.contractNo);

            if (!contract) {
                this.logger.warn(`Contract not found: ${query.contractNo}`);
                throw new NotFoundException(`Contract record not found for contract number ${query.contractNo}`);
            }

            this.logger.log(`Contract retrieved successfully: ${contract.contractId}`);
            return new ResponseDto<ContractDto>(contract, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.contractNo);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, contractNo: string): never {
        this.logger.error(`Error processing get by contract number request for ${contractNo}:`, error);

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
