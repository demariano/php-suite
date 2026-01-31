import { CreateStockDto, PageDto, StockDto, StockFilterDto } from '@dto';

export abstract class StockDatabaseServiceAbstract {
    abstract createRecord(stockDto: CreateStockDto): Promise<StockDto>;

    abstract findRecordById(id: string): Promise<StockDto | null>;

    abstract findRecordContainingName(name: string): Promise<StockDto[] | null>;

    abstract findRecordsByNamePagination(
        limit: number,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<StockDto>>;

    abstract updateRecord(stockData: StockDto): Promise<StockDto>;

    abstract findRecordsPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<StockDto>>;

    abstract findStockRecordsByStatusAndProductId(status: string, productId: string): Promise<StockDto[]>;

    abstract findAllRecordsByProductAndLot(productId: string, lotNo: string): Promise<StockDto[]>;

    abstract findStockRecordsByFilterPagination(
        filter: StockFilterDto,
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<StockDto>>;

    abstract deleteRecord(stockDto: StockDto): Promise<StockDto>;

    abstract deleteAllRecords(): Promise<void>;

    abstract convertToDto(record: unknown): Promise<StockDto>;

    abstract convertToDtoList(records: unknown[]): Promise<StockDto[]>;

    abstract batchUpdate(records: StockDto[]): Promise<void>;

    abstract findRecordsByStockTypeIdPagination(
        limit: number,
        stockTypeId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<StockDto>>;

    abstract findRecordsByProductIdPagination(
        limit: number,
        productId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<StockDto>>;

    abstract findRecordsByProductUnitIdPagination(
        limit: number,
        productUnitId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<StockDto>>;
}
