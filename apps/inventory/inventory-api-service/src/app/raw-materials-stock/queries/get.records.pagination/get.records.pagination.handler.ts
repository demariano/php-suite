import { PageDto, RawMaterialsStockDto, ResponseDto } from '@dto';
import { RawMaterialsStockDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRawMaterialsStockRecordsPaginationQuery } from './get.records.pagination.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRawMaterialsStockRecordsPaginationQuery)
export class GetRawMaterialsStockRecordsPaginationHandler
    implements IQueryHandler<GetRawMaterialsStockRecordsPaginationQuery>
{
    private readonly logger = new Logger(GetRawMaterialsStockRecordsPaginationHandler.name);

    constructor(
        @Inject('RawMaterialsStockDatabaseService')
        private readonly rawMaterialsStockDatabaseService: RawMaterialsStockDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetRawMaterialsStockRecordsPaginationQuery
    ): Promise<ResponseDto<PageDto<RawMaterialsStockDto>>> {
        const page = await this.rawMaterialsStockDatabaseService.findRecordsByPagination(
            query.limit,
            query.direction,
            query.cursorPointer
        );
        return new ResponseDto<PageDto<RawMaterialsStockDto>>(page, HTTP_STATUS_OK);
    }
}
