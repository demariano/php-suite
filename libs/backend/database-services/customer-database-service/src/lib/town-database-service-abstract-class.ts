import { CreateTownDto, PageDto, TownDto } from '@dto';

export abstract class TownDatabaseServiceAbstract {
    abstract createRecord(townDto: CreateTownDto): Promise<TownDto>;

    abstract findRecordById(id: string): Promise<TownDto | null>;

    abstract findRecordContainingName(
        limit: number,
        name: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<TownDto>>;

    abstract findRecordByName(name: string): Promise<TownDto | null>;

    abstract findRecordsByNamePagination(
        limit: number,
        name: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<TownDto>>;

    abstract updateRecord(townData: TownDto): Promise<TownDto>;

    abstract findRecordByStatusAndAreaId(status: string, areaId: string): Promise<TownDto[] | null>;

    abstract findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<TownDto>>;

    abstract findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<TownDto>>;

    abstract deleteRecord(townDto: TownDto): Promise<TownDto>;

    abstract deleteAllRecords(): Promise<void>;

    abstract convertToDto(record: TownDto): Promise<TownDto>;

    abstract convertToDtoList(records: TownDto[]): Promise<TownDto[]>;
}
