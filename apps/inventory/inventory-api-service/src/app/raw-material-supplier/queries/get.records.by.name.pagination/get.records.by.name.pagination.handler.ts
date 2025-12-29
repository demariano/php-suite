import { PageDto, RawMaterialSupplierDto, ResponseDto } from '@dto';
import { RawMaterialSupplierDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRawMaterialSupplierRecordsByNamePaginationQuery } from './get.records.by.name.pagination.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRawMaterialSupplierRecordsByNamePaginationQuery)
export class GetRawMaterialSupplierRecordsByNamePaginationHandler
    implements IQueryHandler<GetRawMaterialSupplierRecordsByNamePaginationQuery>
{
    private readonly logger = new Logger(GetRawMaterialSupplierRecordsByNamePaginationHandler.name);

    constructor(
        @Inject('RawMaterialSupplierDatabaseService')
        private readonly rawMaterialSupplierDatabaseService: RawMaterialSupplierDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetRawMaterialSupplierRecordsByNamePaginationQuery
    ): Promise<ResponseDto<PageDto<RawMaterialSupplierDto>>> {
        const page = await this.rawMaterialSupplierDatabaseService.findRecordsByNamePagination(
            query.limit,
            query.direction,
            query.cursorPointer,
            query.name
        );
        return new ResponseDto<PageDto<RawMaterialSupplierDto>>(page, HTTP_STATUS_OK);
    }
}
