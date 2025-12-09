import { ChequeClearStatusEnum, CreatePaymentDto, PageDto, PaymentDto, StatusEnum } from '@dto';
import {
    createDynamoDbOptionWithPKSKIndex,
    DynamoDbLibService,
    InvoicingSchema,
    pageRecordHandler,
    PaymentDataType,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';

import { PaymentDatabaseServiceAbstractClass } from './payment-database-service-abstract-class';

@Injectable()
export class PaymentDatabaseService implements PaymentDatabaseServiceAbstractClass {
    protected readonly logger = new Logger(PaymentDatabaseService.name);

    private readonly paymentTable: Model<PaymentDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_INVOICING_TABLE = configService.get<string>('DYNAMO_DB_INVOICING_TABLE');
        if (!DYNAMO_DB_INVOICING_TABLE) {
            throw new Error('DYNAMO_DB_INVOICING_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.paymentTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_INVOICING_TABLE, InvoicingSchema)
            .getModel('Payment');
    }

    async createRecord(paymentDto: CreatePaymentDto): Promise<PaymentDto> {
        const paymentData: PaymentDataType = {
            paymentDate: paymentDto.paymentDate,
            paymentAmount: paymentDto.paymentAmount,
            customerId: paymentDto.customerId,
            customerName: paymentDto.customerName,
            receiptNo: paymentDto.receiptNo,
            activityLogs: paymentDto.activityLogs,
            forApprovalVersion: paymentDto.forApprovalVersion,
            contractPayment: paymentDto.contractPayment,
            status: paymentDto.status,
            contractId: paymentDto.contractId,
            contractName: paymentDto.contractName,
            contractNo: paymentDto.contractNo,
            chequeClearStatus: paymentDto.chequeClearStatus,
            paymentDetails: paymentDto.paymentDetails,
            paymentInvoiceDetails: paymentDto.paymentInvoiceDetails,
            GSI1PK: `PAYMENT`,
            GSI1SK: paymentDto.receiptNo,
            GSI2PK: `PAYMENT#${paymentDto.status}`,
            GSI2SK: paymentDto.receiptNo,
            GSI3PK: `PAYMENT#${paymentDto.customerId}`,
            GSI3SK: paymentDto.receiptNo,
            GSI4PK: `PAYMENT#${paymentDto.customerId}#${paymentDto.status}`,
            GSI4SK: paymentDto.receiptNo,
            GSI5PK: `PAYMENT`,
            GSI5SK: paymentDto.paymentDate,
            GSI6PK: `PAYMENT#${paymentDto.contractId}`,
            GSI6SK: paymentDto.paymentDate,
        };

        const paymentRecord: PaymentDataType = await this.paymentTable.create(paymentData);

        return await this.convertToDto(paymentRecord);
    }

    async updateRecord(record: PaymentDto): Promise<PaymentDto> {
        const paymentRecord: PaymentDataType = await this.convertToDataType(record);

        // CRITICAL: Explicitly set changeReason on the record before calling update()
        // This ensures the field is persisted even if convertToDataType is called separately
        paymentRecord.changeReason = record.changeReason;
        paymentRecord.approverMessage = record.approverMessage;

        console.log('Payment Record to update:', paymentRecord);

        const updatedPaymentRecord: PaymentDataType = await this.paymentTable.update(paymentRecord);

        return await this.convertToDto(updatedPaymentRecord);
    }

    async findRecordById(id: string): Promise<PaymentDto | null> {
        const paymentRecord = await this.paymentTable.get({
            PK: `PAYMENT`,
            SK: `${id}`,
        });

        if (!paymentRecord) {
            return null;
        }

        return await this.convertToDto(paymentRecord);
    }

    async findRecordByReceiptNo(receiptNo: string): Promise<PaymentDto | null> {
        const record = await this.paymentTable.get(
            {
                GSI1PK: `PAYMENT`,
                GSI1SK: `${receiptNo}`,
            },
            {
                index: 'GSI1',
            }
        );

        if (!record) {
            return null;
        }

        return await this.convertToDto(record);
    }

    async findRecordsByNamePagination(
        limit: number,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<PaymentDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.paymentTable.find(
            {
                GSI1PK: `PAYMENT`,
                ...(name != null && name.trim() !== '' ? { GSI1SK: { begins: name.trim() } } : {}),
            },
            dynamoDbOption
        );

        const pageRecordCursorPointers = pageRecordHandler(
            records,
            limit,
            direction,
            'GSI1PK',
            'GSI1SK',
            'PK',
            'SK',
            JSON.stringify(records.next),
            JSON.stringify(records.prev)
        );

        return new PageDto(
            await this.convertToDtoList(records),
            pageRecordCursorPointers.nextCursorPointer,
            pageRecordCursorPointers.prevCursorPointer
        );
    }

    async deleteAllRecords(): Promise<void> {
        //get all the records
        const records = await this.paymentTable.find(
            {
                GSI1PK: `PAYMENT`,
            },
            {
                index: 'GSI1',
            }
        );

        for (const record of records) {
            await this.paymentTable.remove(record);
        }
    }

    async findRecordByCustomerId(
        limit: number,
        customerId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<PaymentDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI3', direction, cursorPointer);

        const records = await this.paymentTable.find(
            {
                GSI3PK: `PAYMENT#${customerId}`,
                GSI3SK: customerId,
            },
            dynamoDbOption
        );

        const pageRecordCursorPointers = pageRecordHandler(
            records,
            limit,
            direction,
            'GSI3PK',
            'GSI3SK',
            'PK',
            'SK',
            JSON.stringify(records.next),
            JSON.stringify(records.prev)
        );

        return new PageDto(
            await this.convertToDtoList(records),
            pageRecordCursorPointers.nextCursorPointer,
            pageRecordCursorPointers.prevCursorPointer
        );
    }

    async findRecordContainingReceiptNo(
        limit: number,
        receiptNo: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<PaymentDto>> {
        limit = Number(limit);

        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.paymentTable.find(
            {
                GSI1PK: `PAYMENT`,
                GSI1SK: {
                    begins: receiptNo,
                },
            },
            dynamoDbOption
        );

        const pageRecordCursorPointers = pageRecordHandler(
            records,
            limit,
            direction,
            'GSI1PK',
            'GSI1SK',
            'PK',
            'SK',
            JSON.stringify(records.next),
            JSON.stringify(records.prev)
        );

        return new PageDto(
            await this.convertToDtoList(records),
            pageRecordCursorPointers.nextCursorPointer,
            pageRecordCursorPointers.prevCursorPointer
        );
    }

    async getDatabaseRecordById(recordId: string): Promise<PaymentDataType | undefined> {
        const record: PaymentDataType | undefined = await this.paymentTable.get({
            PK: 'PAYMENT',
            SK: `${recordId}`,
        });

        return record;
    }

    async findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<PaymentDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);

        const records = await this.paymentTable.find(
            {
                GSI2PK: `PAYMENT#${status}`,
            },
            dynamoDbOption
        );

        const pageRecordCursorPointers = pageRecordHandler(
            records,
            limit,
            direction,
            'GSI2PK',
            'GSI2SK',
            'PK',
            'SK',
            JSON.stringify(records.next),
            JSON.stringify(records.prev)
        );

        return new PageDto(
            await this.convertToDtoList(records),
            pageRecordCursorPointers.nextCursorPointer,
            pageRecordCursorPointers.prevCursorPointer
        );
    }

    async findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<PaymentDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.paymentTable.find(
            {
                GSI1PK: `PAYMENT`,
            },
            dynamoDbOption
        );

        const pageRecordCursorPointers = pageRecordHandler(
            records,
            limit,
            direction,
            'GSI1PK',
            'GSI1SK',
            'PK',
            'SK',
            JSON.stringify(records.next),
            JSON.stringify(records.prev)
        );

        return new PageDto(
            await this.convertToDtoList(records),
            pageRecordCursorPointers.nextCursorPointer,
            pageRecordCursorPointers.prevCursorPointer
        );
    }

    async deleteRecord(dto: PaymentDto): Promise<PaymentDto> {
        const paymentRecord: PaymentDataType = await this.convertToDataType(dto);

        console.log('Payment Record to delete:', paymentRecord);

        await this.paymentTable.remove(paymentRecord);

        this.logger.log(`Payment Record hard deleted: ${JSON.stringify(paymentRecord)}`);

        return await this.convertToDto(paymentRecord);
    }

    async convertToDto(record: PaymentDataType): Promise<PaymentDto> {
        const dto = new PaymentDto();
        dto.paymentId = record.paymentId ? record.paymentId : '';
        dto.paymentDate = record.paymentDate ? record.paymentDate : '';
        dto.paymentAmount = record.paymentAmount ? record.paymentAmount : 0;
        dto.customerId = record.customerId ? record.customerId : '';
        dto.customerName = record.customerName ? record.customerName : '';
        dto.receiptNo = record.receiptNo ? record.receiptNo : '';
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : {};
        dto.contractPayment = record.contractPayment ? record.contractPayment : false;
        dto.status = record.status ? (record.status as StatusEnum) : undefined;
        dto.contractId = record.contractId ? record.contractId : '';
        dto.contractName = record.contractName ? record.contractName : '';
        dto.contractNo = record.contractNo ? record.contractNo : '';
        dto.chequeClearStatus = record.chequeClearStatus as ChequeClearStatusEnum;
        dto.paymentDetails = record.paymentDetails ? record.paymentDetails : [];
        dto.paymentInvoiceDetails = record.paymentInvoiceDetails ? record.paymentInvoiceDetails : [];
        dto.changeReason = (record as PaymentDataType & { changeReason?: string }).changeReason || '';
        dto.approverMessage = record.approverMessage ? record.approverMessage : undefined;
        return dto;
    }

    async convertToDtoList(records: PaymentDataType[]): Promise<PaymentDto[]> {
        const dtoList: PaymentDto[] = [];

        for (const record of records) {
            const dto: PaymentDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDataType(dto: PaymentDto): Promise<PaymentDataType> {
        const paymentData: PaymentDataType = {
            paymentId: dto.paymentId,
            paymentDate: dto.paymentDate,
            paymentAmount: dto.paymentAmount,
            customerId: dto.customerId,
            customerName: dto.customerName,
            receiptNo: dto.receiptNo,
            activityLogs: dto.activityLogs,
            forApprovalVersion: dto.forApprovalVersion,
            contractPayment: dto.contractPayment,
            status: dto.status,
            contractId: dto.contractId,
            contractName: dto.contractName,
            contractNo: dto.contractNo,
            chequeClearStatus: dto.chequeClearStatus,
            paymentDetails: dto.paymentDetails,
            paymentInvoiceDetails: dto.paymentInvoiceDetails,
            GSI1PK: `PAYMENT`,
            GSI1SK: dto.receiptNo,
            GSI2PK: `PAYMENT#${dto.status}`,
            GSI2SK: dto.receiptNo,
            GSI3PK: `PAYMENT#${dto.customerId}`,
            GSI3SK: dto.receiptNo,
            GSI4PK: `PAYMENT#${dto.customerId}#${dto.status}`,
            GSI4SK: dto.receiptNo,
            GSI5PK: `PAYMENT`,
            GSI5SK: dto.paymentDate,
            GSI6PK: `PAYMENT#${dto.contractId}`,
            GSI6SK: dto.paymentDate,
            changeReason: dto.changeReason,
            approverMessage: dto.approverMessage,
        };
        return paymentData;
    }
}
