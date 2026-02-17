import { CreatePaymentInvoiceDetailsDto, PaymentInvoiceDetailsDto } from '@dto';
import { PaymentInvoiceDataType } from '@dynamo-db-lib';

export abstract class PaymentInvoiceDatabaseServiceAbstractClass {
    abstract createRecord(paymentDto: CreatePaymentInvoiceDetailsDto): Promise<PaymentInvoiceDetailsDto>;

    abstract findRecordByInvoiceId(invoiceId: string): Promise<PaymentInvoiceDetailsDto[]>;

    abstract findRecordByPaymentId(paymentId: string): Promise<PaymentInvoiceDetailsDto[]>;

    abstract findRecordByInvoiceDocno(invoiceDocno: string): Promise<PaymentInvoiceDetailsDto[]>;

    abstract updateRecord(paymentData: PaymentInvoiceDetailsDto): Promise<PaymentInvoiceDetailsDto>;

    abstract deleteRecord(paymentDto: PaymentInvoiceDetailsDto): Promise<PaymentInvoiceDetailsDto>;

    abstract getDatabaseRecordById(recordId: string): Promise<PaymentInvoiceDataType | undefined>;

    abstract convertToDto(record: PaymentInvoiceDataType): Promise<PaymentInvoiceDetailsDto>;

    abstract convertToDtoList(records: PaymentInvoiceDataType[]): Promise<PaymentInvoiceDetailsDto[]>;

    abstract convertToDataType(dto: PaymentInvoiceDetailsDto): Promise<PaymentInvoiceDataType>;

    abstract deleteAllRecords(): Promise<void>;
}
