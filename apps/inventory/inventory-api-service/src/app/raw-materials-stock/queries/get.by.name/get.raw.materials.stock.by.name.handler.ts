import { RawMaterialsStockDto, ResponseDto } from '@dto';
import { RawMaterialsStockDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRawMaterialsStockByNameQuery } from './get.raw.materials.stock.by.name.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRawMaterialsStockByNameQuery)
export class GetRawMaterialsStockByNameHandler implements IQueryHandler<GetRawMaterialsStockByNameQuery> {
    private readonly logger = new Logger(GetRawMaterialsStockByNameHandler.name);

    constructor(
        @Inject('RawMaterialsStockDatabaseService')
        private readonly rawMaterialsStockDatabaseService: RawMaterialsStockDatabaseServiceAbstract
    ) {}

    async execute(query: GetRawMaterialsStockByNameQuery): Promise<ResponseDto<RawMaterialsStockDto>> {
        const record = await this.rawMaterialsStockDatabaseService.findRecordByName(query.name);
        if (!record) {
            throw new NotFoundException(`Raw materials stock not found for name: ${query.name}`);
        }
        return new ResponseDto<RawMaterialsStockDto>(record, HTTP_STATUS_OK);
    }
}
