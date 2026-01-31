import { CreateTerritoryManagerDto, PageDto, TerritoryManagerDto } from '@dto';
import { TerritoryManagerDataType } from '@dynamo-db-lib';

export abstract class TerritoryManagerDatabaseServiceAbstract {
    abstract createRecord(territoryManagerDto: CreateTerritoryManagerDto): Promise<TerritoryManagerDto>;

    abstract findRecordById(id: string): Promise<TerritoryManagerDto | null>;

    abstract findRecordContainingName(name: string): Promise<TerritoryManagerDto[] | null>;

    abstract findRecordByName(name: string): Promise<TerritoryManagerDto | null>;

    abstract updateRecord(territoryManagerData: TerritoryManagerDto): Promise<TerritoryManagerDto>;

    abstract findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<TerritoryManagerDto>>;

    abstract findRecordsByNamePagination(
        limit: number,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<TerritoryManagerDto>>;

    abstract findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<TerritoryManagerDto>>;

    abstract deleteRecord(territoryManagerDto: TerritoryManagerDto): Promise<TerritoryManagerDto>;

    abstract convertToDto(record: TerritoryManagerDto): Promise<TerritoryManagerDto>;

    abstract convertToDtoList(records: TerritoryManagerDto[]): Promise<TerritoryManagerDto[]>;

    abstract convertToDataType(dto: TerritoryManagerDto): Promise<TerritoryManagerDataType>;

    abstract deleteAllRecords(): Promise<void>;

    abstract getDatabaseRecordById(recordId: string): Promise<TerritoryManagerDataType | undefined>;
}
