import { RawMaterialsPurchaseOrderDto, ResponseDto } from '@dto';
import { RawMaterialsPurchaseOrderDatabaseServiceAbstract } from '@inventory-database-service';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRawMaterialsPurchaseOrderByIdQuery } from './get.raw.materials.purchase-order.by.id.query';

const HTTP_STATUS_OK = 200;

@QueryHandler(GetRawMaterialsPurchaseOrderByIdQuery)
export class GetRawMaterialsPurchaseOrderByIdHandler implements IQueryHandler<GetRawMaterialsPurchaseOrderByIdQuery> {
    private readonly logger = new Logger(GetRawMaterialsPurchaseOrderByIdHandler.name);

    constructor(
        @Inject('RawMaterialsPurchaseOrderDatabaseService')
        private readonly rawMaterialsPurchaseOrderDatabaseService: RawMaterialsPurchaseOrderDatabaseServiceAbstract
    ) {}

    async execute(query: GetRawMaterialsPurchaseOrderByIdQuery): Promise<ResponseDto<RawMaterialsPurchaseOrderDto>> {
        const record = await this.rawMaterialsPurchaseOrderDatabaseService.findRecordById(query.recordId);
        if (!record) {
            throw new NotFoundException(`Raw materials purchase order not found for ID: ${query.recordId}`);
        }
        return new ResponseDto<RawMaterialsPurchaseOrderDto>(record, HTTP_STATUS_OK);
    }
}
