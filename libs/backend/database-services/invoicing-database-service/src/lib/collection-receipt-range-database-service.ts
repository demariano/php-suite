import { CollectionReceiptRangeDto, CreateCollectionReceiptRangeDto, PageDto, RangeStatusEnum } from '@dto';
import {
    CollectionReceiptRangeDataType,
    createDynamoDbOptionWithPKSKIndex,
    DynamoDbLibService,
    InvoicingSchema,
    pageRecordHandler,
} from '@dynamo-db-lib';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';

import { CollectionReceiptRangeDatabaseServiceAbstract } from './collection-receipt-range-database-service-abstract-class';

@Injectable()
export class CollectionReceiptRangeDatabaseService implements CollectionReceiptRangeDatabaseServiceAbstract {
    protected readonly logger = new Logger(CollectionReceiptRangeDatabaseService.name);

    private readonly collectionReceiptRangeTable: Model<CollectionReceiptRangeDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_INVOICING_TABLE = configService.get<string>('DYNAMO_DB_INVOICING_TABLE');
        if (!DYNAMO_DB_INVOICING_TABLE) {
            throw new Error('DYNAMO_DB_INVOICING_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.collectionReceiptRangeTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_INVOICING_TABLE, InvoicingSchema)
            .getModel('CollectionReceiptRange');
    }

    async createRecord(rangeDto: CreateCollectionReceiptRangeDto): Promise<CollectionReceiptRangeDto> {
        const rangeData: CollectionReceiptRangeDataType = {
            areaId: rangeDto.areaId,
            areaName: rangeDto.areaName,
            startNumber: rangeDto.startNumber,
            endNumber: rangeDto.endNumber,
            lastUsedNumber: rangeDto.lastUsedNumber ?? rangeDto.startNumber - 1,
            rangeStatus: rangeDto.rangeStatus ?? RangeStatusEnum.AVAILABLE,
            cancelledReceiptNumbers: rangeDto.cancelledReceiptNumbers ?? [],
            activityLogs: rangeDto.activityLogs ?? [],
            GSI1PK: `COLLECTION_RECEIPT_RANGE`,
            GSI2PK: `COLLECTION_RECEIPT_RANGE#${rangeDto.rangeStatus ?? RangeStatusEnum.AVAILABLE}`,
            GSI2SK: rangeDto.areaId,
            GSI3PK: `COLLECTION_RECEIPT_RANGE#${rangeDto.areaId}`,
            GSI3SK: rangeDto.startNumber.toString(),
        };

        // GSI1SK will be automatically set by OneTable using the template ${collectionReceiptRangeId}
        const rangeRecord: CollectionReceiptRangeDataType = await this.collectionReceiptRangeTable.create(rangeData);

        return await this.convertToDto(rangeRecord);
    }

    async updateRecord(record: CollectionReceiptRangeDto): Promise<CollectionReceiptRangeDto> {
        const rangeRecord: CollectionReceiptRangeDataType = await this.convertToDataType(record);

        const updatedRangeRecord: CollectionReceiptRangeDataType = await this.collectionReceiptRangeTable.update(
            rangeRecord
        );

        return await this.convertToDto(updatedRangeRecord);
    }

    async findRecordById(id: string): Promise<CollectionReceiptRangeDto | null> {
        const rangeRecord = await this.collectionReceiptRangeTable.get({
            PK: `COLLECTION_RECEIPT_RANGE`,
            SK: `${id}`,
        });

        if (!rangeRecord) {
            return null;
        }

        return await this.convertToDto(rangeRecord);
    }

    async findRecordsByAreaId(
        limit: number,
        areaId: string,
        direction: string,
        cursorPointer: string | undefined
    ): Promise<PageDto<CollectionReceiptRangeDto>> {
        limit = Number(limit);
        // Don't pass direction if cursorPointer is not provided (first page load)
        const effectiveDirection = cursorPointer ? direction : (null as unknown as string);
        const effectiveCursorPointer = cursorPointer || '';
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(
            limit,
            'GSI3',
            effectiveDirection,
            effectiveCursorPointer
        );

        const records = await this.collectionReceiptRangeTable.find(
            {
                GSI3PK: `COLLECTION_RECEIPT_RANGE#${areaId}`,
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

    async findRecordsByRangeStatus(
        limit: number,
        rangeStatus: string,
        direction: string,
        cursorPointer: string | undefined
    ): Promise<PageDto<CollectionReceiptRangeDto>> {
        limit = Number(limit);
        // Don't pass direction if cursorPointer is not provided (first page load)
        const effectiveDirection = cursorPointer ? direction : (null as unknown as string);
        const effectiveCursorPointer = cursorPointer || '';
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(
            limit,
            'GSI2',
            effectiveDirection,
            effectiveCursorPointer
        );

        const records = await this.collectionReceiptRangeTable.find(
            {
                GSI2PK: `COLLECTION_RECEIPT_RANGE#${rangeStatus}`,
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

    async findActiveRangeByAreaId(areaId: string): Promise<CollectionReceiptRangeDto | null> {
        const records = await this.collectionReceiptRangeTable.find(
            {
                GSI2PK: `COLLECTION_RECEIPT_RANGE#${RangeStatusEnum.AVAILABLE}`,
                GSI2SK: areaId,
            },
            {
                index: 'GSI2',
            }
        );

        // Filter to find ranges for the specific area that are available
        const activeRange = records.find(
            (record) => record.areaId === areaId && record.rangeStatus === RangeStatusEnum.AVAILABLE
        );

        if (!activeRange) {
            return null;
        }

        return await this.convertToDto(activeRange);
    }

    async findAllActiveRangesByAreaId(areaId: string): Promise<CollectionReceiptRangeDto[]> {
        let allRecords: CollectionReceiptRangeDataType[] = [];
        let cursorPointer: string | undefined = undefined;
        const limit = 1000; // Large limit to minimize pagination calls

        do {
            // For first call, don't pass direction/cursor. For subsequent calls, use 'next' direction
            const dynamoDbOption = cursorPointer
                ? createDynamoDbOptionWithPKSKIndex(limit, 'GSI3', 'next', cursorPointer)
                : {
                      limit: limit + 1,
                      follow: true,
                      index: 'GSI3',
                  };

            const records = await this.collectionReceiptRangeTable.find(
                {
                    GSI3PK: `COLLECTION_RECEIPT_RANGE#${areaId}`,
                },
                dynamoDbOption
            );

            allRecords = allRecords.concat(records);
            cursorPointer = records.next ? JSON.stringify(records.next) : undefined;
        } while (cursorPointer);

        // Filter to only AVAILABLE ranges and sort by startNumber
        const activeRanges = allRecords
            .filter((record) => record.rangeStatus === RangeStatusEnum.AVAILABLE)
            .sort((a, b) => (a.startNumber ?? 0) - (b.startNumber ?? 0));

        return await this.convertToDtoList(activeRanges);
    }

    async getNextAvailableReceiptNumber(areaId: string): Promise<number> {
        // Get all available ranges for this area
        const availableRanges = await this.findAllActiveRangesByAreaId(areaId);

        if (availableRanges.length === 0) {
            throw new BadRequestException('No receipt number range assigned to this area');
        }

        // Try each range until we find one with available numbers
        // This method is READ-ONLY - it only finds and returns the next available number
        // The actual database update happens in markReceiptNumberAsUsed when payment is created
        for (const range of availableRanges) {
            // Start from lastUsedNumber + 1
            let nextNumber = (range.lastUsedNumber ?? range.startNumber - 1) + 1;

            // Skip any cancelled numbers
            while (nextNumber <= range.endNumber) {
                // Check if this number is in the cancelled list
                const isCancelled =
                    range.cancelledReceiptNumbers?.some((cancelled) => cancelled.receiptNumber === nextNumber) ?? false;

                if (isCancelled) {
                    // Skip this cancelled number and try next
                    nextNumber++;
                    continue;
                }

                // Found available number in this range
                // Return it without updating the database
                return nextNumber;
            }

            // This range is exhausted, continue to next range
            // Don't mark as ALL_USED_UP here - that happens in markReceiptNumberAsUsed
        }

        // All ranges are exhausted
        throw new BadRequestException('All receipt number ranges exhausted for this area');
    }

    async markReceiptNumberAsUsed(areaId: string, receiptNumber: number): Promise<void> {
        // Get all available ranges for this area
        const availableRanges = await this.findAllActiveRangesByAreaId(areaId);

        if (availableRanges.length === 0) {
            throw new BadRequestException('No receipt number range assigned to this area');
        }

        // Find the range containing this receipt number
        for (const range of availableRanges) {
            // Check if receipt number is within this range
            if (receiptNumber >= range.startNumber && receiptNumber <= range.endNumber) {
                // Verify this number is not cancelled
                const isCancelled =
                    range.cancelledReceiptNumbers?.some((cancelled) => cancelled.receiptNumber === receiptNumber) ??
                    false;

                if (isCancelled) {
                    throw new BadRequestException(`Receipt number ${receiptNumber} is cancelled and cannot be used`);
                }

                // Update lastUsedNumber to the receipt number
                range.lastUsedNumber = receiptNumber;

                // Add activity log
                const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Receipt number ${receiptNumber} assigned`;
                range.activityLogs = range.activityLogs ?? [];
                range.activityLogs.push(activityLog);
                // Limit activity logs to last 10 entries
                if (range.activityLogs.length > 10) {
                    range.activityLogs = range.activityLogs.slice(-10);
                }

                // Check if this range is now exhausted
                let nextAvailableNumber = receiptNumber + 1;
                // Skip cancelled numbers
                while (nextAvailableNumber <= range.endNumber) {
                    const isNextCancelled =
                        range.cancelledReceiptNumbers?.some(
                            (cancelled) => cancelled.receiptNumber === nextAvailableNumber
                        ) ?? false;
                    if (!isNextCancelled) {
                        // Found an available number, range is not exhausted
                        break;
                    }
                    nextAvailableNumber++;
                }

                // If no available numbers found, mark range as ALL_USED_UP
                if (nextAvailableNumber > range.endNumber) {
                    range.rangeStatus = RangeStatusEnum.ALL_USED_UP;
                }

                // Update the record in database
                await this.updateRecord(range);

                return;
            }
        }

        // Receipt number not found in any range for this area
        throw new BadRequestException(
            `Receipt number ${receiptNumber} is not within any available range for area ${areaId}`
        );
    }

    async cancelReceiptNumber(
        receiptNumber: number,
        areaId: string,
        cancellationReason: string,
        cancelledBy: string,
        paymentId?: string
    ): Promise<void> {
        const range = await this.findActiveRangeByAreaId(areaId);

        if (!range) {
            // Try to find any range for this area (not just active)
            const ranges = await this.findRecordsByAreaId(1000, areaId, 'next', undefined);
            const matchingRange = ranges.data.find((r) => {
                const receiptNum = receiptNumber;
                return receiptNum >= r.startNumber && receiptNum <= r.endNumber;
            });

            if (!matchingRange) {
                throw new BadRequestException('Receipt number range not found for this area');
            }

            // Validate number is within range
            if (receiptNumber < matchingRange.startNumber || receiptNumber > matchingRange.endNumber) {
                throw new BadRequestException('Receipt number out of range');
            }

            // Initialize cancelledReceiptNumbers array if needed
            if (!matchingRange.cancelledReceiptNumbers) {
                matchingRange.cancelledReceiptNumbers = [];
            }

            // Check if already cancelled
            const alreadyCancelled = matchingRange.cancelledReceiptNumbers.some(
                (cancelled) => cancelled.receiptNumber === receiptNumber
            );

            if (alreadyCancelled) {
                throw new BadRequestException('Receipt number already cancelled');
            }

            // Add cancellation record
            const cancellationRecord = {
                receiptNumber: receiptNumber,
                cancellationReason: cancellationReason,
                cancelledBy: cancelledBy,
                cancelledAt: new Date().toISOString(),
                paymentId: paymentId,
            };

            matchingRange.cancelledReceiptNumbers.push(cancellationRecord);

            // Add activity log
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Receipt number ${receiptNumber} cancelled by ${cancelledBy}. Reason: ${cancellationReason}`;
            matchingRange.activityLogs = matchingRange.activityLogs ?? [];
            matchingRange.activityLogs.push(activityLog);
            // Limit activity logs to last 10 entries
            if (matchingRange.activityLogs.length > 10) {
                matchingRange.activityLogs = matchingRange.activityLogs.slice(-10);
            }

            await this.updateRecord(matchingRange);
            return;
        }

        // Validate number is within range
        if (receiptNumber < range.startNumber || receiptNumber > range.endNumber) {
            throw new BadRequestException('Receipt number out of range');
        }

        // Initialize cancelledReceiptNumbers array if needed
        if (!range.cancelledReceiptNumbers) {
            range.cancelledReceiptNumbers = [];
        }

        // Check if already cancelled
        const alreadyCancelled = range.cancelledReceiptNumbers.some(
            (cancelled) => cancelled.receiptNumber === receiptNumber
        );

        if (alreadyCancelled) {
            throw new BadRequestException('Receipt number already cancelled');
        }

        // Add cancellation record
        const cancellationRecord = {
            receiptNumber: receiptNumber,
            cancellationReason: cancellationReason,
            cancelledBy: cancelledBy,
            cancelledAt: new Date().toISOString(),
            paymentId: paymentId,
        };

        range.cancelledReceiptNumbers.push(cancellationRecord);

        // Add activity log
        const activityLog = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Receipt number ${receiptNumber} cancelled by ${cancelledBy}. Reason: ${cancellationReason}`;
        range.activityLogs = range.activityLogs ?? [];
        range.activityLogs.push(activityLog);
        // Limit activity logs to last 10 entries
        if (range.activityLogs.length > 10) {
            range.activityLogs = range.activityLogs.slice(-10);
        }

        await this.updateRecord(range);
    }

    async findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string | undefined
    ): Promise<PageDto<CollectionReceiptRangeDto>> {
        limit = Number(limit);
        // Don't pass direction if cursorPointer is not provided (first page load)
        // Pass null for direction when cursorPointer is undefined to avoid JSON parse error
        const effectiveDirection = cursorPointer ? direction : (null as unknown as string);
        const effectiveCursorPointer = cursorPointer || '';
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(
            limit,
            'GSI1',
            effectiveDirection,
            effectiveCursorPointer
        );

        const records = await this.collectionReceiptRangeTable.find(
            {
                GSI1PK: `COLLECTION_RECEIPT_RANGE`,
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

    async deleteRecord(rangeDto: CollectionReceiptRangeDto): Promise<CollectionReceiptRangeDto> {
        const rangeRecord: CollectionReceiptRangeDataType = await this.convertToDataType(rangeDto);

        await this.collectionReceiptRangeTable.remove(rangeRecord);

        this.logger.log(`Collection Receipt Range Record hard deleted: ${JSON.stringify(rangeRecord)}`);

        return await this.convertToDto(rangeRecord);
    }

    async deleteAllRecords(): Promise<void> {
        // Get all the records
        const records = await this.collectionReceiptRangeTable.find(
            {
                GSI1PK: `COLLECTION_RECEIPT_RANGE`,
            },
            {
                index: 'GSI1',
            }
        );

        for (const record of records) {
            await this.collectionReceiptRangeTable.remove(record);
        }
    }

    async findRecordsByAreaIdPagination(
        limit: number,
        areaId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<CollectionReceiptRangeDto>> {
        limit = Number(limit);
        const effectiveDirection = cursorPointer ? direction : (null as unknown as string);
        const effectiveCursorPointer = cursorPointer || '';
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(
            limit,
            'GSI3',
            effectiveDirection,
            effectiveCursorPointer
        );

        const records = await this.collectionReceiptRangeTable.find(
            {
                GSI3PK: `COLLECTION_RECEIPT_RANGE#${areaId}`,
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

    async batchUpdateRecords(ranges: CollectionReceiptRangeDto[]): Promise<void> {
        const BATCH_SIZE = 25;

        for (let i = 0; i < ranges.length; i += BATCH_SIZE) {
            const batch = ranges.slice(i, i + BATCH_SIZE);
            const updatePromises = batch.map(async (range) => {
                const rangeData = await this.convertToDataType(range);
                return this.collectionReceiptRangeTable.update(rangeData);
            });

            await Promise.all(updatePromises);
            this.logger.log(`Batch updated ${batch.length} collection receipt ranges`);
        }
    }

    async convertToDto(record: CollectionReceiptRangeDataType): Promise<CollectionReceiptRangeDto> {
        const dto = new CollectionReceiptRangeDto();
        dto.collectionReceiptRangeId = record.collectionReceiptRangeId ? record.collectionReceiptRangeId : '';
        dto.areaId = record.areaId ? record.areaId : '';
        dto.areaName = record.areaName ? record.areaName : '';
        dto.startNumber = record.startNumber ? record.startNumber : 0;
        dto.endNumber = record.endNumber ? record.endNumber : 0;
        dto.lastUsedNumber = record.lastUsedNumber;
        dto.rangeStatus = record.rangeStatus as RangeStatusEnum;
        dto.cancelledReceiptNumbers = record.cancelledReceiptNumbers ? record.cancelledReceiptNumbers : [];
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        return dto;
    }

    async convertToDtoList(records: CollectionReceiptRangeDataType[]): Promise<CollectionReceiptRangeDto[]> {
        const dtoList: CollectionReceiptRangeDto[] = [];

        for (const record of records) {
            const dto: CollectionReceiptRangeDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    private async convertToDataType(dto: CollectionReceiptRangeDto): Promise<CollectionReceiptRangeDataType> {
        const rangeData: CollectionReceiptRangeDataType = {
            collectionReceiptRangeId: dto.collectionReceiptRangeId,
            areaId: dto.areaId,
            areaName: dto.areaName,
            startNumber: dto.startNumber,
            endNumber: dto.endNumber,
            lastUsedNumber: dto.lastUsedNumber,
            rangeStatus: dto.rangeStatus,
            cancelledReceiptNumbers: dto.cancelledReceiptNumbers ?? [],
            activityLogs: dto.activityLogs ?? [],
            GSI1PK: `COLLECTION_RECEIPT_RANGE`,
            GSI1SK: dto.collectionReceiptRangeId,
            GSI2PK: `COLLECTION_RECEIPT_RANGE#${dto.rangeStatus ?? RangeStatusEnum.AVAILABLE}`,
            GSI2SK: dto.areaId,
            GSI3PK: `COLLECTION_RECEIPT_RANGE#${dto.areaId}`,
            GSI3SK: dto.startNumber.toString(),
        };
        return rangeData;
    }
}
