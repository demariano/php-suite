import { CreateSupplierDto, PageDto, SupplierDto, SupplierFilterDto } from '@dto';
import { SupplierDataType } from '@dynamo-db-lib';

export abstract class SupplierDatabaseServiceAbstract {
    abstract createRecord(supplierDto: CreateSupplierDto): Promise<SupplierDto>;

    abstract findRecordById(id: string): Promise<SupplierDto | null>;

    abstract findRecordContainingName(name: string): Promise<SupplierDto[] | null>;

    abstract updateRecord(supplierData: SupplierDto): Promise<SupplierDto>;

    abstract findRecordsPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<SupplierDto>>;

    abstract findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<SupplierDto>>;

    abstract findSupplierRecordsByStatusAndName(status: string, name: string): Promise<SupplierDto[]>;

    abstract findSupplierRecordsByFilterPagination(
        filter: SupplierFilterDto,
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<SupplierDto>>;

    abstract deleteRecord(supplierDto: SupplierDto): Promise<SupplierDto>;

    abstract deleteAllRecords(): Promise<void>;

    abstract convertToDto(record: SupplierDataType): Promise<SupplierDto>;

    abstract convertToDtoList(records: SupplierDataType[]): Promise<SupplierDto[]>;
}
