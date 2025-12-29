import { RawMaterialSupplierDto, ResponseDto } from '@dto';
import { RawMaterialSupplierDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRawMaterialSupplierByIdQuery } from './get.raw.material.supplier.by.id.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRawMaterialSupplierByIdQuery)
export class GetRawMaterialSupplierByIdHandler implements IQueryHandler<GetRawMaterialSupplierByIdQuery> {
    private readonly logger = new Logger(GetRawMaterialSupplierByIdHandler.name);

    constructor(
        @Inject('RawMaterialSupplierDatabaseService')
        private readonly rawMaterialSupplierDatabaseService: RawMaterialSupplierDatabaseServiceAbstract
    ) {}

    async execute(query: GetRawMaterialSupplierByIdQuery): Promise<ResponseDto<RawMaterialSupplierDto>> {
        const record = await this.rawMaterialSupplierDatabaseService.findRecordById(query.recordId);
        if (!record) {
            throw new NotFoundException(`Raw material supplier not found for ID: ${query.recordId}`);
        }
        return new ResponseDto<RawMaterialSupplierDto>(record, HTTP_STATUS_OK);
    }
}
