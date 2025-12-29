import { RawMaterialsStockDto, ResponseDto } from '@dto';
import { RawMaterialsStockDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRawMaterialsStockByIdQuery } from './get.raw.materials.stock.by.id.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRawMaterialsStockByIdQuery)
export class GetRawMaterialsStockByIdHandler implements IQueryHandler<GetRawMaterialsStockByIdQuery> {
    private readonly logger = new Logger(GetRawMaterialsStockByIdHandler.name);

    constructor(
        @Inject('RawMaterialsStockDatabaseService')
        private readonly rawMaterialsStockDatabaseService: RawMaterialsStockDatabaseServiceAbstract
    ) {}

    async execute(query: GetRawMaterialsStockByIdQuery): Promise<ResponseDto<RawMaterialsStockDto>> {
        const record = await this.rawMaterialsStockDatabaseService.findRecordById(query.recordId);
        if (!record) {
            throw new NotFoundException(`Raw materials stock not found for ID: ${query.recordId}`);
        }
        return new ResponseDto<RawMaterialsStockDto>(record, HTTP_STATUS_OK);
    }
}
