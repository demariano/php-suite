import { CreateRawMaterialDto, PageDto, RawMaterialDto } from '@dto';

export abstract class RawMaterialDatabaseServiceAbstract {
    abstract createRecord(rawMaterialDto: CreateRawMaterialDto): Promise<RawMaterialDto>;

    abstract findRecordById(id: string): Promise<RawMaterialDto | null>;

    abstract findRecordsByNamePagination(
        limit: number,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<RawMaterialDto>>;

    abstract findRecordByName(name: string): Promise<RawMaterialDto | null>;

    abstract updateRecord(rawMaterialData: RawMaterialDto): Promise<RawMaterialDto>;

    abstract findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<RawMaterialDto>>;

    abstract findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<RawMaterialDto>>;

    abstract deleteRecord(rawMaterialDto: RawMaterialDto): Promise<RawMaterialDto>;

    abstract convertToDto(record: RawMaterialDto): Promise<RawMaterialDto>;

    abstract convertToDtoList(records: RawMaterialDto[]): Promise<RawMaterialDto[]>;

    abstract deleteAllRecords(): Promise<void>;
}
