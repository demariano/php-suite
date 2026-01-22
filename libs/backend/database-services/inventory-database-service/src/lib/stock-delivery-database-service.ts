import { CreateStockDeliveryDto, PageDto, StatusEnum, StockDeliveryDto, StockDeliveryFilterDto } from '@dto';
import {
    createDynamoDbOptionWithPKSKIndex,
    DynamoDbLibService,
    InventorySchema,
    pageRecordHandler,
    StockDeliveryDataType,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { StockDeliveryDatabaseServiceAbstract } from './stock-delivery-database-service-abstract-class';

@Injectable()
export class StockDeliveryDatabaseService implements StockDeliveryDatabaseServiceAbstract {
    protected readonly logger = new Logger(StockDeliveryDatabaseService.name);

    private readonly stockDeliveryTable: Model<StockDeliveryDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_INVENTORY_TABLE = configService.get<string>('DYNAMO_DB_INVENTORY_TABLE');
        if (!DYNAMO_DB_INVENTORY_TABLE) {
            throw new Error('DYNAMO_DB_INVENTORY_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.stockDeliveryTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_INVENTORY_TABLE, InventorySchema)
            .getModel('StockDelivery');
    }

    async createRecord(stockDeliveryDto: CreateStockDeliveryDto): Promise<StockDeliveryDto> {
        const stockDeliveryData: StockDeliveryDataType = {
            status: stockDeliveryDto.status,
            supplierId: stockDeliveryDto.supplierId,
            supplierName: stockDeliveryDto.supplierName,
            dateReceived: stockDeliveryDto.dateReceived,
            docno: stockDeliveryDto.docno,
            deliveryDetails: stockDeliveryDto.deliveryDetails,
            activityLogs: stockDeliveryDto.activityLogs,
            forApprovalVersion: stockDeliveryDto.forApprovalVersion,
            changeReason: stockDeliveryDto.changeReason,
            GSI1PK: `STOCK_DELIVERY`,
            GSI1SK: stockDeliveryDto.docno,
            GSI2PK: `STOCK_DELIVERY#${stockDeliveryDto.status}`,
            GSI2SK: stockDeliveryDto.docno,
            GSI3PK: `STOCK_DELIVERY#${stockDeliveryDto.supplierId}`,
            GSI3SK: stockDeliveryDto.dateReceived,
            GSI5PK: `STOCK_DELIVERY#${stockDeliveryDto.supplierId}`,
            GSI5SK: stockDeliveryDto.stockDeliveryId || '',
        };

        const stockDeliveryRecord: StockDeliveryDataType = await this.stockDeliveryTable.create(stockDeliveryData);

        return await this.convertToDto(stockDeliveryRecord);
    }

    async updateRecord(record: StockDeliveryDto): Promise<StockDeliveryDto> {
        const stockDeliveryRecord: StockDeliveryDataType = await this.convertToDataType(record);

        stockDeliveryRecord.supplierId = record.supplierId;
        stockDeliveryRecord.supplierName = record.supplierName;
        stockDeliveryRecord.dateReceived = record.dateReceived;
        stockDeliveryRecord.docno = record.docno;
        stockDeliveryRecord.deliveryDetails = record.deliveryDetails;
        stockDeliveryRecord.status = record.status;
        stockDeliveryRecord.GSI1PK = `STOCK_DELIVERY`;
        stockDeliveryRecord.GSI1SK = record.docno;
        stockDeliveryRecord.GSI2PK = `STOCK_DELIVERY#${record.status}`;
        stockDeliveryRecord.GSI2SK = record.docno;
        stockDeliveryRecord.GSI3PK = `STOCK_DELIVERY#${record.supplierId}`;
        stockDeliveryRecord.GSI3SK = record.dateReceived;
        stockDeliveryRecord.GSI5PK = `STOCK_DELIVERY#${record.supplierId}`;
        stockDeliveryRecord.GSI5SK = record.stockDeliveryId;
        stockDeliveryRecord.forApprovalVersion = record.forApprovalVersion;
        stockDeliveryRecord.changeReason = record.changeReason;
        stockDeliveryRecord.approverMessage = record.approverMessage;
        const updatedStockDeliveryRecord: StockDeliveryDataType = await this.stockDeliveryTable.update(
            stockDeliveryRecord
        );

        return await this.convertToDto(updatedStockDeliveryRecord);
    }

    async findRecordById(id: string): Promise<StockDeliveryDto | null> {
        const record = await this.stockDeliveryTable.get({
            PK: `STOCK_DELIVERY`,
            SK: `${id}`,
        });

        if (!record) {
            return null;
        }

        return await this.convertToDto(record);
    }

    async findRecordContainingDocno(docno: string): Promise<StockDeliveryDto[] | null> {
        const stockDeliveryRecords = await this.stockDeliveryTable.find(
            {
                GSI1PK: 'STOCK_DELIVERY',
            },
            {
                where: 'contains(${docno}, @{docno})',
                substitutions: {
                    docno: docno,
                },
                index: 'GSI1',
            }
        );

        return await this.convertToDtoList(stockDeliveryRecords);
    }

    async findRecordsByDocnoPagination(
        limit: number,
        direction: string,
        cursorPointer: string,
        docno: string
    ): Promise<PageDto<StockDeliveryDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.stockDeliveryTable.find(
            {
                GSI1PK: `STOCK_DELIVERY`,
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

    async getDatabaseRecordById(recordId: string): Promise<StockDeliveryDataType | undefined> {
        const record: StockDeliveryDataType | undefined = await this.stockDeliveryTable.get({
            PK: 'STOCK_DELIVERY',
            SK: `${recordId}`,
        });

        this.logger.log(`StockDelivery Record returned: ${JSON.stringify(record)}`);

        return record;
    }

    async findRecordsPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<StockDeliveryDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);
        console.log('dynamoDbOption', dynamoDbOption);
        const records = await this.stockDeliveryTable.find(
            {
                GSI1PK: `STOCK_DELIVERY`,
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
        docno: string
    ): Promise<PageDto<StockDeliveryDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);

        const records = await this.stockDeliveryTable.find(
            {
                GSI2PK: `STOCK_DELIVERY#${status}`,
                ...(docno != null ? { GSI2SK: { begins: docno } } : {}),
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

    async findStockDeliveryRecordsByStatusAndSupplierId(
        status: string,
        supplierId: string
    ): Promise<StockDeliveryDto[]> {
        const stockDeliveryRecords = await this.stockDeliveryTable.find(
            {
                GSI2PK: `STOCK_DELIVERY#${status}`,
            },
            {
                where: '(${supplierId} = @{supplierId})',
                substitutions: {
                    supplierId: supplierId,
                },
                index: 'GSI2',
            }
        );

        return await this.convertToDtoList(stockDeliveryRecords);
    }

    async deleteRecord(dto: StockDeliveryDto): Promise<StockDeliveryDto> {
        const stockDeliveryRecord: StockDeliveryDataType = await this.convertToDataType(dto);

        await this.stockDeliveryTable.remove(stockDeliveryRecord);

        this.logger.log(`StockDelivery Record hard deleted: ${JSON.stringify(stockDeliveryRecord)}`);

        return await this.convertToDto(stockDeliveryRecord);
    }

    async deleteAllRecords(): Promise<void> {
        // Get all the records
        const records = await this.stockDeliveryTable.find(
            {
                GSI1PK: `STOCK_DELIVERY`,
            },
            {
                index: 'GSI1',
            }
        );

        // Delete each record
        for (const record of records) {
            await this.stockDeliveryTable.remove(record);
            this.logger.log(`StockDelivery Record deleted: ${JSON.stringify(record)}`);
        }
    }

    async findStockDeliveryRecordsByFilterPagination(
        filter: StockDeliveryFilterDto,
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<StockDeliveryDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const whereClause = [
            filter.status ? '(${status} = @{status})' : null,
            filter.supplierId && filter.supplierId.length > 0 ? '(${supplierId} = @{supplierId})' : null,
            filter.supplierName && filter.supplierName.length > 0 ? 'contains(${supplierName}, @{supplierName})' : null,
            filter.docno && filter.docno.length > 0 ? 'contains(${docno}, @{docno})' : null,
        ]
            .filter(Boolean)
            .join(' and ');

        const substitutions = {
            ...(filter.status && { status: filter.status }),
            ...(filter.supplierId && { supplierId: filter.supplierId }),
            ...(filter.supplierName && { supplierName: filter.supplierName }),
            ...(filter.docno && { docno: filter.docno }),
        };

        //check if filter.fields not undefined but not an array , convert it to an array
        if (filter.fields && !Array.isArray(filter.fields)) {
            filter.fields = [filter.fields];
        }

        //check filter.fields , if it does not include stockDeliveryId , then add it to the fields
        if (!filter.fields?.includes('stockDeliveryId')) {
            filter.fields?.push('stockDeliveryId');
        }

        const stockDeliveryRecords = await this.stockDeliveryTable.find(
            {
                GSI3PK: 'STOCK_DELIVERY',
            },
            {
                fields: filter.fields ? filter.fields : undefined,
                where: whereClause || undefined,
                substitutions: Object.keys(substitutions).length > 0 ? substitutions : undefined,
                reverse: filter.reverse,
                ...dynamoDbOption,
            }
        );

        const pageRecordCursorPointers = pageRecordHandler(
            stockDeliveryRecords,
            limit,
            direction,
            'GSI1PK',
            'GSI1SK',
            'PK',
            'SK',
            JSON.stringify(stockDeliveryRecords.next),
            JSON.stringify(stockDeliveryRecords.prev)
        );

        return new PageDto(
            await this.convertToDtoList(stockDeliveryRecords),
            pageRecordCursorPointers.nextCursorPointer,
            pageRecordCursorPointers.prevCursorPointer
        );
    }

    async convertToDto(record: StockDeliveryDataType): Promise<StockDeliveryDto> {
        const dto = new StockDeliveryDto();
        dto.stockDeliveryId = record.stockDeliveryId ? record.stockDeliveryId : '';
        dto.supplierId = record.supplierId ? record.supplierId : '';
        dto.supplierName = record.supplierName ? record.supplierName : '';
        dto.dateReceived = record.dateReceived ? record.dateReceived : '';
        dto.docno = record.docno ? record.docno : '';
        dto.deliveryDetails = record.deliveryDetails ? record.deliveryDetails : [];
        dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : {};
        dto.changeReason = (record as StockDeliveryDataType & { changeReason?: string }).changeReason || undefined;
        dto.approverMessage = record.approverMessage ? record.approverMessage : undefined;
        return dto;
    }

    async convertToDtoList(records: StockDeliveryDataType[]): Promise<StockDeliveryDto[]> {
        const dtoList: StockDeliveryDto[] = [];

        for (const record of records) {
            const dto: StockDeliveryDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async findRecordsBySupplierIdPagination(
        limit: number,
        supplierId: string,
        direction: 'forward' | 'backward',
        cursorPointer?: string
    ): Promise<PageDto<StockDeliveryDto>> {
        const options = createDynamoDbOptionWithPKSKIndex(
            `STOCK_DELIVERY#${supplierId}`,
            undefined,
            undefined,
            limit,
            direction,
            cursorPointer
        );

        return this.pageRecordHandler(options, 'GSI5');
    }

    async batchUpdate(records: StockDeliveryDto[]): Promise<void> {
        await Promise.all(records.map((record) => this.updateRecord(record)));
    }

    async convertToDataType(dto: StockDeliveryDto): Promise<StockDeliveryDataType> {
        const stockDeliveryData: StockDeliveryDataType = {
            stockDeliveryId: dto.stockDeliveryId,
            status: dto.status,
            supplierId: dto.supplierId,
            supplierName: dto.supplierName,
            dateReceived: dto.dateReceived,
            docno: dto.docno,
            deliveryDetails: dto.deliveryDetails,
            GSI1PK: `STOCK_DELIVERY`,
            GSI1SK: dto.docno,
            GSI2PK: `STOCK_DELIVERY#${dto.status}`,
            GSI2SK: dto.docno,
            GSI3PK: `STOCK_DELIVERY#${dto.supplierId}`,
            GSI3SK: dto.dateReceived,
            GSI5PK: `STOCK_DELIVERY#${dto.supplierId}`,
            GSI5SK: dto.stockDeliveryId,
            activityLogs: dto.activityLogs,
            forApprovalVersion: dto.forApprovalVersion,
            changeReason: dto.changeReason,
            approverMessage: dto.approverMessage,
        };
        return stockDeliveryData;
    }
}
