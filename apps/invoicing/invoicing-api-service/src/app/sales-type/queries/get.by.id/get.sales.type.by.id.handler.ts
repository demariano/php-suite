import { ResponseDto, SalesTypeDto } from '@dto';
import { SalesTypeDatabaseServiceAbstract } from '@invoicing-database-service';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetSalesTypeByIdQuery } from './get.sales.type.by.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetSalesTypeByIdQuery)
export class GetSalesTypeByIdHandler implements IQueryHandler<GetSalesTypeByIdQuery> {
    private readonly logger = new Logger(GetSalesTypeByIdHandler.name);

    constructor(
        @Inject('SalesTypeDatabaseService')
        private readonly salesTypeDatabaseService: SalesTypeDatabaseServiceAbstract
    ) {}

    async execute(query: GetSalesTypeByIdQuery): Promise<ResponseDto<SalesTypeDto>> {
        this.logger.log(`Processing get sales type request for ID: ${query.recordId}`);

        try {
            // Fetch and validate sales type record
            const salesTypeRecord = await this.fetchSalesTypeById(query.recordId);

            this.logger.log(`Sales type retrieved successfully: ${query.recordId}`);
            return new ResponseDto<SalesTypeDto>(salesTypeRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.recordId);
        }
    }

    /**
     * Fetches and validates a sales type record by ID
     */
    private async fetchSalesTypeById(recordId: string): Promise<SalesTypeDto> {
        const salesTypeRecord = await this.salesTypeDatabaseService.findRecordById(recordId);

        if (!salesTypeRecord) {
            this.logger.warn(`Sales type not found for ID: ${recordId}`);
            throw new NotFoundException(`Sales type not found for ID: ${recordId}`);
        }

        return salesTypeRecord;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error fetching sales type by ID ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException) {
            throw error;
        }

        // Handle unknown errors by throwing NotFoundException
        throw new NotFoundException(`Sales type not found for ID: ${recordId}`);
    }
}
