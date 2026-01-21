import { CollectionReceiptRangeDto, CreateCollectionReceiptRangeDto, PageDto } from '@dto';
import { CollectionReceiptRangeDataType } from '@dynamo-db-lib';

export abstract class CollectionReceiptRangeDatabaseServiceAbstract {
    abstract createRecord(rangeDto: CreateCollectionReceiptRangeDto): Promise<CollectionReceiptRangeDto>;

    abstract findRecordById(id: string): Promise<CollectionReceiptRangeDto | null>;

    abstract findRecordsByAreaId(
        limit: number,
        areaId: string,
        direction: string,
        cursorPointer: string | undefined
    ): Promise<PageDto<CollectionReceiptRangeDto>>;

    abstract findRecordsByRangeStatus(
        limit: number,
        rangeStatus: string,
        direction: string,
        cursorPointer: string | undefined
    ): Promise<PageDto<CollectionReceiptRangeDto>>;

    abstract findActiveRangeByAreaId(areaId: string): Promise<CollectionReceiptRangeDto | null>;

    abstract getNextAvailableReceiptNumber(areaId: string): Promise<number>;

    abstract markReceiptNumberAsUsed(areaId: string, receiptNumber: number): Promise<void>;

    abstract cancelReceiptNumber(
        receiptNumber: number,
        areaId: string,
        cancellationReason: string,
        cancelledBy: string,
        paymentId?: string
    ): Promise<void>;

    abstract updateRecord(rangeData: CollectionReceiptRangeDto): Promise<CollectionReceiptRangeDto>;

    abstract findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string | undefined
    ): Promise<PageDto<CollectionReceiptRangeDto>>;

    abstract deleteRecord(rangeDto: CollectionReceiptRangeDto): Promise<CollectionReceiptRangeDto>;

    abstract findRecordsByAreaIdPagination(
        limit: number,
        areaId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<CollectionReceiptRangeDto>>;

    abstract batchUpdateRecords(ranges: CollectionReceiptRangeDto[]): Promise<void>;

    abstract convertToDto(record: CollectionReceiptRangeDataType): Promise<CollectionReceiptRangeDto>;

    abstract convertToDtoList(records: CollectionReceiptRangeDataType[]): Promise<CollectionReceiptRangeDto[]>;

    abstract deleteAllRecords(): Promise<void>;
}
