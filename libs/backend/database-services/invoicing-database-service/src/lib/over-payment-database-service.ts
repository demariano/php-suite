import { CreateOverPaymentDto, OverPaymentDto } from '@dto';
import { DynamoDbLibService, InvoicingSchema, OverPaymentDataType, PaymentDataType } from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { OverPaymentDatabaseServiceAbstract } from './over-payment-database-service-abstract-class';

@Injectable()
export class OverPaymentDatabaseService implements OverPaymentDatabaseServiceAbstract {
    protected readonly logger = new Logger(OverPaymentDatabaseService.name);

    private readonly overPaymentTable: Model<OverPaymentDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_INVOICING_TABLE = configService.get<string>('DYNAMO_DB_INVOICING_TABLE');
        if (!DYNAMO_DB_INVOICING_TABLE) {
            throw new Error('DYNAMO_DB_INVOICING_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.overPaymentTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_INVOICING_TABLE, InvoicingSchema)
            .getModel('OverPayment');
    }

    async createRecord(overPaymentDto: CreateOverPaymentDto): Promise<OverPaymentDto> {
        const paymentData: OverPaymentDataType = {
            overPaymentAmount: overPaymentDto.overPaymentAmount,
            paymentId: overPaymentDto.paymentId,
            GSI1PK: `OVERPAYMENT`,
            GSI1SK: overPaymentDto.paymentId,
        };

        const paymentRecord: PaymentDataType = await this.overPaymentTable.create(paymentData);

        return await this.convertToDto(paymentRecord);
    }

    async updateRecord(record: OverPaymentDto): Promise<OverPaymentDto> {
        const paymentRecord: OverPaymentDataType = await this.convertToDataType(record);

        const updatedOverPaymentRecord: OverPaymentDataType = await this.overPaymentTable.update(paymentRecord);

        return await this.convertToDto(updatedOverPaymentRecord);
    }

    async findRecordByPaymentId(paymentId: string): Promise<OverPaymentDto[]> {
        const records = await this.overPaymentTable.find(
            {
                GSI1PK: `PAYMENT`,
                GSI1SK: paymentId,
            },
            {
                index: 'GSI1',
            }
        );

        return await this.convertToDtoList(records);
    }

    async findRecordByInvoiceId(invoiceId: string): Promise<OverPaymentDto[]> {
        const records = await this.overPaymentTable.find(
            {
                GSI2PK: `PAYMENT`,
                GSI1SK: invoiceId,
            },
            {
                index: 'GSI2',
            }
        );

        return await this.convertToDtoList(records);
    }

    async findRecordByCustomerId(customerId: string): Promise<OverPaymentDto[]> {
        const records = await this.overPaymentTable.find(
            {
                GSI3PK: `PAYMENT`,
                GSI3SK: customerId,
            },
            {
                index: 'GSI2',
            }
        );

        return await this.convertToDtoList(records);
    }

    async deleteRecord(dto: OverPaymentDto): Promise<OverPaymentDto> {
        const paymentRecord: OverPaymentDataType = await this.convertToDataType(dto);

        await this.overPaymentTable.remove(paymentRecord);

        return await this.convertToDto(paymentRecord);
    }

    async convertToDto(record: OverPaymentDataType): Promise<OverPaymentDto> {
        const dto = new OverPaymentDto();
        dto.paymentId = record.paymentId ? record.paymentId : '';
        dto.overPaymentAmount = record.overPaymentAmount ? record.overPaymentAmount : 0;
        dto.customerId = record.customerId ? record.customerId : '';
        dto.invoiceId = record.invoiceId ? record.invoiceId : '';
        return dto;
    }

    async convertToDtoList(records: OverPaymentDataType[]): Promise<OverPaymentDto[]> {
        const dtoList: OverPaymentDto[] = [];

        for (const record of records) {
            const dto: OverPaymentDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDataType(dto: OverPaymentDto): Promise<OverPaymentDataType> {
        const paymentData: OverPaymentDataType = {
            paymentId: dto.paymentId,
            overPaymentAmount: dto.overPaymentAmount,
            customerId: dto.customerId,
            invoiceId: dto.invoiceId,
            GSI1PK: `PAYMENT`,
            GSI1SK: dto.paymentId,
            GSI2PK: `PAYMENT`,
            GSI2SK: dto.invoiceId,
            GSI3PK: `PAYMENT`,
            GSI3SK: dto.customerId,
        };
        return paymentData;
    }

    async deleteAllRecords(): Promise<void> {
        const records = await this.overPaymentTable.find(
            {
                GSI1PK: 'OVERPAYMENT',
            },
            {
                index: 'GSI1',
            }
        );

        for (const record of records) {
            await this.overPaymentTable.remove(record);
            this.logger.log(`OverPayment Record deleted: ${JSON.stringify(record)}`);
        }
    }
}
