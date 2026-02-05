import { PageDto, RawMaterialsPurchaseOrderDto, ResponseDto } from '@dto';
import { RawMaterialsPurchaseOrderDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRawMaterialsPurchaseOrderRecordsByApprovalStatusPaginationQuery } from './get.records.by.approval.status.pagination.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRawMaterialsPurchaseOrderRecordsByApprovalStatusPaginationQuery)
export class GetRawMaterialsPurchaseOrderRecordsByApprovalStatusPaginationHandler
    implements IQueryHandler<GetRawMaterialsPurchaseOrderRecordsByApprovalStatusPaginationQuery>
{
    private readonly logger = new Logger(GetRawMaterialsPurchaseOrderRecordsByApprovalStatusPaginationHandler.name);

    constructor(
        @Inject('RawMaterialsPurchaseOrderDatabaseService')
        private readonly rawMaterialsPurchaseOrderDatabaseService: RawMaterialsPurchaseOrderDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetRawMaterialsPurchaseOrderRecordsByApprovalStatusPaginationQuery
    ): Promise<ResponseDto<PageDto<RawMaterialsPurchaseOrderDto>>> {
        const records = await this.rawMaterialsPurchaseOrderDatabaseService.findRecordsByApprovalStatusPagination(
            query.limit,
            query.status,
            query.direction,
            query.cursorPointer,
            query.name
        );
        return new ResponseDto<PageDto<RawMaterialsPurchaseOrderDto>>(records, HTTP_STATUS_OK);
    }
}
