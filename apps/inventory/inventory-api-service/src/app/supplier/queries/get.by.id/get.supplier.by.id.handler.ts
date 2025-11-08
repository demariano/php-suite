import { ResponseDto, SupplierDto } from '@dto';
import { SupplierDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetSupplierByIdQuery } from './get.supplier.by.id.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetSupplierByIdQuery)
export class GetSupplierByIdHandler implements IQueryHandler<GetSupplierByIdQuery> {
    private readonly logger = new Logger(GetSupplierByIdHandler.name);

    constructor(
        @Inject('SupplierDatabaseService')
        private readonly supplierDatabaseService: SupplierDatabaseServiceAbstract
    ) {}

    async execute(query: GetSupplierByIdQuery): Promise<ResponseDto<SupplierDto>> {
        this.logger.log(`Processing get supplier request for ID: ${query.recordId}`);

        try {
            // Fetch and validate supplier record
            const supplierRecord = await this.fetchSupplierById(query.recordId);

            this.logger.log(`Supplier retrieved successfully: ${query.recordId}`);
            return new ResponseDto<SupplierDto>(supplierRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.recordId);
        }
    }

    /**
     * Fetches and validates a supplier record by ID
     */
    private async fetchSupplierById(recordId: string): Promise<SupplierDto> {
        const supplierRecord = await this.supplierDatabaseService.findRecordById(recordId);

        if (!supplierRecord) {
            this.logger.warn(`Supplier not found for ID: ${recordId}`);
            throw new NotFoundException(`Supplier not found for ID: ${recordId}`);
        }

        return supplierRecord;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error fetching supplier by ID ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException) {
            throw error;
        }

        // Handle unknown errors by throwing NotFoundException
        throw new NotFoundException(`Supplier not found for ID: ${recordId}`);
    }
}
