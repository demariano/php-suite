import { PageDto, ProductUnitRawMaterialDto, ResponseDto } from '@dto';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ProductUnitRawMaterialDatabaseServiceAbstract } from '@product-database-service';
import { GetProductUnitRawMaterialRecordsByProductPaginationQuery } from './get.records.by.product.pagination.query';

// Constants
const HTTP_STATUS_OK = 200;

@QueryHandler(GetProductUnitRawMaterialRecordsByProductPaginationQuery)
export class GetProductUnitRawMaterialRecordsByProductPaginationHandler
    implements IQueryHandler<GetProductUnitRawMaterialRecordsByProductPaginationQuery>
{
    private readonly logger = new Logger(GetProductUnitRawMaterialRecordsByProductPaginationHandler.name);

    constructor(
        @Inject('ProductUnitRawMaterialDatabaseService')
        private readonly productUnitRawMaterialDatabaseService: ProductUnitRawMaterialDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetProductUnitRawMaterialRecordsByProductPaginationQuery
    ): Promise<ResponseDto<PageDto<ProductUnitRawMaterialDto>>> {
        this.logger.log(
            `Processing get product unit raw material records request with pagination for product: ${query.productId}`
        );

        try {
            // Fetch paginated records
            const records = await this.productUnitRawMaterialDatabaseService.findRecordsByProductUnitPagination(
                query.limit,
                query.productId,
                query.direction,
                query.cursorPointer
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
