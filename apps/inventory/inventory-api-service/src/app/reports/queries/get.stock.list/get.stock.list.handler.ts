import { ErrorResponseDto, ResponseDto, StockDto } from '@dto';
import { StockDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetStockListReportQuery } from './get.stock.list.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetStockListReportQuery)
export class GetStockListReportHandler implements IQueryHandler<GetStockListReportQuery> {
    protected readonly logger = new Logger(GetStockListReportHandler.name);

    constructor(
        @Inject('StockDatabaseService')
        private readonly stockDatabaseService: StockDatabaseServiceAbstract
    ) {}

    async execute(_query: GetStockListReportQuery): Promise<ResponseDto<StockDto[] | ErrorResponseDto>> {
        this.logger.log(`Processing stock list report`);

        try {
            const allStocks: StockDto[] = [];
            let cursorPointer: string | undefined = undefined;
            const limit = 1000;
            let hasMore = true;

            while (hasMore) {
                const page = await this.stockDatabaseService.findRecordsPagination(
                    limit,
                    'ACTIVE',
                    'next',
                    cursorPointer || ''
                );
                allStocks.push(...page.data);
                cursorPointer = page.nextCursorPointer ? JSON.stringify(page.nextCursorPointer) : undefined;
                hasMore = !!page.nextCursorPointer;
            }

            this.logger.log(`Stock list report: ${allStocks.length} records found`);
            return new ResponseDto<StockDto[]>(allStocks, HTTP_STATUS_OK);
        } catch (error) {
            this.logger.error(`Error processing stock list report:`, error);
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            throw new Error(errorMessage);
        }
    }
}
