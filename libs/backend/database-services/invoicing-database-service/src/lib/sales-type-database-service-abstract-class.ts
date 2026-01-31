import { CreateSalesTypeDto, PageDto, SalesTypeDto } from '@dto';
import { SalesTypeDataType } from '@dynamo-db-lib';

export abstract class SalesTypeDatabaseServiceAbstract {
    abstract createRecord(salesTypeDto: CreateSalesTypeDto): Promise<SalesTypeDto>;

    abstract findRecordById(id: string): Promise<SalesTypeDto | null>;

    abstract findRecordsByNamePagination(
        limit: number,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<SalesTypeDto>>;

    abstract findRecordByName(name: string): Promise<SalesTypeDto | null>;

    abstract updateRecord(salesTypeData: SalesTypeDto): Promise<SalesTypeDto>;

    abstract findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<SalesTypeDto>>;

    abstract findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<SalesTypeDto>>;

    abstract deleteRecord(salesTypeDto: SalesTypeDto): Promise<SalesTypeDto>;

    abstract convertToDto(record: SalesTypeDto): Promise<SalesTypeDto>;

    abstract convertToDtoList(records: SalesTypeDto[]): Promise<SalesTypeDto[]>;

    abstract convertToDataType(dto: SalesTypeDto): Promise<SalesTypeDataType>;

    abstract deleteAllRecords(): Promise<void>;

    abstract getDatabaseRecordById(recordId: string): Promise<SalesTypeDataType | undefined>;
}
