import { CreateTownDto, PageDto, TownDto } from '@dto';

export abstract class TownDatabaseServiceAbstract {
    abstract createRecord(townDto: CreateTownDto): Promise<TownDto>;

    abstract findRecordById(id: string): Promise<TownDto | null>;

    abstract findRecordContainingName(name: string): Promise<TownDto[] | null>;

    abstract findRecordByName(name: string): Promise<TownDto | null>;

    abstract updateRecord(townData: TownDto): Promise<TownDto>;

    abstract findRecordByStatusAndAreaId(status: string, areaId: string): Promise<TownDto[] | null>;

    abstract findRecordsPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<TownDto>>;

    abstract deleteRecord(townDto: TownDto): Promise<TownDto>;

    abstract deleteAllRecords(): Promise<void>;

    abstract convertToDto(record: TownDto): Promise<TownDto>;

    abstract convertToDtoList(records: TownDto[]): Promise<TownDto[]>;
}
