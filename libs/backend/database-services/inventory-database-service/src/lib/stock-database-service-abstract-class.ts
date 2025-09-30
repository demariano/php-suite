import { CreateStockDto, PageDto, StockDto } from '@dto';

export abstract class StockDatabaseServiceAbstract {
    abstract createRecord(stockDto: CreateStockDto): Promise<StockDto>;

    abstract findRecordById(id: string): Promise<StockDto | null>;

    abstract findRecordContainingName(name: string): Promise<StockDto[] | null>;

    abstract updateRecord(stockData: StockDto): Promise<StockDto>;

    abstract findRecordsPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<StockDto>>;

    abstract findStockRecordsByStatusAndProductId(status: string, productId: string): Promise<StockDto[]>;

    abstract deleteRecord(stockDto: StockDto): Promise<StockDto>;

    abstract deleteAllRecords(): Promise<void>;

    abstract convertToDto(record: StockDto): Promise<StockDto>;

    abstract convertToDtoList(records: StockDto[]): Promise<StockDto[]>;
}
