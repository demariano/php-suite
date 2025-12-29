import { PageDto, RawMaterialSupplierDto, ResponseDto } from '@dto';
import { RawMaterialSupplierDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRawMaterialSupplierRecordsByStatusPaginationQuery } from './get.records.by.status.pagination.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRawMaterialSupplierRecordsByStatusPaginationQuery)
export class GetRawMaterialSupplierRecordsByStatusPaginationHandler
    implements IQueryHandler<GetRawMaterialSupplierRecordsByStatusPaginationQuery>
{
    private readonly logger = new Logger(GetRawMaterialSupplierRecordsByStatusPaginationHandler.name);

    constructor(
        @Inject('RawMaterialSupplierDatabaseService')
        private readonly rawMaterialSupplierDatabaseService: RawMaterialSupplierDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetRawMaterialSupplierRecordsByStatusPaginationQuery
    ): Promise<ResponseDto<PageDto<RawMaterialSupplierDto>>> {
        const page = await this.rawMaterialSupplierDatabaseService.findRecordsByStatusPagination(
            query.limit,
            query.status,
            query.direction,
            query.cursorPointer,
            query.name
        );
        return new ResponseDto<PageDto<RawMaterialSupplierDto>>(page, HTTP_STATUS_OK);
    }
}
