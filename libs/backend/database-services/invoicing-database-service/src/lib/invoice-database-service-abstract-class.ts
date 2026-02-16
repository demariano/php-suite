import { CreateInvoiceDto, InvoiceDto, InvoicePaymentDto, PageDto } from '@dto';
import { InvoiceDataType } from '@dynamo-db-lib';

export abstract class InvoiceDatabaseServiceAbstract {
    abstract createRecord(invoiceDto: CreateInvoiceDto): Promise<InvoiceDto>;

    abstract findRecordById(id: string): Promise<InvoiceDto | null>;

    abstract findRecordsByContractId(contractId: string): Promise<InvoiceDto[] | null>;

    abstract findRecordContainingDocno(
        limit: number,
        docno: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<InvoiceDto>>;

    abstract findRecordByDocno(docno: string): Promise<InvoiceDto | null>;

    abstract updateRecord(invoiceData: InvoiceDto): Promise<InvoiceDto>;

    abstract findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        docno: string
    ): Promise<PageDto<InvoiceDto>>;

    abstract findPendingPaymentInvoices(
        customerId: string,
        status: string,
        contractId?: string,
        nonContractOnly?: boolean
    ): Promise<InvoiceDto[] | null>;

    abstract findRecordsByCustomerIdPagination(
        limit: number,
        customerId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<InvoiceDto>>;

    abstract findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<InvoiceDto>>;

    abstract deleteRecord(invoiceDto: InvoiceDto): Promise<InvoiceDto>;

    abstract convertToDto(record: InvoiceDataType): Promise<InvoiceDto>;

    abstract convertToDtoList(records: InvoiceDataType[]): Promise<InvoiceDto[]>;

    abstract convertToDataType(dto: InvoiceDto): Promise<InvoiceDataType>;

    abstract deleteAllRecords(): Promise<void>;

    abstract getDatabaseRecordById(recordId: string): Promise<InvoiceDataType | undefined>;

    abstract getInvoiceCount(): Promise<number>;

    abstract addPaymentToInvoice(invoiceId: string, payment: InvoicePaymentDto): Promise<InvoiceDto>;

    abstract removePaymentFromInvoice(invoiceId: string, paymentId: string): Promise<InvoiceDto>;

    abstract updatePaymentInInvoice(
        invoiceId: string,
        paymentId: string,
        updatedPayment: InvoicePaymentDto
    ): Promise<InvoiceDto>;

    abstract findRecordsByContractIdPagination(
        limit: number,
        contractId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<InvoiceDto>>;

    abstract getInvoicesByDateRange(startDate: string, endDate: string, fields: string[]): Promise<InvoiceDto[]>;

    abstract getInvoicesByCustomerAndDateRange(
        customerId: string,
        startDate: string,
        endDate: string,
        fields?: string[]
    ): Promise<InvoiceDto[]>;

    abstract getPendingPaymentInvoiceCount(startDate?: string, endDate?: string): Promise<number>;

    abstract getPendingPaymentInvoices(startDate?: string, endDate?: string): Promise<InvoiceDto[]>;

    abstract findRecordsByTermsIdPagination(
        limit: number,
        termsId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<InvoiceDto>>;

    abstract findRecordsByProductPriceTypeIdPagination(
        limit: number,
        productPriceTypeId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<InvoiceDto>>;

    abstract batchUpdateRecords(invoices: InvoiceDto[]): Promise<void>;
}
