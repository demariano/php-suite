import { PageDto, RawMaterialsPurchaseOrderDto, ResponseDto } from '@dto';
import { RawMaterialsPurchaseOrderDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRawMaterialsPurchaseOrderRecordsBySupplierPaginationQuery } from './get.records.by.supplier.pagination.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRawMaterialsPurchaseOrderRecordsBySupplierPaginationQuery)
export class GetRawMaterialsPurchaseOrderRecordsBySupplierPaginationHandler
    implements IQueryHandler<GetRawMaterialsPurchaseOrderRecordsBySupplierPaginationQuery>
{
    private readonly logger = new Logger(GetRawMaterialsPurchaseOrderRecordsBySupplierPaginationHandler.name);

    constructor(
        @Inject('RawMaterialsPurchaseOrderDatabaseService')
        private readonly rawMaterialsPurchaseOrderDatabaseService: RawMaterialsPurchaseOrderDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetRawMaterialsPurchaseOrderRecordsBySupplierPaginationQuery
    ): Promise<ResponseDto<PageDto<RawMaterialsPurchaseOrderDto>>> {
        const records = await this.rawMaterialsPurchaseOrderDatabaseService.findRecordsBySupplierPagination(
            query.limit,
            query.supplierId,
            query.direction,
            query.cursorPointer
        );
        return new ResponseDto<PageDto<RawMaterialsPurchaseOrderDto>>(records, HTTP_STATUS_OK);
    }
}
