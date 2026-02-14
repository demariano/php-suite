import { CreatePaymentInvoiceDetailsDto, PaymentInvoiceDetailsDto } from '@dto';
import { DynamoDbLibService, InvoicingSchema, PaymentInvoiceDataType } from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';

import { PaymentInvoiceDatabaseServiceAbstractClass } from './payment-invoice-database-service-abstract-class';

@Injectable()
export class PaymentInvoiceDatabaseService implements PaymentInvoiceDatabaseServiceAbstractClass {
    protected readonly logger = new Logger(PaymentInvoiceDatabaseService.name);

    private readonly paymentInvoiceTable: Model<PaymentInvoiceDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_INVOICING_TABLE = configService.get<string>('DYNAMO_DB_INVOICING_TABLE');
        if (!DYNAMO_DB_INVOICING_TABLE) {
            throw new Error('DYNAMO_DB_INVOICING_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.paymentInvoiceTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_INVOICING_TABLE, InvoicingSchema)
            .getModel('PaymentInvoice');
    }

    async createRecord(paymentInvoiceDto: CreatePaymentInvoiceDetailsDto): Promise<PaymentInvoiceDetailsDto> {
        const paymentData: PaymentInvoiceDataType = {
            paymentId: paymentInvoiceDto.paymentId,
            invoiceId: paymentInvoiceDto.invoiceId,
            docno: paymentInvoiceDto.docno,
            amountApplied: paymentInvoiceDto.amountApplied,
            customerCreditPayment: paymentInvoiceDto.customerCreditPayment,
            dateCreated: new Date().toISOString(),
            GSI1PK: `PAYMENTINVOICE`,
            GSI1SK: paymentInvoiceDto.paymentId,
            GSI2PK: `PAYMENTINVOICE`,
            GSI2SK: paymentInvoiceDto.invoiceId,
            GSI3PK: `PAYMENTINVOICE`,
            GSI3SK: paymentInvoiceDto.docno,
        };

        const paymentRecord: PaymentInvoiceDataType = await this.paymentInvoiceTable.create(paymentData);

        return await this.convertToDto(paymentRecord);
    }

    async updateRecord(record: PaymentInvoiceDetailsDto): Promise<PaymentInvoiceDetailsDto> {
        const paymentRecord: PaymentInvoiceDataType = await this.convertToDataType(record);

        const updatedPaymentRecord: PaymentInvoiceDataType = await this.paymentInvoiceTable.update(paymentRecord);

        return await this.convertToDto(updatedPaymentRecord);
    }

    async findRecordByPaymentId(paymentId: string): Promise<PaymentInvoiceDetailsDto[]> {
        const records = await this.paymentInvoiceTable.find(
            {
                GSI1PK: `PAYMENTINVOICE`,
                GSI1SK: paymentId,
            },
            {
                index: 'GSI1',
            }
        );

        return await this.convertToDtoList(records);
    }

    async findRecordByInvoiceId(invoiceId: string): Promise<PaymentInvoiceDetailsDto[]> {
        const records = await this.paymentInvoiceTable.find(
            {
                GSI2PK: `PAYMENTINVOICE`,
                GSI2SK: invoiceId,
            },
            {
                index: 'GSI2',
            }
        );

        return await this.convertToDtoList(records);
    }

    async findRecordByInvoiceDocno(invoiceDocno: string): Promise<PaymentInvoiceDetailsDto[]> {
        const records = await this.paymentInvoiceTable.find(
            {
                GSI3PK: `PAYMENTINVOICE`,
                GSI3SK: invoiceDocno,
            },
            {
                index: 'GSI3',
            }
        );

        return await this.convertToDtoList(records);
    }

    async getDatabaseRecordById(recordId: string): Promise<PaymentInvoiceDataType | undefined> {
        const record: PaymentInvoiceDataType | undefined = await this.paymentInvoiceTable.get({
            PK: 'PAYMENTINVOICE',
            SK: `${recordId}`,
        });

        return record;
    }

    async deleteRecord(dto: PaymentInvoiceDetailsDto): Promise<PaymentInvoiceDetailsDto> {
        const paymentRecord: PaymentInvoiceDataType = await this.convertToDataType(dto);

        await this.paymentInvoiceTable.remove(paymentRecord);

        return await this.convertToDto(paymentRecord);
    }

    async convertToDto(record: PaymentInvoiceDataType): Promise<PaymentInvoiceDetailsDto> {
        const dto = new PaymentInvoiceDetailsDto();
        dto.paymentId = record.paymentId ? record.paymentId : '';
        dto.invoiceId = record.invoiceId ? record.invoiceId : '';
        dto.docno = record.docno ? record.docno : '';
        dto.amountApplied = record.amountApplied ? record.amountApplied : 0;
        dto.paymentId = record.paymentId ? record.paymentId : '';
        dto.dateCreated = record.dateCreated ? record.dateCreated : '';
        dto.customerCreditPayment = record.customerCreditPayment ? record.customerCreditPayment : false;

        return dto;
    }

    async convertToDtoList(records: PaymentInvoiceDataType[]): Promise<PaymentInvoiceDetailsDto[]> {
        const dtoList: PaymentInvoiceDetailsDto[] = [];

        for (const record of records) {
            const dto: PaymentInvoiceDetailsDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDataType(dto: PaymentInvoiceDetailsDto): Promise<PaymentInvoiceDataType> {
        const paymentData: PaymentInvoiceDataType = {
            paymentDetailsId: dto.paymentDetailsId,
            paymentId: dto.paymentId,
            invoiceId: dto.invoiceId,
            docno: dto.docno,
            amountApplied: dto.amountApplied,
            dateCreated: dto.dateCreated,
            customerCreditPayment: dto.customerCreditPayment,
            GSI1PK: `PAYMENTINVOICE`,
            GSI1SK: dto.paymentId,
            GSI2PK: `PAYMENTINVOICE`,
            GSI2SK: dto.invoiceId,
            GSI3PK: `PAYMENTINVOICE`,
            GSI3SK: dto.docno,
        };
        return paymentData;
    }
}
