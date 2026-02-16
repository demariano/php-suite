import { CreateReturnGoodSoldDto, PageDto, ReturnGoodSoldDto, StatusEnum } from '@dto';
import {
    createDynamoDbOptionWithPKSKIndex,
    DynamoDbLibService,
    InvoicingSchema,
    pageRecordHandler,
    ReturnGoodSoldDataType,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';

import { ReturnGoodSoldDatabaseServiceAbstractClass } from './return-good-sold-database-service-abstract-class';

@Injectable()
export class ReturnGoodSoldDatabaseService implements ReturnGoodSoldDatabaseServiceAbstractClass {
    protected readonly logger = new Logger(ReturnGoodSoldDatabaseService.name);

    private readonly returnGoodSoldTable: Model<ReturnGoodSoldDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_INVOICING_TABLE = configService.get<string>('DYNAMO_DB_INVOICING_TABLE');
        if (!DYNAMO_DB_INVOICING_TABLE) {
            throw new Error('DYNAMO_DB_INVOICING_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.returnGoodSoldTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_INVOICING_TABLE, InvoicingSchema)
            .getModel('ReturnGoodSold');
    }

    async createRecord(returnGoodSoldDto: CreateReturnGoodSoldDto): Promise<ReturnGoodSoldDto> {
        const returnGoodSoldData: ReturnGoodSoldDataType = {
            invoiceId: returnGoodSoldDto.invoiceId,
            customerId: returnGoodSoldDto.customerId,
            customerName: returnGoodSoldDto.customerName,
            areaId: returnGoodSoldDto.areaId,
            areaName: returnGoodSoldDto.areaName,
            invoiceDocno: returnGoodSoldDto.invoiceDocno,
            rgsDocno: returnGoodSoldDto.rgsDocno,
            activityLogs: returnGoodSoldDto.activityLogs,
            dateReturned: returnGoodSoldDto.dateReturned,
            forApprovalVersion: returnGoodSoldDto.forApprovalVersion,
            status: returnGoodSoldDto.status,
            changeReason: returnGoodSoldDto.changeReason,
            originalInvoiceDetails: returnGoodSoldDto.originalInvoiceDetails,
            modifiedInvoiceDetails: returnGoodSoldDto.modifiedInvoiceDetails,
            GSI1PK: `RETURN_GOOD_SOLD`,
            GSI1SK: `${returnGoodSoldDto.rgsDocno}`,
            GSI2PK: `RETURN_GOOD_SOLD#${returnGoodSoldDto.status}`,
            GSI2SK: `${returnGoodSoldDto.dateReturned}`,
            GSI3PK: `RETURN_GOOD_SOLD#${returnGoodSoldDto.invoiceId}`,
            GSI3SK: `${returnGoodSoldDto.dateReturned}`,
            GSI4PK: `RETURN_GOOD_SOLD#${returnGoodSoldDto.invoiceId}#${returnGoodSoldDto.status}`,
            GSI4SK: `${returnGoodSoldDto.dateReturned}`,
            GSI5PK: `RETURN_GOOD_SOLD#${returnGoodSoldDto.customerId}`,
            GSI5SK: `${returnGoodSoldDto.dateReturned}`,
            GSI6PK: returnGoodSoldDto.areaId ? `RETURN_GOOD_SOLD#${returnGoodSoldDto.areaId}` : undefined,
            GSI6SK: `${returnGoodSoldDto.dateReturned}`,
            GSI7PK: `RETURN_GOOD_SOLD#${returnGoodSoldDto.status}`,
            GSI7SK: `${returnGoodSoldDto.rgsDocno}`,
        };

        const returnGoodSoldRecord: ReturnGoodSoldDataType = await this.returnGoodSoldTable.create(returnGoodSoldData);

        return await this.convertToDto(returnGoodSoldRecord);
    }

    async updateRecord(record: ReturnGoodSoldDto): Promise<ReturnGoodSoldDto> {
        const returnGoodSoldRecord: ReturnGoodSoldDataType = await this.convertToDataType(record);

        // CRITICAL: Explicitly set changeReason on the record before calling update()
        // This ensures the field is persisted even if convertToDataType is called separately
        returnGoodSoldRecord.changeReason = record.changeReason;
        returnGoodSoldRecord.approverMessage = record.approverMessage;

        console.log('Return Good Sold Record to update:', returnGoodSoldRecord);

        const updatedReturnGoodSoldRecord: ReturnGoodSoldDataType = await this.returnGoodSoldTable.update(
            returnGoodSoldRecord
        );

        return await this.convertToDto(updatedReturnGoodSoldRecord);
    }

    async findRecordById(id: string): Promise<ReturnGoodSoldDto | null> {
        const returnGoodSoldRecord = await this.returnGoodSoldTable.get({
            PK: `RETURN_GOOD_SOLD`,
            SK: `${id}`,
        });

        if (!returnGoodSoldRecord) {
            return null;
        }

        return await this.convertToDto(returnGoodSoldRecord);
    }

    async findRecordByRgsDocno(rgsDocno: string): Promise<ReturnGoodSoldDto | null> {
        const record = await this.returnGoodSoldTable.get(
            {
                GSI1PK: `RETURN_GOOD_SOLD`,
                GSI1SK: `${rgsDocno}`,
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

    async findRecordsByInvoiceId(
        limit: number,
        invoiceId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ReturnGoodSoldDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI3', direction, cursorPointer);

        const records = await this.returnGoodSoldTable.find(
            {
                GSI3PK: `RETURN_GOOD_SOLD#${invoiceId}`,
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

    async findRecordsByCustomerId(
        limit: number,
        customerId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ReturnGoodSoldDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI5', direction, cursorPointer);

        const records = await this.returnGoodSoldTable.find(
            {
                GSI5PK: `RETURN_GOOD_SOLD#${customerId}`,
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

    async findRecordContainingDocNo(
        limit: number,
        docno: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ReturnGoodSoldDto>> {
        limit = Number(limit);

        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.returnGoodSoldTable.find(
            {
                GSI1PK: `RETURN_GOOD_SOLD`,
                GSI1SK: {
                    begins: docno,
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

    async findRecordsByRgsDocnoPagination(
        limit: number,
        direction: string,
        cursorPointer: string,
        rgsDocno: string
    ): Promise<PageDto<ReturnGoodSoldDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.returnGoodSoldTable.find(
            {
                GSI1PK: `RETURN_GOOD_SOLD`,
                ...(rgsDocno != null && rgsDocno.trim() !== '' ? { GSI1SK: { begins: rgsDocno.trim() } } : {}),
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

    async findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        rgsDocno?: string
    ): Promise<PageDto<ReturnGoodSoldDto>> {
        limit = Number(limit);

        // Use GSI7 for combined status + rgsDocno search - NO CLIENT SIDE FILTERING
        if (rgsDocno != null && rgsDocno.trim() !== '') {
            const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI7', direction, cursorPointer);

            const records = await this.returnGoodSoldTable.find(
                {
                    GSI7PK: `RETURN_GOOD_SOLD#${status}`,
                    GSI7SK: { begins: rgsDocno.trim() },
                },
                dynamoDbOption
            );

            const pageRecordCursorPointers = pageRecordHandler(
                records,
                limit,
                direction,
                'GSI7PK',
                'GSI7SK',
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

        // Default: status only - use GSI2 sorted by dateReturned
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);

        const records = await this.returnGoodSoldTable.find(
            {
                GSI2PK: `RETURN_GOOD_SOLD#${status}`,
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
    ): Promise<PageDto<ReturnGoodSoldDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.returnGoodSoldTable.find(
            {
                GSI1PK: `RETURN_GOOD_SOLD`,
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

    async deleteRecord(dto: ReturnGoodSoldDto): Promise<ReturnGoodSoldDto> {
        const returnGoodSoldRecord: ReturnGoodSoldDataType = await this.convertToDataType(dto);

        console.log('Return Good Sold Record to delete:', returnGoodSoldRecord);

        await this.returnGoodSoldTable.remove(returnGoodSoldRecord);

        this.logger.log(`Return Good Sold Record hard deleted: ${JSON.stringify(returnGoodSoldRecord)}`);

        return await this.convertToDto(returnGoodSoldRecord);
    }

    async getDatabaseRecordById(recordId: string): Promise<ReturnGoodSoldDataType | undefined> {
        const record: ReturnGoodSoldDataType | undefined = await this.returnGoodSoldTable.get({
            PK: 'RETURN_GOOD_SOLD',
            SK: `${recordId}`,
        });

        return record;
    }

    async deleteAllRecords(): Promise<void> {
        //get all the records
        const records = await this.returnGoodSoldTable.find(
            {
                GSI1PK: `RETURN_GOOD_SOLD`,
            },
            {
                index: 'GSI1',
            }
        );

        for (const record of records) {
            await this.returnGoodSoldTable.remove(record);
        }
    }

    async convertToDto(record: ReturnGoodSoldDataType): Promise<ReturnGoodSoldDto> {
        const dto = new ReturnGoodSoldDto();
        dto.returnGoodSoldId = record.returnGoodSoldId ? record.returnGoodSoldId : '';
        dto.invoiceId = record.invoiceId ? record.invoiceId : '';
        dto.customerId = record.customerId ? record.customerId : '';
        dto.customerName = record.customerName ? record.customerName : '';
        dto.areaId = record.areaId ? record.areaId : undefined;
        dto.areaName = record.areaName ? record.areaName : undefined;
        dto.invoiceDocno = record.invoiceDocno ? record.invoiceDocno : '';
        dto.rgsDocno = record.rgsDocno ? record.rgsDocno : '';
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        dto.dateReturned = record.dateReturned ? record.dateReturned : '';
        dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : {};
        dto.status = record.status ? (record.status as StatusEnum) : undefined;
        dto.changeReason = (record as ReturnGoodSoldDataType & { changeReason?: string }).changeReason || '';
        dto.approverMessage = record.approverMessage ? record.approverMessage : undefined;
        dto.originalInvoiceDetails = record.originalInvoiceDetails ? record.originalInvoiceDetails : [];
        dto.modifiedInvoiceDetails = record.modifiedInvoiceDetails ? record.modifiedInvoiceDetails : [];
        return dto;
    }

    async convertToDtoList(records: ReturnGoodSoldDataType[]): Promise<ReturnGoodSoldDto[]> {
        const dtoList: ReturnGoodSoldDto[] = [];

        for (const record of records) {
            const dto: ReturnGoodSoldDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDataType(dto: ReturnGoodSoldDto): Promise<ReturnGoodSoldDataType> {
        const returnGoodSoldData: ReturnGoodSoldDataType = {
            returnGoodSoldId: dto.returnGoodSoldId,
            invoiceId: dto.invoiceId,
            customerId: dto.customerId,
            customerName: dto.customerName,
            areaId: dto.areaId,
            areaName: dto.areaName,
            invoiceDocno: dto.invoiceDocno,
            rgsDocno: dto.rgsDocno,
            activityLogs: dto.activityLogs,
            dateReturned: dto.dateReturned,
            forApprovalVersion: dto.forApprovalVersion,
            status: dto.status,
            changeReason: dto.changeReason,
            approverMessage: dto.approverMessage,
            originalInvoiceDetails: dto.originalInvoiceDetails,
            modifiedInvoiceDetails: dto.modifiedInvoiceDetails,
            GSI1PK: `RETURN_GOOD_SOLD`,
            GSI1SK: dto.rgsDocno,
            GSI2PK: `RETURN_GOOD_SOLD#${dto.status}`,
            GSI2SK: dto.dateReturned,
            GSI3PK: `RETURN_GOOD_SOLD#${dto.invoiceId}`,
            GSI3SK: dto.dateReturned,
            GSI4PK: `RETURN_GOOD_SOLD#${dto.invoiceId}#${dto.status}`,
            GSI4SK: dto.dateReturned,
            GSI5PK: `RETURN_GOOD_SOLD#${dto.customerId}`,
            GSI5SK: dto.dateReturned,
            GSI6PK: dto.areaId ? `RETURN_GOOD_SOLD#${dto.areaId}` : undefined,
            GSI6SK: dto.dateReturned,
            GSI7PK: `RETURN_GOOD_SOLD#${dto.status}`,
            GSI7SK: dto.rgsDocno,
        };
        return returnGoodSoldData;
    }

    async getReturnGoodSoldCountByAreaId(areaId: string): Promise<number> {
        let totalCount = 0;
        let cursorPointer: string | undefined = undefined;
        const limit = 1000; // Large limit to minimize pagination calls

        do {
            // For first call, don't pass direction/cursor. For subsequent calls, use 'next' direction
            const dynamoDbOption = cursorPointer
                ? createDynamoDbOptionWithPKSKIndex(limit, 'GSI6', 'next', cursorPointer)
                : {
                      limit: limit + 1,
                      follow: true,
                      index: 'GSI6',
                  };

            // Only fetch returnGoodSoldId field to minimize data transfer - we only need to count records
            const records = await this.returnGoodSoldTable.find(
                {
                    GSI6PK: `RETURN_GOOD_SOLD#${areaId}`,
                },
                {
                    ...dynamoDbOption,
                    fields: ['returnGoodSoldId'], // Only return minimal field needed for counting
                }
            );

            totalCount += records.length;
            cursorPointer = records.next ? JSON.stringify(records.next) : undefined;
        } while (cursorPointer);

        return totalCount;
    }

    /**
     * Find all return good sold records by customerId with pagination
     * Used for syncing customer name changes across all return good sold records
     */
    async findRecordsByCustomerIdPagination(
        limit: number,
        customerId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ReturnGoodSoldDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI5', direction, cursorPointer);

        const records = await this.returnGoodSoldTable.find(
            {
                GSI5PK: `RETURN_GOOD_SOLD#${customerId}`,
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

    /**
     * Find return good sold records by areaId with pagination
     * Used for syncing area name changes across all return good sold records
     */
    async findRecordsByAreaIdPagination(
        limit: number,
        areaId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ReturnGoodSoldDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI6', direction, cursorPointer);

        const records = await this.returnGoodSoldTable.find(
            {
                GSI6PK: `RETURN_GOOD_SOLD#${areaId}`,
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

    /**
     * Batch update return good sold records (used by sync handlers)
     * Updates 25 records at a time (DynamoDB BatchWrite limit)
     */
    async batchUpdateRecords(returnGoodSolds: ReturnGoodSoldDto[]): Promise<void> {
        const BATCH_SIZE = 25; // DynamoDB BatchWriteItem limit

        for (let i = 0; i < returnGoodSolds.length; i += BATCH_SIZE) {
            const batch = returnGoodSolds.slice(i, i + BATCH_SIZE);

            try {
                // Convert DTOs to DataTypes
                const batchData = await Promise.all(batch.map((rgs) => this.convertToDataType(rgs)));

                // Use Promise.all to update all records in parallel (25 at a time)
                await Promise.all(batchData.map((rgs) => this.returnGoodSoldTable.update(rgs)));

                this.logger.log(
                    `Batch updated ${batch.length} return good sold records (indices ${i} to ${i + batch.length - 1})`
                );
            } catch (error) {
                this.logger.error(`Failed to batch update return good sold records at index ${i}:`, error);

                // Fallback: Update one by one
                for (const rgs of batch) {
                    try {
                        await this.updateRecord(rgs);
                    } catch (itemError) {
                        this.logger.error(`Failed to update return good sold ${rgs.returnGoodSoldId}:`, itemError);
                        // Continue with other records
                    }
                }
            }
        }
    }

    async getActiveRGSByDateRange(startDate: string, endDate: string): Promise<ReturnGoodSoldDto[]> {
        const allRGS: ReturnGoodSoldDto[] = [];
        let cursorPointer: string | undefined = undefined;
        const limit = 1000;

        do {
            const dynamoDbOption = cursorPointer
                ? createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', 'next', cursorPointer)
                : {
                      limit: limit + 1,
                      follow: true,
                      index: 'GSI2',
                  };

            const records = await this.returnGoodSoldTable.find(
                {
                    GSI2PK: `RETURN_GOOD_SOLD#ACTIVE`,
                    GSI2SK: {
                        between: [startDate, endDate],
                    },
                },
                {
                    ...dynamoDbOption,
                    fields: ['returnGoodSoldId', 'dateReturned', 'status'],
                }
            );

            const dtos = await this.convertToDtoList(records);
            allRGS.push(...dtos);
            cursorPointer = records.next ? JSON.stringify(records.next) : undefined;
        } while (cursorPointer);

        return allRGS;
    }

    /**
     * Get active RGS by date range with full details for report generation
     * Returns all relevant fields including customer info, docno, invoice details
     */
    async getActiveRGSByDateRangeDetailed(startDate: string, endDate: string): Promise<ReturnGoodSoldDto[]> {
        const allRGS: ReturnGoodSoldDto[] = [];
        let cursorPointer: string | undefined = undefined;
        const limit = 1000;

        do {
            const dynamoDbOption = cursorPointer
                ? createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', 'next', cursorPointer)
                : {
                      limit: limit + 1,
                      follow: true,
                      index: 'GSI2',
                  };

            const records = await this.returnGoodSoldTable.find(
                {
                    GSI2PK: `RETURN_GOOD_SOLD#ACTIVE`,
                    GSI2SK: {
                        between: [startDate, endDate],
                    },
                },
                {
                    ...dynamoDbOption,
                    fields: [
                        'returnGoodSoldId',
                        'dateReturned',
                        'status',
                        'customerId',
                        'customerName',
                        'invoiceDocno',
                        'rgsDocno',
                        'invoiceId',
                        'areaId',
                        'areaName',
                        'originalInvoiceDetails',
                        'modifiedInvoiceDetails',
                    ],
                }
            );

            const dtos = await this.convertToDtoList(records);
            allRGS.push(...dtos);
            cursorPointer = records.next ? JSON.stringify(records.next) : undefined;
        } while (cursorPointer);

        return allRGS;
    }

    /**
     * Get active RGS by customer and date range for per-customer report
     * Uses GSI5: PK = RETURN_GOOD_SOLD#${customerId}, SK = dateReturned
     */
    async getActiveRGSByCustomerAndDateRange(
        customerId: string,
        startDate: string,
        endDate: string
    ): Promise<ReturnGoodSoldDto[]> {
        const allRGS: ReturnGoodSoldDto[] = [];
        let cursorPointer: string | undefined = undefined;
        const limit = 1000;

        do {
            const dynamoDbOption = cursorPointer
                ? createDynamoDbOptionWithPKSKIndex(limit, 'GSI5', 'next', cursorPointer)
                : {
                      limit: limit + 1,
                      follow: true,
                      index: 'GSI5',
                  };

            const records = await this.returnGoodSoldTable.find(
                {
                    GSI5PK: `RETURN_GOOD_SOLD#${customerId}`,
                    GSI5SK: {
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
            allRGS.push(...dtos);
            cursorPointer = records.next ? JSON.stringify(records.next) : undefined;
        } while (cursorPointer);

        return allRGS;
    }
}
