import { CreateRawMaterialsLocationDto, PageDto, RawMaterialsLocationDto } from '@dto';

export abstract class RawMaterialsLocationDatabaseServiceAbstract {
    abstract createRecord(rawMaterialsLocationDto: CreateRawMaterialsLocationDto): Promise<RawMaterialsLocationDto>;

    abstract findRecordById(id: string): Promise<RawMaterialsLocationDto | null>;

    abstract findRecordsByNamePagination(
        limit: number,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<RawMaterialsLocationDto>>;

    abstract findRecordByName(name: string): Promise<RawMaterialsLocationDto | null>;

    abstract updateRecord(rawMaterialsLocationData: RawMaterialsLocationDto): Promise<RawMaterialsLocationDto>;

    abstract findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<RawMaterialsLocationDto>>;

    abstract findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<RawMaterialsLocationDto>>;

    abstract deleteRecord(rawMaterialsLocationDto: RawMaterialsLocationDto): Promise<RawMaterialsLocationDto>;

    abstract convertToDto(record: RawMaterialsLocationDto): Promise<RawMaterialsLocationDto>;

    abstract convertToDtoList(records: RawMaterialsLocationDto[]): Promise<RawMaterialsLocationDto[]>;

    abstract deleteAllRecords(): Promise<void>;
}
