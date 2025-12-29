import { CreateRawMaterialUnitDto, PageDto, RawMaterialUnitDto } from '@dto';

export abstract class RawMaterialUnitDatabaseServiceAbstract {
    abstract createRecord(rawMaterialUnitDto: CreateRawMaterialUnitDto): Promise<RawMaterialUnitDto>;

    abstract findRecordById(id: string): Promise<RawMaterialUnitDto | null>;

    abstract findRecordsByNamePagination(
        limit: number,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<RawMaterialUnitDto>>;

    abstract findRecordByName(name: string): Promise<RawMaterialUnitDto | null>;

    abstract updateRecord(rawMaterialUnitData: RawMaterialUnitDto): Promise<RawMaterialUnitDto>;

    abstract findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<RawMaterialUnitDto>>;

    abstract findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<RawMaterialUnitDto>>;

    abstract deleteRecord(rawMaterialUnitDto: RawMaterialUnitDto): Promise<RawMaterialUnitDto>;

    abstract convertToDto(record: RawMaterialUnitDto): Promise<RawMaterialUnitDto>;

    abstract convertToDtoList(records: RawMaterialUnitDto[]): Promise<RawMaterialUnitDto[]>;

    abstract deleteAllRecords(): Promise<void>;
}
