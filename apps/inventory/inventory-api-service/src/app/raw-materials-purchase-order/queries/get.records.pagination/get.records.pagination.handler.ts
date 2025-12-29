import { PageDto, RawMaterialsPurchaseOrderDto, ResponseDto } from '@dto';
import { RawMaterialsPurchaseOrderDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRawMaterialsPurchaseOrderRecordsPaginationQuery } from './get.records.pagination.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRawMaterialsPurchaseOrderRecordsPaginationQuery)
export class GetRawMaterialsPurchaseOrderRecordsPaginationHandler
    implements IQueryHandler<GetRawMaterialsPurchaseOrderRecordsPaginationQuery>
{
    private readonly logger = new Logger(GetRawMaterialsPurchaseOrderRecordsPaginationHandler.name);

    constructor(
        @Inject('RawMaterialsPurchaseOrderDatabaseService')
        private readonly rawMaterialsPurchaseOrderDatabaseService: RawMaterialsPurchaseOrderDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetRawMaterialsPurchaseOrderRecordsPaginationQuery
    ): Promise<ResponseDto<PageDto<RawMaterialsPurchaseOrderDto>>> {
        const records = await this.rawMaterialsPurchaseOrderDatabaseService.findRecordsByPagination(
            query.limit,
            query.direction,
            query.cursorPointer
        );
        return new ResponseDto<PageDto<RawMaterialsPurchaseOrderDto>>(records, HTTP_STATUS_OK);
    }
}
