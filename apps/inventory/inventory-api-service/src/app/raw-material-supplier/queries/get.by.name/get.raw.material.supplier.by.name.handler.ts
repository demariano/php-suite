import { RawMaterialSupplierDto, ResponseDto } from '@dto';
import { RawMaterialSupplierDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRawMaterialSupplierByNameQuery } from './get.raw.material.supplier.by.name.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRawMaterialSupplierByNameQuery)
export class GetRawMaterialSupplierByNameHandler implements IQueryHandler<GetRawMaterialSupplierByNameQuery> {
    private readonly logger = new Logger(GetRawMaterialSupplierByNameHandler.name);

    constructor(
        @Inject('RawMaterialSupplierDatabaseService')
        private readonly rawMaterialSupplierDatabaseService: RawMaterialSupplierDatabaseServiceAbstract
    ) {}

    async execute(query: GetRawMaterialSupplierByNameQuery): Promise<ResponseDto<RawMaterialSupplierDto>> {
        const record = await this.rawMaterialSupplierDatabaseService.findRecordByName(query.name);
        if (!record) {
            throw new NotFoundException(`Raw material supplier not found for name: ${query.name}`);
        }
        return new ResponseDto<RawMaterialSupplierDto>(record, HTTP_STATUS_OK);
    }
}
