import { ErrorResponseDto, ProductDto, ResponseDto } from '@dto';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ProductDatabaseServiceAbstract } from '@product-database-service';
import { GetProductListReportQuery } from './get.product.list.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetProductListReportQuery)
export class GetProductListReportHandler implements IQueryHandler<GetProductListReportQuery> {
    protected readonly logger = new Logger(GetProductListReportHandler.name);

    constructor(
        @Inject('ProductDatabaseService')
        private readonly productDatabaseService: ProductDatabaseServiceAbstract
    ) {}

    async execute(_query: GetProductListReportQuery): Promise<ResponseDto<ProductDto[] | ErrorResponseDto>> {
        this.logger.log(`Processing product list report`);

        try {
            const allProducts: ProductDto[] = [];
            let cursorPointer: string | undefined = undefined;
            const limit = 1000;
            let hasMore = true;

            while (hasMore) {
                const page = await this.productDatabaseService.findRecordsByPagination(
                    limit,
                    'next',
                    cursorPointer || ''
                );
                allProducts.push(...page.data);
                cursorPointer = page.nextCursorPointer ? JSON.stringify(page.nextCursorPointer) : undefined;
                hasMore = !!page.nextCursorPointer;
            }

            this.logger.log(`Product list report: ${allProducts.length} records found`);
            return new ResponseDto<ProductDto[]>(allProducts, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error(`Error processing product list report:`, error);
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            throw new Error(errorMessage);
        }
    }
}
