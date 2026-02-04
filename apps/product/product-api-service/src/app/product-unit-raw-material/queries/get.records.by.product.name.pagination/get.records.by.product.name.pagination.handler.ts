import { PageDto, ProductUnitRawMaterialDto, ResponseDto } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ProductUnitRawMaterialDatabaseServiceAbstract } from '@product-database-service';
import { GetProductUnitRawMaterialRecordsByProductNamePaginationQuery } from './get.records.by.product.name.pagination.query';

const HTTP_STATUS_OK = 200;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

@QueryHandler(GetProductUnitRawMaterialRecordsByProductNamePaginationQuery)
export class GetProductUnitRawMaterialRecordsByProductNamePaginationHandler
    implements IQueryHandler<GetProductUnitRawMaterialRecordsByProductNamePaginationQuery>
{
    private readonly logger = new Logger(GetProductUnitRawMaterialRecordsByProductNamePaginationHandler.name);

    constructor(
        @Inject('ProductUnitRawMaterialDatabaseService')
        private readonly productUnitRawMaterialDatabaseService: ProductUnitRawMaterialDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetProductUnitRawMaterialRecordsByProductNamePaginationQuery
    ): Promise<ResponseDto<PageDto<ProductUnitRawMaterialDto>>> {
        this.logger.log(`Searching product unit raw materials by product name: ${query.productName}`);

        try {
            this.validateQueryParameters(query);

            const productRecords = await this.productUnitRawMaterialDatabaseService.findRecordsByProductNamePagination(
                query.limit,
                query.productName,
                query.direction,
                query.cursorPointer
            );

            this.logger.log(
                `Retrieved ${productRecords.data.length} product unit raw materials matching "${query.productName}"`
            );
            return new ResponseDto<PageDto<ProductUnitRawMaterialDto>>(productRecords, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error);
        }
    }

    private validateQueryParameters(query: GetProductUnitRawMaterialRecordsByProductNamePaginationQuery): void {
        if (!query.limit || query.limit < MIN_LIMIT || query.limit > MAX_LIMIT) {
            throw new BadRequestException(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
        }

        if (!query.productName || query.productName.trim() === '') {
            throw new BadRequestException('Product name is required for search');
        }
    }

    private handleError(error: any): ResponseDto<PageDto<ProductUnitRawMaterialDto>> {
        this.logger.error('Error retrieving product unit raw materials by product name', error.stack);

        const errorMessage = error instanceof BadRequestException ? error.message : 'Failed to fetch records';

        return new ResponseDto<PageDto<ProductUnitRawMaterialDto>>(
            new PageDto<ProductUnitRawMaterialDto>([], undefined, undefined),
            error instanceof BadRequestException ? 400 : 500,
            errorMessage
        );
    }
}
