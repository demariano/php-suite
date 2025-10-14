import { CreateInvoiceDto, InvoiceDto, PageDto } from '@dto';

export abstract class InvoiceDatabaseServiceAbstract {
    abstract createRecord(invoiceDto: CreateInvoiceDto): Promise<InvoiceDto>;

    abstract findRecordById(id: string): Promise<InvoiceDto | null>;

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

    abstract findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<InvoiceDto>>;

    abstract deleteRecord(invoiceDto: InvoiceDto): Promise<InvoiceDto>;

    abstract convertToDto(record: InvoiceDto): Promise<InvoiceDto>;

    abstract convertToDtoList(records: InvoiceDto[]): Promise<InvoiceDto[]>;

    abstract deleteAllRecords(): Promise<void>;
}
