import { PageDto, ResponseDto } from '@dto';
import { SupplierDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRecordsPaginationQuery } from './get.records.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetRecordsPaginationQuery)
export class GetRecordsPaginationHandler implements IQueryHandler<GetRecordsPaginationQuery> {
    private readonly logger = new Logger(GetRecordsPaginationHandler.name);

    constructor(
        @Inject('SupplierDatabaseService')
        private readonly supplierDatabaseService: SupplierDatabaseServiceAbstract
    ) {}

    async execute(query: GetRecordsPaginationQuery): Promise<ResponseDto<PageDto<any>>> {
        this.logger.log(`Processing get suppliers pagination request`);

        try {
            // Fetch suppliers with pagination
            const supplierPage = await this.fetchSuppliersPagination(query);

            this.logger.log(`Suppliers retrieved successfully with pagination`);
            return new ResponseDto<PageDto<any>>(supplierPage, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Fetches suppliers with pagination
     */
    private async fetchSuppliersPagination(query: GetRecordsPaginationQuery): Promise<PageDto<any>> {
        return await this.supplierDatabaseService.findRecordsByPagination(
            query.limit,
            query.direction,
            query.cursorPointer
        );
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown): never {
        this.logger.error(`Error fetching suppliers with pagination:`, error);

        // Handle unknown errors by throwing a generic error
        throw new Error('Failed to fetch suppliers with pagination');
    }
}
