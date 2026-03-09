import { CreatePaymentContractDetailsDto, PaymentContractDetailsDto } from '@dto';
import { PaymentContractDataType } from '@dynamo-db-lib';

export abstract class PaymentContractDatabaseServiceAbstractClass {
    abstract createRecord(paymentDto: CreatePaymentContractDetailsDto): Promise<PaymentContractDetailsDto>;

    abstract findRecordByContractId(contractId: string): Promise<PaymentContractDetailsDto[]>;

    abstract findRecordByPaymentId(paymentId: string): Promise<PaymentContractDetailsDto[]>;

    abstract updateRecord(paymentData: PaymentContractDetailsDto): Promise<PaymentContractDetailsDto>;

    abstract deleteRecord(paymentDto: PaymentContractDetailsDto): Promise<PaymentContractDetailsDto>;

    abstract getDatabaseRecordById(recordId: string): Promise<PaymentContractDataType | undefined>;

    abstract convertToDto(record: PaymentContractDataType): Promise<PaymentContractDetailsDto>;

    abstract convertToDtoList(records: PaymentContractDataType[]): Promise<PaymentContractDetailsDto[]>;

    abstract convertToDataType(dto: PaymentContractDetailsDto): Promise<PaymentContractDataType>;

    abstract deleteAllRecords(): Promise<void>;
}
