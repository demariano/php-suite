import { AreaDto, CreateAreaDto, PageDto } from '@dto';

export abstract class AreaDatabaseServiceAbstract {
    abstract createRecord(areaDto: CreateAreaDto): Promise<AreaDto>;

    abstract findRecordById(id: string): Promise<AreaDto | null>;

    abstract findRecordContainingName(name: string): Promise<AreaDto[] | null>;

    abstract findRecordByName(name: string): Promise<AreaDto | null>;

    abstract updateRecord(areaData: AreaDto): Promise<AreaDto>;

    abstract findRecordsPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<AreaDto>>;

    abstract deleteRecord(areaDto: AreaDto): Promise<AreaDto>;

    abstract convertToDto(record: AreaDto): Promise<AreaDto>;

    abstract convertToDtoList(records: AreaDto[]): Promise<AreaDto[]>;

    abstract deleteAllRecords(): Promise<void>;
}
