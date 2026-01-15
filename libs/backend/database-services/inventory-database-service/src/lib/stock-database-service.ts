import { CreateStockDto, PageDto, StatusEnum, StockDto, StockFilterDto } from '@dto';
import {
    createDynamoDbOptionWithPKSKIndex,
    DynamoDbLibService,
    InventorySchema,
    pageRecordHandler,
    StockDataType,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { StockDatabaseServiceAbstract } from './stock-database-service-abstract-class';

@Injectable()
export class StockDatabaseService implements StockDatabaseServiceAbstract {
    protected readonly logger = new Logger(StockDatabaseService.name);

    private readonly stockTable: Model<StockDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_INVENTORY_TABLE = configService.get<string>('DYNAMO_DB_INVENTORY_TABLE');
        if (!DYNAMO_DB_INVENTORY_TABLE) {
            throw new Error('DYNAMO_DB_INVENTORY_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.stockTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_INVENTORY_TABLE, InventorySchema)
            .getModel('Stock');
    }

    async createRecord(stockDto: CreateStockDto): Promise<StockDto> {
        const stockData: StockDataType = {
            status: stockDto.status,
            lotNo: stockDto.lotNo,
            productId: stockDto.productId,
            productName: stockDto.productName,
            quantityOnHand: stockDto.quantityOnHand,
            availableQuantity: stockDto.availableQuantity,
            productUnitId: stockDto.productUnitId,
            productUnitName: stockDto.productUnitName,
            expirationDate: stockDto.expirationDate,
            activityLogs: stockDto.activityLogs,
            forApprovalVersion: stockDto.forApprovalVersion,
            changeReason: stockDto.changeReason,
            stockTypeId: stockDto.stockTypeId,
            stockTypeName: stockDto.stockTypeName,
            GSI1PK: `STOCK`,
            GSI1SK: stockDto.productName,
            GSI2PK: `STOCK#${stockDto.status}`,
            GSI2SK: stockDto.productName,
            GSI3PK: `STOCK#${stockDto.status}`,
            GSI3SK: stockDto.productId,
            GSI4PK: `STOCK#${stockDto.status}#${stockDto.productUnitId}#${stockDto.productId}`,
            GSI4SK: stockDto.lotNo,
            GSI5PK: `STOCK#${stockDto.status}#${stockDto.productUnitId}#${stockDto.productId}`,
            GSI5SK: stockDto.expirationDate,
        };

        const stockRecord: StockDataType = await this.stockTable.create(stockData);

        return await this.convertToDto(stockRecord);
    }

    async updateRecord(record: StockDto): Promise<StockDto> {
        const stockRecord: StockDataType = await this.convertToDataType(record);

        // Sanitize empty strings to undefined for fields used in GSI keys
        const sanitize = (value: string | undefined) => (value === '' ? undefined : value);

        stockRecord.lotNo = sanitize(record.lotNo);
        stockRecord.productId = sanitize(record.productId);
        stockRecord.productName = sanitize(record.productName);
        stockRecord.quantityOnHand = record.quantityOnHand;
        stockRecord.availableQuantity = record.availableQuantity;
        stockRecord.productUnitId = sanitize(record.productUnitId);
        stockRecord.productUnitName = sanitize(record.productUnitName);
        stockRecord.expirationDate = sanitize(record.expirationDate);
        stockRecord.status = record.status;
        stockRecord.stockTypeId = sanitize(record.stockTypeId);
        stockRecord.stockTypeName = sanitize(record.stockTypeName);
        stockRecord.GSI1PK = `STOCK`;
        stockRecord.GSI1SK = stockRecord.productName;
        stockRecord.GSI2PK = `STOCK#${record.status}`;
        stockRecord.GSI2SK = stockRecord.productName;
        stockRecord.GSI3PK = `STOCK#${record.status}`;
        stockRecord.GSI3SK = stockRecord.productId;
        stockRecord.GSI4PK = `STOCK#${record.status}#${stockRecord.productUnitId}#${stockRecord.productId}`;
        stockRecord.GSI4SK = stockRecord.lotNo;
        stockRecord.GSI5PK = `STOCK#${record.status}#${stockRecord.productUnitId}#${stockRecord.productId}`;
        stockRecord.GSI5SK = stockRecord.expirationDate;
        stockRecord.forApprovalVersion = record.forApprovalVersion;
        stockRecord.changeReason = record.changeReason;
        stockRecord.approverMessage = record.approverMessage;

        const updatedStockRecord: StockDataType = await this.stockTable.update(stockRecord);

        return await this.convertToDto(updatedStockRecord);
    }

    async findRecordById(id: string): Promise<StockDto | null> {
        const record = await this.stockTable.get({
            PK: `STOCK`,
            SK: `${id}`,
        });

        if (!record) {
            return null;
        }

        return await this.convertToDto(record);
    }

    async findRecordContainingName(name: string): Promise<StockDto[] | null> {
        const stockRecords = await this.stockTable.find(
            {
                GSI1PK: 'STOCK',
            },
            {
                where: 'contains(${productName}, @{productName})',
                substitutions: {
                    productName: name,
                },
                index: 'GSI1',
            }
        );

        return await this.convertToDtoList(stockRecords);
    }

    async findRecordsByNamePagination(
        limit: number,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<StockDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.stockTable.find(
            {
                GSI1PK: `STOCK`,
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

    async getDatabaseRecordById(recordId: string): Promise<StockDataType | undefined> {
        const record: StockDataType | undefined = await this.stockTable.get({
            PK: 'STOCK',
            SK: `${recordId}`,
        });

        this.logger.log(`Stock Record returned: ${JSON.stringify(record)}`);

        return record;
    }

    async findRecordsPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<StockDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        // If no status provided, fetch all records using GSI1 (similar to customer module)
        // Otherwise, use GSI2 for status-specific queries
        const queryCondition = status
            ? {
                  GSI2PK: `STOCK#${status}`,
              }
            : {
                  GSI1PK: `STOCK`,
              };

        const indexToUse = status ? 'GSI2' : 'GSI1';
        dynamoDbOption.index = indexToUse;

        const records = await this.stockTable.find(queryCondition, dynamoDbOption);

        const pkField = status ? 'GSI2PK' : 'GSI1PK';
        const skField = status ? 'GSI2SK' : 'GSI1SK';

        const pageRecordCursorPointers = pageRecordHandler(
            records,
            limit,
            direction,
            pkField,
            skField,
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

    async findStockRecordsByStatusAndProductId(status: string, productId: string): Promise<StockDto[]> {
        const stockRecords = await this.stockTable.find(
            {
                GSI5PK: `STOCK#${status}#${productId}`,
            },
            {
                index: 'GSI5',
            }
        );

        return await this.convertToDtoList(stockRecords);
    }

    async findAllRecordsByProductAndLot(productId: string, lotNo: string): Promise<StockDto[]> {
        // Query all ACTIVE stock records for the given product
        // Then filter by lotNo since we can't directly query by productId and lotNo without status
        const stockRecords = await this.stockTable.find(
            {
                GSI3PK: `STOCK#${StatusEnum.ACTIVE}`,
                GSI3SK: productId,
            },
            {
                index: 'GSI3',
            }
        );

        // Filter by lotNo
        const filteredRecords = stockRecords.filter((record) => (record.lotNo || '') === lotNo);

        return await this.convertToDtoList(filteredRecords);
    }

    async deleteRecord(dto: StockDto): Promise<StockDto> {
        const stockRecord: StockDataType = await this.convertToDataType(dto);

        await this.stockTable.remove(stockRecord);

        this.logger.log(`Stock Record hard deleted: ${JSON.stringify(stockRecord)}`);

        return await this.convertToDto(stockRecord);
    }

    async deleteAllRecords(): Promise<void> {
        // Get all the records
        const records = await this.stockTable.find(
            {
                GSI1PK: `STOCK`,
            },
            {
                index: 'GSI1',
            }
        );

        // Delete each record
        for (const record of records) {
            await this.stockTable.remove(record);
            this.logger.log(`Stock Record deleted: ${JSON.stringify(record)}`);
        }
    }

    async findStockRecordsByFilterPagination(
        filter: StockFilterDto,
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<StockDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const whereClause = [
            filter.status ? '(${status} = @{status})' : null,
            filter.stockTypeName && filter.stockTypeName.length > 0
                ? 'contains(${stockTypeName}, @{stockTypeName})'
                : null,
            filter.productUnitName && filter.productUnitName.length > 0
                ? 'contains(${productUnitName}, @{productUnitName})'
                : null,
            filter.productName && filter.productName.length > 0 ? 'contains(${productName}, @{productName})' : null,
            filter.lotNo && filter.lotNo.length > 0 ? 'contains(${lotNo}, @{lotNo})' : null,
        ]
            .filter(Boolean)
            .join(' and ');

        const substitutions = {
            ...(filter.status && { status: filter.status }),
            ...(filter.stockTypeName && { stockTypeName: filter.stockTypeName }),
            ...(filter.productUnitName && { productUnitName: filter.productUnitName }),
            ...(filter.productName && { productName: filter.productName }),
            ...(filter.lotNo && { lotNo: filter.lotNo }),
        };

        //check if filter.fields not undefined but not an array , convert it to an array
        if (filter.fields && !Array.isArray(filter.fields)) {
            filter.fields = [filter.fields];
        }

        //check filter.fields , if it does not include customerId , then add it to the fields
        if (!filter.fields?.includes('stockId')) {
            filter.fields?.push('stockId');
        }

        const stockRecords = await this.stockTable.find(
            {
                GSI1PK: 'STOCK',
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
            stockRecords,
            limit,
            direction,
            'GSI1PK',
            'GSI1SK',
            'PK',
            'SK',
            JSON.stringify(stockRecords.next),
            JSON.stringify(stockRecords.prev)
        );

        return new PageDto(
            await this.convertToDtoList(stockRecords),
            pageRecordCursorPointers.nextCursorPointer,
            pageRecordCursorPointers.prevCursorPointer
        );
    }

    async convertToDto(record: StockDataType): Promise<StockDto> {
        const dto = new StockDto();
        dto.stockId = record.stockId ? record.stockId : '';
        dto.lotNo = record.lotNo ? record.lotNo : '';
        dto.productId = record.productId ? record.productId : '';
        dto.productName = record.productName ? record.productName : '';
        dto.quantityOnHand = record.quantityOnHand ? record.quantityOnHand : 0;
        dto.availableQuantity = record.availableQuantity ? record.availableQuantity : 0;
        dto.productUnitId = record.productUnitId ? record.productUnitId : '';
        dto.productUnitName = record.productUnitName ? record.productUnitName : '';
        dto.expirationDate = record.expirationDate ? record.expirationDate : '';
        dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        dto.stockTypeId = record.stockTypeId ? record.stockTypeId : '';
        dto.stockTypeName = record.stockTypeName ? record.stockTypeName : '';
        dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : {};
        dto.changeReason = (record as StockDataType & { changeReason?: string }).changeReason || undefined;
        dto.approverMessage = record.approverMessage ? record.approverMessage : undefined;
        return dto;
    }

    async convertToDtoList(records: StockDataType[]): Promise<StockDto[]> {
        const dtoList: StockDto[] = [];

        for (const record of records) {
            const dto: StockDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDataType(dto: StockDto): Promise<StockDataType> {
        // Sanitize empty strings to undefined for fields used in GSI keys
        const sanitize = (value: string | undefined) => (value === '' ? undefined : value);

        const lotNo = sanitize(dto.lotNo);
        const productId = sanitize(dto.productId);
        const productName = sanitize(dto.productName);
        const productUnitId = sanitize(dto.productUnitId);
        const expirationDate = sanitize(dto.expirationDate);

        const stockData: StockDataType = {
            stockId: dto.stockId,
            status: dto.status,
            lotNo: lotNo,
            productId: productId,
            productName: productName,
            quantityOnHand: dto.quantityOnHand,
            availableQuantity: dto.availableQuantity,
            productUnitId: productUnitId,
            productUnitName: sanitize(dto.productUnitName),
            expirationDate: expirationDate,
            stockTypeId: sanitize(dto.stockTypeId),
            stockTypeName: sanitize(dto.stockTypeName),
            GSI1PK: `STOCK`,
            GSI1SK: productName,
            GSI2PK: `STOCK#${dto.status}`,
            GSI2SK: productName,
            GSI3PK: `STOCK#${dto.status}`,
            GSI3SK: productId,
            GSI4PK: `STOCK#${dto.status}#${productUnitId}#${productId}`,
            GSI4SK: lotNo,
            GSI5PK: `STOCK#${dto.status}#${productUnitId}#${productId}`,
            GSI5SK: expirationDate,
            activityLogs: dto.activityLogs,
            forApprovalVersion: dto.forApprovalVersion,
            changeReason: dto.changeReason,
            approverMessage: dto.approverMessage,
        };
        return stockData;
    }
}
