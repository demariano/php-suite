import { CreateStockDeliveryDto, PageDto, StockDeliveryDto, StockDeliveryFilterDto } from '@dto';
import { StockDeliveryDataType } from '@dynamo-db-lib';

export abstract class StockDeliveryDatabaseServiceAbstract {
    abstract createRecord(stockDeliveryDto: CreateStockDeliveryDto): Promise<StockDeliveryDto>;

    abstract findRecordById(id: string): Promise<StockDeliveryDto | null>;

    abstract findRecordContainingDocno(docno: string): Promise<StockDeliveryDto[] | null>;

    abstract getDatabaseRecordById(recordId: string): Promise<StockDeliveryDataType | undefined>;

    abstract updateRecord(stockDeliveryData: StockDeliveryDto): Promise<StockDeliveryDto>;

    abstract findRecordsPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<StockDeliveryDto>>;

    abstract findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        docno: string
    ): Promise<PageDto<StockDeliveryDto>>;

    abstract findStockDeliveryRecordsByStatusAndSupplierId(
        status: string,
        supplierId: string
    ): Promise<StockDeliveryDto[]>;

    abstract findStockDeliveryRecordsByFilterPagination(
        filter: StockDeliveryFilterDto,
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<StockDeliveryDto>>;

    abstract deleteRecord(stockDeliveryDto: StockDeliveryDto): Promise<StockDeliveryDto>;

    abstract deleteAllRecords(): Promise<void>;

    abstract convertToDto(record: StockDeliveryDataType): Promise<StockDeliveryDto>;

    abstract convertToDtoList(records: StockDeliveryDataType[]): Promise<StockDeliveryDto[]>;

    abstract convertToDataType(dto: StockDeliveryDto): Promise<StockDeliveryDataType>;
}
