import { AccountTypeEnum, CreateVoucherDto, PageDto, PaymentTypeEnum, StatusEnum, VoucherDto } from '@dto';
import {
    AccountingSchema,
    createDynamoDbOptionWithPKSKIndex,
    DynamoDbLibService,
    pageRecordHandler,
    VoucherDataType,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { VoucherDatabaseServiceAbstract } from './voucher-database-service-abstract-class';

@Injectable()
export class VoucherDatabaseService implements VoucherDatabaseServiceAbstract {
    protected readonly logger = new Logger(VoucherDatabaseService.name);

    private readonly voucherTable: Model<VoucherDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_ACCOUNTING_TABLE = configService.get<string>('DYNAMO_DB_ACCOUNTING_TABLE');
        if (!DYNAMO_DB_ACCOUNTING_TABLE) {
            throw new Error('DYNAMO_DB_ACCOUNTING_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.voucherTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_ACCOUNTING_TABLE, AccountingSchema)
            .getModel('Voucher');
    }

    async createRecord(dto: CreateVoucherDto): Promise<VoucherDto> {
        const normalizedStatus = dto.status ?? StatusEnum.ACTIVE;
        const record = await this.voucherTable.create({
            voucherNo: dto.voucherNo,
            voucherDate: dto.voucherDate,
            voucherAmount: dto.voucherAmount,
            activityLogs: dto.activityLogs,
            forApprovalVersion: dto.forApprovalVersion,
            accountId: dto.accountId,
            accountName: dto.accountName,
            accountType: dto.accountType,
            customerId: dto.customerId,
            customerName: dto.customerName,
            areaId: dto.areaId,
            areaName: dto.areaName,
            changeReason: dto.changeReason,
            status: normalizedStatus,
            remarks: dto.remarks,
            voucherDetails: dto.voucherDetails,
            paymentType: dto.paymentType,
            bankName: dto.bankName,
            chequeNo: dto.chequeNo,
            chequeDate: dto.chequeDate,
            totalAmount: dto.totalAmount,
            GSI1PK: `VOUCHER`,
            GSI1SK: dto.voucherNo,
            GSI2PK: `VOUCHER#${normalizedStatus}`,
            GSI2SK: dto.voucherNo,
            GSI3PK: `VOUCHER`,
            GSI3SK: dto.voucherDate,
        } as VoucherDataType);
        return await this.convertToDto(record);
    }

    async updateRecord(dto: VoucherDto): Promise<VoucherDto> {
        const voucherRecord: VoucherDataType = await this.convertToDataType(dto);

        voucherRecord.changeReason = dto.changeReason;

        const updatedVoucherRecord: VoucherDataType = await this.voucherTable.update(voucherRecord);
        return await this.convertToDto(updatedVoucherRecord);
    }

    async findRecordById(id: string): Promise<VoucherDto | null> {
        const record = await this.voucherTable.get({
            PK: `VOUCHER`,
            SK: `${id}`,
        });

        if (!record) {
            return null;
        }

        return await this.convertToDto(record);
    }

    async findRecordsByVoucherNoPagination(
        limit: number,
        voucherNo: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<VoucherDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const voucherRecords = await this.voucherTable.find(
            {
                GSI1PK: `VOUCHER`,
                GSI1SK: {
                    begins: voucherNo,
                },
            },
            dynamoDbOption
        );

        const pageRecordCursorPointers = pageRecordHandler(
            voucherRecords,
            limit,
            direction,
            'GSI1PK',
            'GSI1SK',
            'PK',
            'SK',
            JSON.stringify(voucherRecords.next),
            JSON.stringify(voucherRecords.prev)
        );

        return new PageDto(
            await this.convertToDtoList(voucherRecords),
            pageRecordCursorPointers.nextCursorPointer,
            pageRecordCursorPointers.prevCursorPointer
        );
    }

    async findRecordByVoucherNo(voucherNo: string): Promise<VoucherDto | null> {
        const record = await this.voucherTable.get(
            {
                GSI1PK: `VOUCHER`,
                GSI1SK: `${voucherNo}`,
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

    async getDatabaseRecordById(recordId: string): Promise<VoucherDataType | undefined> {
        const record: VoucherDataType | undefined = await this.voucherTable.get({
            PK: 'VOUCHER',
            SK: `${recordId}`,
        });

        this.logger.log(`Voucher Record returned: ${JSON.stringify(record)}`);

        return record;
    }

    async findRecordsPagination(limit: number, direction: string, cursorPointer: string): Promise<PageDto<VoucherDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.voucherTable.find(
            {
                GSI1PK: `VOUCHER`,
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

    async findRecordsByVoucherDatePagination(
        limit: number,
        startDate: string,
        endDate: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<VoucherDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI3', direction, cursorPointer);

        const records = await this.voucherTable.find(
            {
                GSI3PK: `VOUCHER`,
                ...(startDate && endDate ? { GSI3SK: { between: [startDate, endDate] } } : {}),
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

    async findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        voucherNo: string
    ): Promise<PageDto<VoucherDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);

        const records = await this.voucherTable.find(
            {
                GSI2PK: `VOUCHER#${status}`,
                ...(voucherNo != null ? { GSI2SK: { begins: voucherNo } } : {}),
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

    async deleteRecord(dto: VoucherDto): Promise<VoucherDto> {
        const voucherRecord: VoucherDataType = await this.convertToDataType(dto);

        await this.voucherTable.remove(voucherRecord);

        this.logger.log(`Voucher Record hard deleted: ${JSON.stringify(voucherRecord)}`);

        return await this.convertToDto(voucherRecord);
    }

    async deleteAllRecords(): Promise<void> {
        // Get all the records
        const records = await this.voucherTable.find(
            {
                GSI1PK: `VOUCHER`,
            },
            {
                index: 'GSI1',
            }
        );

        // Delete each record
        for (const record of records) {
            await this.voucherTable.remove(record);
            this.logger.log(`Voucher Record deleted: ${JSON.stringify(record)}`);
        }
    }

    async convertToDto(record: VoucherDataType): Promise<VoucherDto> {
        const dto = new VoucherDto();
        dto.voucherId = record.voucherId ? record.voucherId : '';
        dto.voucherNo = record.voucherNo ? record.voucherNo : '';
        dto.voucherDate = record.voucherDate ? record.voucherDate : '';
        dto.voucherAmount = record.voucherAmount ? record.voucherAmount : 0;
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : {};
        dto.accountId = record.accountId ? record.accountId : '';
        dto.accountName = record.accountName ? record.accountName : '';
        dto.accountType = record.accountType ? (record.accountType as AccountTypeEnum) : AccountTypeEnum.OTHERS;
        dto.customerId = record.customerId ? record.customerId : undefined;
        dto.customerName = record.customerName ? record.customerName : undefined;
        dto.areaId = record.areaId ? record.areaId : undefined;
        dto.areaName = record.areaName ? record.areaName : undefined;
        dto.changeReason = (record as VoucherDataType & { changeReason?: string }).changeReason || undefined;
        dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;
        dto.remarks = record.remarks ? record.remarks : '';
        dto.voucherDetails = record.voucherDetails ? record.voucherDetails : [];
        dto.paymentType = record.paymentType ? (record.paymentType as PaymentTypeEnum) : PaymentTypeEnum.CASH;
        dto.bankName = record.bankName ? record.bankName : '';
        dto.chequeNo = record.chequeNo ? record.chequeNo : '';
        dto.chequeDate = record.chequeDate ? record.chequeDate : '';
        dto.totalAmount = record.totalAmount ? record.totalAmount : 0;
        dto.approverMessage = record.approverMessage ? record.approverMessage : undefined;

        return dto;
    }

    async convertToDtoList(records: VoucherDataType[]): Promise<VoucherDto[]> {
        const dtoList: VoucherDto[] = [];
        for (const record of records) {
            const dto = await this.convertToDto(record);
            dtoList.push(dto);
        }
        return dtoList;
    }

    async convertToDataType(dto: VoucherDto): Promise<VoucherDataType> {
        const voucherData: VoucherDataType = {
            voucherId: dto.voucherId,
            voucherNo: dto.voucherNo,
            voucherDate: dto.voucherDate,
            voucherAmount: dto.voucherAmount,
            activityLogs: dto.activityLogs,
            forApprovalVersion: dto.forApprovalVersion,
            accountId: dto.accountId,
            accountName: dto.accountName,
            accountType: dto.accountType,
            customerId: dto.customerId,
            customerName: dto.customerName,
            areaId: dto.areaId,
            areaName: dto.areaName,
            changeReason: dto.changeReason,
            status: dto.status as StatusEnum,
            remarks: dto.remarks,
            voucherDetails: dto.voucherDetails ? dto.voucherDetails : [],
            paymentType: dto.paymentType,
            bankName: dto.bankName,
            chequeNo: dto.chequeNo,
            chequeDate: dto.chequeDate,
            totalAmount: dto.totalAmount,
            approverMessage: dto.approverMessage,
            GSI1PK: `VOUCHER`,
            GSI1SK: dto.voucherNo,
            GSI2PK: `VOUCHER#${dto.status}`,
            GSI2SK: dto.voucherNo,
            GSI3PK: `VOUCHER`,
            GSI3SK: dto.voucherDate,
            GSI4PK: `VOUCHER#${dto.accountId}`,
            GSI4SK: dto.voucherId,
            GSI5PK: `VOUCHER#${dto.customerId}`,
            GSI5SK: dto.voucherId,
            GSI6PK: `VOUCHER#${dto.areaId}`,
            GSI6SK: dto.voucherId,
        };
        return voucherData;
    }

    async findRecordsByAccountIdPagination(
        limit: number,
        accountId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<VoucherDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI4', direction, cursorPointer);

        const records = await this.voucherTable.find(
            {
                GSI4PK: `VOUCHER#${accountId}`,
            },
            dynamoDbOption
        );

        const pageRecordCursorPointers = pageRecordHandler(
            records,
            limit,
            direction,
            'GSI4PK',
            'GSI4SK',
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

    async findRecordsByCustomerIdPagination(
        limit: number,
        customerId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<VoucherDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI5', direction, cursorPointer);

        const records = await this.voucherTable.find(
            {
                GSI5PK: `VOUCHER#${customerId}`,
            },
            dynamoDbOption
        );

        const pageRecordCursorPointers = pageRecordHandler(
            records,
            limit,
            direction,
            'GSI5PK',
            'GSI5SK',
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

    async findRecordsByAreaIdPagination(
        limit: number,
        areaId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<VoucherDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI6', direction, cursorPointer);

        const records = await this.voucherTable.find(
            {
                GSI6PK: `VOUCHER#${areaId}`,
            },
            dynamoDbOption
        );

        const pageRecordCursorPointers = pageRecordHandler(
            records,
            limit,
            direction,
            'GSI6PK',
            'GSI6SK',
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

    async batchUpdate(records: VoucherDto[]): Promise<void> {
        const updatePromises = records.map((record) => this.updateRecord(record));
        await Promise.all(updatePromises);
    }

    /**
     * Get all vouchers within a date range (non-paginated, for report generation)
     * Uses GSI3: PK = VOUCHER, SK = voucherDate
     */
    async getVouchersByDateRange(startDate: string, endDate: string): Promise<VoucherDto[]> {
        const allVouchers: VoucherDto[] = [];
        let cursorPointer: string | undefined = undefined;
        const limit = 1000;

        do {
            const dynamoDbOption = cursorPointer
                ? createDynamoDbOptionWithPKSKIndex(limit, 'GSI3', 'next', cursorPointer)
                : {
                      limit: limit + 1,
                      follow: true,
                      index: 'GSI3',
                  };

            const records = await this.voucherTable.find(
                {
                    GSI3PK: `VOUCHER`,
                    GSI3SK: {
                        between: [startDate, endDate],
                    },
                },
                {
                    ...dynamoDbOption,
                    where: '${status} = {ACTIVE}',
                    substitutions: {
                        ACTIVE: 'ACTIVE',
                    },
                }
            );

            const dtos = await this.convertToDtoList(records);
            allVouchers.push(...dtos);
            cursorPointer = records.next ? JSON.stringify(records.next) : undefined;
        } while (cursorPointer);

        return allVouchers;
    }

    /**
     * Get vouchers by date range filtered by customerId (for per-customer report)
     * Uses GSI3 (date range) with a where filter on customerId
     * Note: GSI5 (customer) has voucherId as SK, so date range query is not possible on it
     */
    async getVouchersByDateRangeAndCustomer(
        customerId: string,
        startDate: string,
        endDate: string
    ): Promise<VoucherDto[]> {
        const allVouchers: VoucherDto[] = [];
        let cursorPointer: string | undefined = undefined;
        const limit = 1000;

        do {
            const dynamoDbOption = cursorPointer
                ? createDynamoDbOptionWithPKSKIndex(limit, 'GSI3', 'next', cursorPointer)
                : {
                      limit: limit + 1,
                      follow: true,
                      index: 'GSI3',
                  };

            const records = await this.voucherTable.find(
                {
                    GSI3PK: `VOUCHER`,
                    GSI3SK: {
                        between: [startDate, endDate],
                    },
                },
                {
                    ...dynamoDbOption,
                    where: '${customerId} = {targetCustomerId} AND ${status} = {ACTIVE}',
                    substitutions: {
                        targetCustomerId: customerId,
                        ACTIVE: 'ACTIVE',
                    },
                }
            );

            const dtos = await this.convertToDtoList(records);
            allVouchers.push(...dtos);
            cursorPointer = records.next ? JSON.stringify(records.next) : undefined;
        } while (cursorPointer);

        return allVouchers;
    }
}
