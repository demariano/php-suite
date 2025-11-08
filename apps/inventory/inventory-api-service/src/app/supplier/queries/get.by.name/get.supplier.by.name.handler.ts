import { PageDto, ResponseDto, SupplierFilterDto } from '@dto';
import { SupplierDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetSupplierByNameQuery } from './get.supplier.by.name.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetSupplierByNameQuery)
export class GetSupplierByNameHandler implements IQueryHandler<GetSupplierByNameQuery> {
    private readonly logger = new Logger(GetSupplierByNameHandler.name);

    constructor(
        @Inject('SupplierDatabaseService')
        private readonly supplierDatabaseService: SupplierDatabaseServiceAbstract
    ) {}

    async execute(query: GetSupplierByNameQuery): Promise<ResponseDto<PageDto<any>>> {
        this.logger.log(`Processing get supplier by name request for: ${query.name}`);

        try {
            // Fetch suppliers by name with pagination using filter
            const supplierPage = await this.fetchSuppliersByName(query);

            this.logger.log(`Suppliers retrieved successfully for name: ${query.name}`);
            return new ResponseDto<PageDto<any>>(supplierPage, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, query.name);
        }
    }

    /**
     * Fetches suppliers by name with pagination using filter
     */
    private async fetchSuppliersByName(query: GetSupplierByNameQuery): Promise<PageDto<any>> {
        const filter: SupplierFilterDto = {
            supplierName: query.name,
        };

        return await this.supplierDatabaseService.findSupplierRecordsByFilterPagination(
            filter,
            query.limit,
            query.direction,
            query.cursorPointer
        );
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, name: string): never {
        this.logger.error(`Error fetching suppliers by name ${name}:`, error);

        // Handle unknown errors by throwing a generic error
        throw new Error(`Failed to fetch suppliers by name: ${name}`);
    }
}
