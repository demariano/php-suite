import { CreatePaymentDto, PageDto, PaymentDto } from '@dto';
import { PaymentDataType } from '@dynamo-db-lib';

export abstract class PaymentDatabaseServiceAbstractClass {
    abstract createRecord(paymentDto: CreatePaymentDto): Promise<PaymentDto>;

    abstract findRecordById(id: string): Promise<PaymentDto | null>;

    abstract findRecordByReceiptNo(receiptNo: string): Promise<PaymentDto | null>;

    abstract findRecordsByNamePagination(
        limit: number,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<PaymentDto>>;

    abstract findRecordContainingReceiptNo(
        limit: number,
        receiptNo: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<PaymentDto>>;

    abstract findRecordByCustomerId(
        limit: number,
        customerId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<PaymentDto>>;

    abstract updateRecord(paymentData: PaymentDto): Promise<PaymentDto>;

    abstract findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        receiptNo?: string
    ): Promise<PageDto<PaymentDto>>;

    abstract findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<PaymentDto>>;

    abstract deleteRecord(paymentDto: PaymentDto): Promise<PaymentDto>;

    abstract getDatabaseRecordById(recordId: string): Promise<PaymentDataType | undefined>;

    abstract convertToDto(record: PaymentDataType): Promise<PaymentDto>;

    abstract convertToDtoList(records: PaymentDataType[]): Promise<PaymentDto[]>;

    abstract convertToDataType(dto: PaymentDto): Promise<PaymentDataType>;

    abstract deleteAllRecords(): Promise<void>;

    abstract findRecordsByContractIdPagination(
        limit: number,
        contractId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<PaymentDto>>;

    abstract batchUpdateRecords(payments: PaymentDto[]): Promise<void>;

    abstract getPaymentsByDateRange(startDate: string, endDate: string): Promise<PaymentDto[]>;

    abstract getPaymentsByDateRangeDetailed(startDate: string, endDate: string): Promise<PaymentDto[]>;

    abstract getPaymentsByDateRangeAllStatuses(startDate: string, endDate: string): Promise<PaymentDto[]>;

    abstract findRecordsByAreaIdPagination(
        limit: number,
        areaId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<PaymentDto>>;
}
