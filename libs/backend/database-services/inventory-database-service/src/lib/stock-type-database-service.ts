import { CreateStockTypeDto, PageDto, StatusEnum, StockTypeDto } from '@dto';
import {
    createDynamoDbOptionWithPKSKIndex,
    DynamoDbLibService,
    InventorySchema,
    pageRecordHandler,
    StockTypeDataType,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { StockTypeDatabaseServiceAbstract } from './stock-type-database-service-abstract-class';

@Injectable()
export class StockTypeDatabaseService implements StockTypeDatabaseServiceAbstract {
    protected readonly logger = new Logger(StockTypeDatabaseService.name);

    private readonly stockTypeTable: Model<StockTypeDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_INVENTORY_TABLE = configService.get<string>('DYNAMO_DB_INVENTORY_TABLE');
        if (!DYNAMO_DB_INVENTORY_TABLE) {
            throw new Error('DYNAMO_DB_INVENTORY_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.stockTypeTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_INVENTORY_TABLE, InventorySchema)
            .getModel('StockType');
    }

    async createRecord(stockTypeDto: CreateStockTypeDto): Promise<StockTypeDto> {
        const stockTypeData: StockTypeDataType = {
            status: stockTypeDto.status,
            activityLogs: stockTypeDto.activityLogs,
            forApprovalVersion: stockTypeDto.forApprovalVersion,
            GSI1PK: `STOCK_TYPE`,
            GSI1SK: stockTypeDto.stockTypeName,
            GSI2PK: `STOCK_TYPE#${stockTypeDto.status}`,
            GSI2SK: stockTypeDto.stockTypeName,
        };

        const stockTypeRecord: StockTypeDataType = await this.stockTypeTable.create(stockTypeData);

        return await this.convertToDto(stockTypeRecord);
    }

    async updateRecord(record: StockTypeDto): Promise<StockTypeDto> {
        const stockTypeRecord: StockTypeDataType = await this.convertToDataType(record);

        stockTypeRecord.stockTypeName = record.stockTypeName;
        stockTypeRecord.status = record.status;
        stockTypeRecord.GSI1PK = `STOCK_TYPE`;
        stockTypeRecord.GSI1SK = record.stockTypeName;
        stockTypeRecord.GSI2PK = `STOCK_TYPE#${record.status}`;
        stockTypeRecord.GSI2SK = record.stockTypeName;
        stockTypeRecord.forApprovalVersion = record.forApprovalVersion;

        const updatedStockTypeRecord: StockTypeDataType = await this.stockTypeTable.update(stockTypeRecord);

        return await this.convertToDto(updatedStockTypeRecord);
    }

    async findRecordById(id: string): Promise<StockTypeDto | null> {
        const record = await this.stockTypeTable.get({
            PK: `STOCK_TYPE`,
            SK: `${id}`,
        });

        if (!record) {
            return null;
        }

        return await this.convertToDto(record);
    }

    async findRecordContainingName(name: string): Promise<StockTypeDto[] | null> {
        const stockTypeRecords = await this.stockTypeTable.find(
            {
                GSI1PK: 'STOCK_TYPE',
            },
            {
                where: 'contains(${stockTypeName}, @{stockTypeName})',
                substitutions: {
                    stockTypeName: name,
                },
                index: 'GSI1',
            }
        );

        return await this.convertToDtoList(stockTypeRecords);
    }

    async findRecordByName(name: string): Promise<StockTypeDto | null> {
        const record = await this.stockTypeTable.get(
            {
                GSI1PK: `STOCK_TYPE`,
                GSI1SK: `${name}`,
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

    async getDatabaseRecordById(recordId: string): Promise<StockTypeDataType | undefined> {
        const record: StockTypeDataType | undefined = await this.stockTypeTable.get({
            PK: 'STOCK_TYPE',
            SK: `${recordId}`,
        });

        this.logger.log(`StockType Record returned: ${JSON.stringify(record)}`);

        return record;
    }

    async findRecordsPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<StockTypeDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);

        const records = await this.stockTypeTable.find(
            {
                GSI2PK: `STOCK_TYPE#${status}`,
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

    async deleteRecord(dto: StockTypeDto): Promise<StockTypeDto> {
        const stockTypeRecord: StockTypeDataType = await this.convertToDataType(dto);

        await this.stockTypeTable.remove(stockTypeRecord);

        this.logger.log(`StockType Record hard deleted: ${JSON.stringify(stockTypeRecord)}`);

        return await this.convertToDto(stockTypeRecord);
    }

    async deleteAllRecords(): Promise<void> {
        // Get all the records
        const records = await this.stockTypeTable.find(
            {
                GSI1PK: `STOCK_TYPE`,
            },
            {
                index: 'GSI1',
            }
        );

        // Delete each record
        for (const record of records) {
            await this.stockTypeTable.remove(record);
            this.logger.log(`Stock Type Record deleted: ${JSON.stringify(record)}`);
        }
    }

    async convertToDto(record: StockTypeDataType): Promise<StockTypeDto> {
        const dto = new StockTypeDto();
        dto.stockTypeId = record.stockTypeId ? record.stockTypeId : '';
        dto.stockTypeName = record.stockTypeName ? record.stockTypeName : '';
        dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : {};
        return dto;
    }

    async convertToDtoList(records: StockTypeDataType[]): Promise<StockTypeDto[]> {
        const dtoList: StockTypeDto[] = [];

        for (const record of records) {
            const dto: StockTypeDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDataType(dto: StockTypeDto): Promise<StockTypeDataType> {
        const stockTypeData: StockTypeDataType = {
            stockTypeId: dto.stockTypeId,
            status: dto.status,
            stockTypeName: dto.stockTypeName,
            GSI1PK: `STOCK_TYPE`,
            GSI1SK: dto.stockTypeName,
            GSI2PK: `STOCK_TYPE#${dto.status}`,
            GSI2SK: dto.stockTypeName,
            activityLogs: dto.activityLogs,
            forApprovalVersion: dto.forApprovalVersion,
        };
        return stockTypeData;
    }
}
