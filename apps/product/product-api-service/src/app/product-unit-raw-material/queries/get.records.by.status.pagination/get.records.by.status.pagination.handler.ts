import { PageDto, ProductUnitRawMaterialDto, ResponseDto } from '@dto';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ProductUnitRawMaterialDatabaseServiceAbstract } from '@product-database-service';
import { GetProductUnitRawMaterialRecordsByStatusPaginationQuery } from './get.records.by.status.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetProductUnitRawMaterialRecordsByStatusPaginationQuery)
export class GetProductUnitRawMaterialRecordsByStatusPaginationHandler
    implements IQueryHandler<GetProductUnitRawMaterialRecordsByStatusPaginationQuery>
{
    private readonly logger = new Logger(GetProductUnitRawMaterialRecordsByStatusPaginationHandler.name);

    constructor(
        @Inject('ProductUnitRawMaterialDatabaseService')
        private readonly productUnitRawMaterialDatabaseService: ProductUnitRawMaterialDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetProductUnitRawMaterialRecordsByStatusPaginationQuery
    ): Promise<ResponseDto<PageDto<ProductUnitRawMaterialDto>>> {
        this.logger.log(
            `Processing get product unit raw material records request with status ${query.status} and pagination`
        );

        try {
            // Fetch paginated records by status
            const records = await this.productUnitRawMaterialDatabaseService.findRecordsByStatusPagination(
                query.limit,
                query.status,
                query.direction,
                query.cursorPointer,
                query.productId
            );

            this.logger.log(`Product unit raw material records retrieved successfully`);
            return new ResponseDto<PageDto<ProductUnitRawMaterialDto>>(records, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown): never {
        this.logger.error(`Error fetching product unit raw material records:`, error);

        // Re-throw the error
        throw error;
    }
}
