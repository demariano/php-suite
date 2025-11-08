import { SupplierFilterDto } from '@dto';

export class GetRecordsByFilterPaginationQuery {
    supplierFilterDto: SupplierFilterDto;
    limit: number;
    direction: string;
    cursorPointer: string;

    constructor(supplierFilterDto: SupplierFilterDto, limit: number, direction: string, cursorPointer: string) {
        this.supplierFilterDto = supplierFilterDto;
        this.limit = limit;
        this.direction = direction;
        this.cursorPointer = cursorPointer;
    }
}
