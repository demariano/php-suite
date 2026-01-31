import { CreateReturnGoodSoldDto, PageDto, ReturnGoodSoldDto } from '@dto';
import { ReturnGoodSoldDataType } from '@dynamo-db-lib';

export abstract class ReturnGoodSoldDatabaseServiceAbstractClass {
    abstract createRecord(returnGoodSoldDto: CreateReturnGoodSoldDto): Promise<ReturnGoodSoldDto>;

    abstract findRecordById(id: string): Promise<ReturnGoodSoldDto | null>;

    abstract findRecordByRgsDocno(rgsDocno: string): Promise<ReturnGoodSoldDto | null>;

    abstract findRecordsByInvoiceId(
        limit: number,
        invoiceId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ReturnGoodSoldDto>>;

    abstract findRecordsByCustomerId(
        limit: number,
        customerId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ReturnGoodSoldDto>>;

    abstract findRecordContainingDocNo(
        limit: number,
        docno: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ReturnGoodSoldDto>>;

    abstract findRecordsByRgsDocnoPagination(
        limit: number,
        direction: string,
        cursorPointer: string,
        rgsDocno: string
    ): Promise<PageDto<ReturnGoodSoldDto>>;

    abstract findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        rgsDocno?: string
    ): Promise<PageDto<ReturnGoodSoldDto>>;

    abstract findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ReturnGoodSoldDto>>;

    abstract updateRecord(returnGoodSoldData: ReturnGoodSoldDto): Promise<ReturnGoodSoldDto>;

    abstract deleteRecord(returnGoodSoldDto: ReturnGoodSoldDto): Promise<ReturnGoodSoldDto>;

    abstract getDatabaseRecordById(recordId: string): Promise<ReturnGoodSoldDataType | undefined>;

    abstract convertToDto(record: ReturnGoodSoldDataType): Promise<ReturnGoodSoldDto>;

    abstract convertToDtoList(records: ReturnGoodSoldDataType[]): Promise<ReturnGoodSoldDto[]>;

    abstract convertToDataType(dto: ReturnGoodSoldDto): Promise<ReturnGoodSoldDataType>;

    abstract deleteAllRecords(): Promise<void>;

    abstract getReturnGoodSoldCountByAreaId(areaId: string): Promise<number>;

    abstract batchUpdateRecords(returnGoodSolds: ReturnGoodSoldDto[]): Promise<void>;
}
