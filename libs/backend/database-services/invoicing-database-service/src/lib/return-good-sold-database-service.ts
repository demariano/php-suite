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
        };

        const returnGoodSoldRecord: ReturnGoodSoldDataType = await this.returnGoodSoldTable.create(returnGoodSoldData);

        return await this.convertToDto(returnGoodSoldRecord);
    }

    async updateRecord(record: ReturnGoodSoldDto): Promise<ReturnGoodSoldDto> {
        const returnGoodSoldRecord: ReturnGoodSoldDataType = await this.convertToDataType(record);
        
        // CRITICAL: Explicitly set changeReason on the record before calling update()
        // This ensures the field is persisted even if convertToDataType is called separately
        returnGoodSoldRecord.changeReason = record.changeReason;

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
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);

        // Note: GSI2SK is dateReturned, not rgsDocno, so we can't filter by rgsDocno on GSI2
        // If rgsDocno is provided, we'll need to filter results after querying
        // For now, we'll query all records for the status and filter in memory if rgsDocno is provided
        const records = await this.returnGoodSoldTable.find(
            {
                GSI2PK: `RETURN_GOOD_SOLD#${status}`,
            },
            dynamoDbOption
        );

        // Filter by rgsDocno if provided (in-memory filter since GSI2SK is dateReturned)
        let filteredRecords = records;
        if (rgsDocno != null && rgsDocno.trim() !== '') {
            filteredRecords = records.filter((record) =>
                record.rgsDocno?.toLowerCase().includes(rgsDocno.trim().toLowerCase())
            );
        }

        const pageRecordCursorPointers = pageRecordHandler(
            filteredRecords,
            limit,
            direction,
            'GSI2PK',
            'GSI2SK',
            'PK',
            'SK',
            JSON.stringify(filteredRecords.next),
            JSON.stringify(filteredRecords.prev)
        );

        return new PageDto(
            await this.convertToDtoList(filteredRecords),
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
        dto.invoiceDocno = record.invoiceDocno ? record.invoiceDocno : '';
        dto.rgsDocno = record.rgsDocno ? record.rgsDocno : '';
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        dto.dateReturned = record.dateReturned ? record.dateReturned : '';
        dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : {};
        dto.status = record.status ? (record.status as StatusEnum) : undefined;
        dto.changeReason = (record as ReturnGoodSoldDataType & { changeReason?: string }).changeReason || undefined;
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
            invoiceDocno: dto.invoiceDocno,
            rgsDocno: dto.rgsDocno,
            activityLogs: dto.activityLogs,
            dateReturned: dto.dateReturned,
            forApprovalVersion: dto.forApprovalVersion,
            status: dto.status,
            changeReason: dto.changeReason,
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
        };
        return returnGoodSoldData;
    }
}
