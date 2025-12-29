import { CreateRawMaterialSupplierDto, PageDto, RawMaterialSupplierDto } from '@dto';

export abstract class RawMaterialSupplierDatabaseServiceAbstract {
    abstract createRecord(rawMaterialSupplierDto: CreateRawMaterialSupplierDto): Promise<RawMaterialSupplierDto>;

    abstract findRecordById(id: string): Promise<RawMaterialSupplierDto | null>;

    abstract findRecordsByNamePagination(
        limit: number,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<RawMaterialSupplierDto>>;

    abstract findRecordByName(name: string): Promise<RawMaterialSupplierDto | null>;

    abstract updateRecord(rawMaterialSupplierData: RawMaterialSupplierDto): Promise<RawMaterialSupplierDto>;

    abstract findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<RawMaterialSupplierDto>>;

    abstract findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<RawMaterialSupplierDto>>;

    abstract deleteRecord(rawMaterialSupplierDto: RawMaterialSupplierDto): Promise<RawMaterialSupplierDto>;

    abstract convertToDto(record: RawMaterialSupplierDto): Promise<RawMaterialSupplierDto>;

    abstract convertToDtoList(records: RawMaterialSupplierDto[]): Promise<RawMaterialSupplierDto[]>;

    abstract deleteAllRecords(): Promise<void>;
}
