import { CreateStockPurchaseOrderDto, PageDto, StockPurchaseOrderDto } from '@dto';
import { StockPurchaseOrderDataType } from '@dynamo-db-lib';

export abstract class StockPurchaseOrderDatabaseServiceAbstract {
    abstract createRecord(stockPurchaseOrderDto: CreateStockPurchaseOrderDto): Promise<StockPurchaseOrderDto>;

    abstract findRecordById(id: string): Promise<StockPurchaseOrderDto | null>;

    abstract findRecordByDocNo(docNo: string): Promise<StockPurchaseOrderDto | null>;

    abstract findRecordsByStatusPagination(
        limit: number,
        poStatus: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<StockPurchaseOrderDto>>;

    abstract findRecordsByApprovalStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        docNo?: string
    ): Promise<PageDto<StockPurchaseOrderDto>>;

    abstract findRecordsBySupplierPagination(
        limit: number,
        supplierId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<StockPurchaseOrderDto>>;

    abstract findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string,
        docNo?: string
    ): Promise<PageDto<StockPurchaseOrderDto>>;

    abstract updateRecord(stockPurchaseOrderData: StockPurchaseOrderDto): Promise<StockPurchaseOrderDto>;

    abstract deleteRecord(stockPurchaseOrderDto: StockPurchaseOrderDto): Promise<StockPurchaseOrderDto>;

    abstract deleteAllRecords(): Promise<void>;

    abstract convertToDto(record: StockPurchaseOrderDataType): Promise<StockPurchaseOrderDto>;

    abstract convertToDtoList(records: StockPurchaseOrderDataType[]): Promise<StockPurchaseOrderDto[]>;

    abstract convertToDataType(dto: StockPurchaseOrderDto): Promise<StockPurchaseOrderDataType>;

    abstract batchUpdate(records: StockPurchaseOrderDto[]): Promise<void>;

    abstract findRecordsBySupplierIdPagination(
        limit: number,
        supplierId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<StockPurchaseOrderDto>>;
}
