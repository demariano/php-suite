import { PageDto, RawMaterialSupplierDto, ResponseDto } from '@dto';
import { RawMaterialSupplierDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRawMaterialSupplierRecordsPaginationQuery } from './get.records.pagination.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRawMaterialSupplierRecordsPaginationQuery)
export class GetRawMaterialSupplierRecordsPaginationHandler
    implements IQueryHandler<GetRawMaterialSupplierRecordsPaginationQuery>
{
    private readonly logger = new Logger(GetRawMaterialSupplierRecordsPaginationHandler.name);

    constructor(
        @Inject('RawMaterialSupplierDatabaseService')
        private readonly rawMaterialSupplierDatabaseService: RawMaterialSupplierDatabaseServiceAbstract
    ) {}

    async execute(
        query: GetRawMaterialSupplierRecordsPaginationQuery
    ): Promise<ResponseDto<PageDto<RawMaterialSupplierDto>>> {
        const page = await this.rawMaterialSupplierDatabaseService.findRecordsByPagination(
            query.limit,
            query.direction,
            query.cursorPointer
        );
        return new ResponseDto<PageDto<RawMaterialSupplierDto>>(page, HTTP_STATUS_OK);
    }
}
