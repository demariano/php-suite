import { CreateOverPaymentDto, OverPaymentDto } from '@dto';

export abstract class OverPaymentDatabaseServiceAbstract {
    abstract createRecord(paymentDto: CreateOverPaymentDto): Promise<OverPaymentDto>;

    abstract findRecordByPaymentId(paymentId: string): Promise<OverPaymentDto[]>;

    abstract findRecordByInvoiceId(invoiceId: string): Promise<OverPaymentDto[]>;

    abstract findRecordByCustomerId(customerId: string): Promise<OverPaymentDto[]>;

    abstract updateRecord(paymentData: OverPaymentDto): Promise<OverPaymentDto>;

    abstract deleteRecord(paymentDto: OverPaymentDto): Promise<OverPaymentDto>;

    abstract deleteAllRecords(): Promise<void>;
}
