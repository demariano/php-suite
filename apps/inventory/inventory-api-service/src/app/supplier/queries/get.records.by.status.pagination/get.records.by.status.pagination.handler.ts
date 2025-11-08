import { PageDto, ResponseDto } from '@dto';
import { SupplierDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRecordsByStatusPaginationQuery } from './get.records.by.status.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetRecordsByStatusPaginationQuery)
export class GetRecordsByStatusPaginationHandler implements IQueryHandler<GetRecordsByStatusPaginationQuery> {
    private readonly logger = new Logger(GetRecordsByStatusPaginationHandler.name);

    constructor(
        @Inject('SupplierDatabaseService')
        private readonly supplierDatabaseService: SupplierDatabaseServiceAbstract
    ) {}

    async execute(query: GetRecordsByStatusPaginationQuery): Promise<ResponseDto<PageDto<any>>> {
        this.logger.log(`Processing get suppliers by status pagination request for status: ${query.status}`);

        try {
            // Fetch suppliers by status with pagination
            const supplierPage = await this.fetchSuppliersByStatusPagination(query);

            this.logger.log(`Suppliers retrieved successfully by status: ${query.status}`);
            return new ResponseDto<PageDto<any>>(supplierPage, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.status);
        }
    }

    /**
     * Fetches suppliers by status with pagination
     */
    private async fetchSuppliersByStatusPagination(query: GetRecordsByStatusPaginationQuery): Promise<PageDto<any>> {
        if (query.name && query.name.length > 0) {
            // Use findSupplierRecordsByStatusAndName if name is provided
            const records = await this.supplierDatabaseService.findSupplierRecordsByStatusAndName(
                query.status,
                query.name
            );
            // Convert to PageDto format (no pagination for this method)
            return new PageDto(records, null, null);
        } else {
            // Use findRecordsPagination if no name filter
            return await this.supplierDatabaseService.findRecordsPagination(
                query.limit,
                query.status,
                query.direction,
                query.cursorPointer
            );
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, status: string): never {
        this.logger.error(`Error fetching suppliers by status ${status}:`, error);

        // Handle unknown errors by throwing a generic error
        throw new Error(`Failed to fetch suppliers by status: ${status}`);
    }
}
