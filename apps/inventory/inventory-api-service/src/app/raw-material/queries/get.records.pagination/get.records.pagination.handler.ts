import { PageDto, RawMaterialDto, ResponseDto } from '@dto';
import { RawMaterialDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRawMaterialRecordsPaginationQuery } from './get.records.pagination.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRawMaterialRecordsPaginationQuery)
export class GetRawMaterialRecordsPaginationHandler implements IQueryHandler<GetRawMaterialRecordsPaginationQuery> {
    private readonly logger = new Logger(GetRawMaterialRecordsPaginationHandler.name);

    constructor(
        @Inject('RawMaterialDatabaseService')
        private readonly rawMaterialDatabaseService: RawMaterialDatabaseServiceAbstract
    ) {}

    async execute(query: GetRawMaterialRecordsPaginationQuery): Promise<ResponseDto<PageDto<RawMaterialDto>>> {
        const page = await this.rawMaterialDatabaseService.findRecordsByPagination(
            query.limit,
            query.direction,
            query.cursorPointer
        );
        return new ResponseDto<PageDto<RawMaterialDto>>(page, HTTP_STATUS_OK);
    }
}
