import { CreatePaymentContractDetailsDto, PaymentContractDetailsDto } from '@dto';
import { DynamoDbLibService, InvoicingSchema, PaymentContractDataType } from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';

import { PaymentContractDatabaseServiceAbstractClass } from './payment-contract-database-service-abstract-class';

@Injectable()
export class PaymentContractDatabaseService implements PaymentContractDatabaseServiceAbstractClass {
    protected readonly logger = new Logger(PaymentContractDatabaseService.name);

    private readonly paymentContractTable: Model<PaymentContractDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_INVOICING_TABLE = configService.get<string>('DYNAMO_DB_INVOICING_TABLE');
        if (!DYNAMO_DB_INVOICING_TABLE) {
            throw new Error('DYNAMO_DB_INVOICING_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.paymentContractTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_INVOICING_TABLE, InvoicingSchema)
            .getModel('PaymentContract');
    }

    async createRecord(paymentContractDto: CreatePaymentContractDetailsDto): Promise<PaymentContractDetailsDto> {
        const paymentData: PaymentContractDataType = {
            paymentId: paymentContractDto.paymentId,
            contractId: paymentContractDto.contractId,
            contractNo: paymentContractDto.contractNo,
            contractName: paymentContractDto.contractName,
            amountApplied: paymentContractDto.amountApplied,
            dateCreated: new Date().toISOString(),
            GSI1PK: `PAYMENTCONTRACT`,
            GSI1SK: paymentContractDto.paymentId,
            GSI2PK: `PAYMENTCONTRACT`,
            GSI2SK: paymentContractDto.contractId,
        };

        const paymentRecord: PaymentContractDataType = await this.paymentContractTable.create(paymentData);

        return await this.convertToDto(paymentRecord);
    }

    async updateRecord(record: PaymentContractDetailsDto): Promise<PaymentContractDetailsDto> {
        const paymentRecord: PaymentContractDataType = await this.convertToDataType(record);

        const updatedPaymentRecord: PaymentContractDataType = await this.paymentContractTable.update(paymentRecord);

        return await this.convertToDto(updatedPaymentRecord);
    }

    async findRecordByPaymentId(paymentId: string): Promise<PaymentContractDetailsDto[]> {
        const records = await this.paymentContractTable.find(
            {
                GSI1PK: `PAYMENTCONTRACT`,
                GSI1SK: paymentId,
            },
            {
                index: 'GSI1',
            }
        );

        return await this.convertToDtoList(records);
    }

    async findRecordByContractId(contractId: string): Promise<PaymentContractDetailsDto[]> {
        const records = await this.paymentContractTable.find(
            {
                GSI2PK: `PAYMENTCONTRACT`,
                GSI2SK: contractId,
            },
            {
                index: 'GSI2',
            }
        );

        return await this.convertToDtoList(records);
    }

    async getDatabaseRecordById(recordId: string): Promise<PaymentContractDataType | undefined> {
        const record: PaymentContractDataType | undefined = await this.paymentContractTable.get({
            PK: 'PAYMENTCONTRACT',
            SK: `${recordId}`,
        });

        return record;
    }

    async deleteRecord(dto: PaymentContractDetailsDto): Promise<PaymentContractDetailsDto> {
        const paymentRecord: PaymentContractDataType = await this.convertToDataType(dto);

        await this.paymentContractTable.remove(paymentRecord);

        return await this.convertToDto(paymentRecord);
    }

    async convertToDto(record: PaymentContractDataType): Promise<PaymentContractDetailsDto> {
        const dto = new PaymentContractDetailsDto();
        dto.paymentContractId = record.paymentContractId ? record.paymentContractId : '';
        dto.paymentId = record.paymentId ? record.paymentId : '';
        dto.contractId = record.contractId ? record.contractId : '';
        dto.contractNo = record.contractNo ? record.contractNo : '';
        dto.contractName = record.contractName ? record.contractName : '';
        dto.amountApplied = record.amountApplied ? record.amountApplied : 0;
        dto.dateCreated = record.dateCreated ? record.dateCreated : '';

        return dto;
    }

    async convertToDtoList(records: PaymentContractDataType[]): Promise<PaymentContractDetailsDto[]> {
        const dtoList: PaymentContractDetailsDto[] = [];

        for (const record of records) {
            const dto: PaymentContractDetailsDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDataType(dto: PaymentContractDetailsDto): Promise<PaymentContractDataType> {
        const paymentData: PaymentContractDataType = {
            paymentContractId: dto.paymentContractId,
            paymentId: dto.paymentId,
            contractId: dto.contractId,
            contractNo: dto.contractNo,
            contractName: dto.contractName,
            amountApplied: dto.amountApplied,
            dateCreated: dto.dateCreated,
            GSI1PK: `PAYMENTCONTRACT`,
            GSI1SK: dto.paymentId,
            GSI2PK: `PAYMENTCONTRACT`,
            GSI2SK: dto.contractId,
        };
        return paymentData;
    }

    async deleteAllRecords(): Promise<void> {
        const records = await this.paymentContractTable.find(
            {
                GSI1PK: 'PAYMENTCONTRACT',
            },
            {
                index: 'GSI1',
            }
        );

        for (const record of records) {
            await this.paymentContractTable.remove(record);
            this.logger.log(`PaymentContract Record deleted: ${JSON.stringify(record)}`);
        }
    }
}
