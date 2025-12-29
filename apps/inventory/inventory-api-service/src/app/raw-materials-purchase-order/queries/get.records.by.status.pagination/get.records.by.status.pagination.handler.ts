import { PageDto, RawMaterialsPurchaseOrderDto, ResponseDto } from '@dto';
import { RawMaterialsPurchaseOrderDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRawMaterialsPurchaseOrderRecordsByStatusPaginationQuery } from './get.records.by.status.pagination.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRawMaterialsPurchaseOrderRecordsByStatusPaginationQuery)
export class GetRawMaterialsPurchaseOrderRecordsByStatusPaginationHandler
    implements IQueryHandler<GetRawMaterialsPurchaseOrderRecordsByStatusPaginationQuery>
{
    private readonly logger = new Logger(GetRawMaterialsPurchaseOrderRecordsByStatusPaginationHandler.name);

    constructor(
        @Inject('RawMaterialsPurchaseOrderDatabaseService')
        private readonly rawMaterialsPurchaseOrderDatabaseService: RawMaterialsPurchaseOrderDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetRawMaterialsPurchaseOrderRecordsByStatusPaginationQuery
    ): Promise<ResponseDto<PageDto<RawMaterialsPurchaseOrderDto>>> {
        const records = await this.rawMaterialsPurchaseOrderDatabaseService.findRecordsByStatusPagination(
            query.limit,
            query.poStatus,
            query.direction,
            query.cursorPointer
        );
        return new ResponseDto<PageDto<RawMaterialsPurchaseOrderDto>>(records, HTTP_STATUS_OK);
    }
}
