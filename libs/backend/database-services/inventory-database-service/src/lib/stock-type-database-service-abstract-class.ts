import { CreateStockTypeDto, PageDto, StockTypeDto } from '@dto';

export abstract class StockTypeDatabaseServiceAbstract {
    abstract createRecord(stockTypeDto: CreateStockTypeDto): Promise<StockTypeDto>;

    abstract findRecordById(id: string): Promise<StockTypeDto | null>;

    abstract findRecordsByNamePagination(
        limit: number,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<StockTypeDto>>;

    abstract findRecordByName(name: string): Promise<StockTypeDto | null>;

    abstract updateRecord(stockTypeData: StockTypeDto): Promise<StockTypeDto>;

    abstract findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<StockTypeDto>>;

    abstract findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<StockTypeDto>>;

    abstract deleteRecord(stockTypeDto: StockTypeDto): Promise<StockTypeDto>;

    abstract convertToDto(record: StockTypeDto): Promise<StockTypeDto>;

    abstract convertToDtoList(records: StockTypeDto[]): Promise<StockTypeDto[]>;

    abstract deleteAllRecords(): Promise<void>;
}
