import { CreateRawMaterialsStockDto, PageDto, RawMaterialsStockDto, StatusEnum } from '@dto';
import {
    createDynamoDbOptionWithPKSKIndex,
    DynamoDbLibService,
    InventorySchema,
    pageRecordHandler,
    RawMaterialsStockDataType,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { RawMaterialsStockDatabaseServiceAbstract } from './raw-materials-stock-database-service-abstract-class';

@Injectable()
export class RawMaterialsStockDatabaseService implements RawMaterialsStockDatabaseServiceAbstract {
    protected readonly logger = new Logger(RawMaterialsStockDatabaseService.name);

    private readonly rawMaterialsStockTable: Model<RawMaterialsStockDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_INVENTORY_TABLE = configService.get<string>('DYNAMO_DB_INVENTORY_TABLE');
        if (!DYNAMO_DB_INVENTORY_TABLE) {
            throw new Error('DYNAMO_DB_INVENTORY_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.rawMaterialsStockTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_INVENTORY_TABLE, InventorySchema)
            .getModel('RawMaterialsStock');
    }

    async createRecord(rawMaterialsStockDto: CreateRawMaterialsStockDto): Promise<RawMaterialsStockDto> {
        const rawMaterialsStockData: RawMaterialsStockDataType = {
            status: rawMaterialsStockDto.status as any,
            rawMaterialId: rawMaterialsStockDto.rawMaterialId,
            rawMaterialName: rawMaterialsStockDto.rawMaterialName,
            rawMaterialUnitId: rawMaterialsStockDto.rawMaterialUnitId,
            rawMaterialUnitName: rawMaterialsStockDto.rawMaterialUnitName,
            rawMaterialSupplierId: rawMaterialsStockDto.rawMaterialSupplierId,
            rawMaterialSupplierName: rawMaterialsStockDto.rawMaterialSupplierName,
            rawMaterialsLocationId: rawMaterialsStockDto.rawMaterialsLocationId,
            rawMaterialsLocationName: rawMaterialsStockDto.rawMaterialsLocationName,
            rawMaterialNamePoNo: rawMaterialsStockDto.rawMaterialNamePoNo,
            qty: rawMaterialsStockDto.qty,
            lotNo: rawMaterialsStockDto.lotNo,
            activityLogs: rawMaterialsStockDto.activityLogs,
            forApprovalVersion: rawMaterialsStockDto.forApprovalVersion,
            changeReason: rawMaterialsStockDto.changeReason,
            approverMessage: rawMaterialsStockDto.approverMessage,
            GSI1PK: 'RAW_MATERIAL_STOCK',
            GSI1SK: rawMaterialsStockDto.rawMaterialName,
            GSI2PK: `RAW_MATERIAL_STOCK#${rawMaterialsStockDto.status}`,
            GSI2SK: rawMaterialsStockDto.rawMaterialName,
            GSI3PK: `RAW_MATERIAL_STOCK#${rawMaterialsStockDto.rawMaterialId}`,
            GSI4PK: `RAW_MATERIAL_STOCK#${rawMaterialsStockDto.rawMaterialUnitId}`,
            GSI5PK: `RAW_MATERIAL_STOCK#${rawMaterialsStockDto.rawMaterialSupplierId}`,
            GSI6PK: `RAW_MATERIAL_STOCK#${rawMaterialsStockDto.rawMaterialsLocationId}`,
        };

        const rawMaterialsStockRecord: RawMaterialsStockDataType = await this.rawMaterialsStockTable.create(
            rawMaterialsStockData
        );

        return await this.convertToDto(rawMaterialsStockRecord);
    }

    async updateRecord(record: RawMaterialsStockDto): Promise<RawMaterialsStockDto> {
        const rawMaterialsStockRecord: RawMaterialsStockDataType = await this.convertToDataType(record);

        rawMaterialsStockRecord.rawMaterialId = record.rawMaterialId;
        rawMaterialsStockRecord.rawMaterialName = record.rawMaterialName;
        rawMaterialsStockRecord.rawMaterialUnitId = record.rawMaterialUnitId;
        rawMaterialsStockRecord.rawMaterialUnitName = record.rawMaterialUnitName;
        rawMaterialsStockRecord.rawMaterialSupplierId = record.rawMaterialSupplierId;
        rawMaterialsStockRecord.rawMaterialSupplierName = record.rawMaterialSupplierName;
        rawMaterialsStockRecord.rawMaterialsLocationId = record.rawMaterialsLocationId;
        rawMaterialsStockRecord.rawMaterialsLocationName = record.rawMaterialsLocationName;
        rawMaterialsStockRecord.rawMaterialNamePoNo = record.rawMaterialNamePoNo;
        rawMaterialsStockRecord.qty = record.qty;
        rawMaterialsStockRecord.lotNo = record.lotNo;
        rawMaterialsStockRecord.status = record.status as any;
        rawMaterialsStockRecord.GSI1PK = 'RAW_MATERIAL_STOCK';
        rawMaterialsStockRecord.GSI1SK = record.rawMaterialName;
        rawMaterialsStockRecord.GSI2PK = `RAW_MATERIAL_STOCK#${record.status}`;
        rawMaterialsStockRecord.GSI2SK = record.rawMaterialName;
        rawMaterialsStockRecord.GSI3PK = `RAW_MATERIAL_STOCK#${record.rawMaterialId}`;
        rawMaterialsStockRecord.GSI3SK = record.rawMaterialsStockId;
        rawMaterialsStockRecord.GSI4PK = `RAW_MATERIAL_STOCK#${record.rawMaterialUnitId}`;
        rawMaterialsStockRecord.GSI4SK = record.rawMaterialsStockId;
        rawMaterialsStockRecord.GSI5PK = `RAW_MATERIAL_STOCK#${record.rawMaterialSupplierId}`;
        rawMaterialsStockRecord.GSI5SK = record.rawMaterialsStockId;
        rawMaterialsStockRecord.GSI6PK = `RAW_MATERIAL_STOCK#${record.rawMaterialsLocationId}`;
        rawMaterialsStockRecord.GSI6SK = record.rawMaterialsStockId;
        rawMaterialsStockRecord.forApprovalVersion = record.forApprovalVersion;
        rawMaterialsStockRecord.changeReason = record.changeReason;
        rawMaterialsStockRecord.approverMessage = record.approverMessage;

        const updatedRawMaterialsStockRecord: RawMaterialsStockDataType = await this.rawMaterialsStockTable.update(
            rawMaterialsStockRecord
        );

        return await this.convertToDto(updatedRawMaterialsStockRecord);
    }

    async findRecordById(id: string): Promise<RawMaterialsStockDto | null> {
        const record = await this.rawMaterialsStockTable.get({
            PK: 'RAW_MATERIAL_STOCK',
            SK: `${id}`,
        });

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
    ): Promise<PageDto<RawMaterialsStockDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.rawMaterialsStockTable.find(
            {
                GSI1PK: 'RAW_MATERIAL_STOCK',
                GSI1SK: {
                    begins: name,
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

    async findRecordByName(name: string): Promise<RawMaterialsStockDto | null> {
        const record = await this.rawMaterialsStockTable.get(
            {
                GSI1PK: 'RAW_MATERIAL_STOCK',
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

    async findRecordByNameAndLotNo(name: string, lotNo?: string): Promise<RawMaterialsStockDto | null> {
        const records = await this.rawMaterialsStockTable.find(
            {
                GSI1PK: 'RAW_MATERIAL_STOCK',
                GSI1SK: name,
            },
            {
                index: 'GSI1',
            }
        );

        const target = (records || []).find((r) => {
            const recordLot = (r as RawMaterialsStockDataType).lotNo || '';
            if (lotNo == null || lotNo === '') {
                return recordLot === '';
            }
            return recordLot === lotNo;
        });

        if (!target) {
            return null;
        }

        return await this.convertToDto(target as RawMaterialsStockDataType);
    }

    async getDatabaseRecordById(recordId: string): Promise<RawMaterialsStockDataType | undefined> {
        const record: RawMaterialsStockDataType | undefined = await this.rawMaterialsStockTable.get({
            PK: 'RAW_MATERIAL_STOCK',
            SK: `${recordId}`,
        });

        this.logger.log(`RawMaterialsStock Record returned: ${JSON.stringify(record)}`);

        return record;
    }

    async findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<RawMaterialsStockDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);

        const records = await this.rawMaterialsStockTable.find(
            {
                GSI2PK: `RAW_MATERIAL_STOCK#${status}`,
                ...(name != null && name.trim() !== '' ? { GSI2SK: { begins: name.trim() } } : {}),
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
    ): Promise<PageDto<RawMaterialsStockDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.rawMaterialsStockTable.find(
            {
                GSI1PK: 'RAW_MATERIAL_STOCK',
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

    async deleteRecord(dto: RawMaterialsStockDto): Promise<RawMaterialsStockDto> {
        const rawMaterialsStockRecord: RawMaterialsStockDataType = await this.convertToDataType(dto);

        await this.rawMaterialsStockTable.remove(rawMaterialsStockRecord);

        this.logger.log(`RawMaterialsStock Record hard deleted: ${JSON.stringify(rawMaterialsStockRecord)}`);

        return await this.convertToDto(rawMaterialsStockRecord);
    }

    async deleteAllRecords(): Promise<void> {
        const records = await this.rawMaterialsStockTable.find(
            {
                GSI1PK: 'RAW_MATERIAL_STOCK',
            },
            {
                index: 'GSI1',
            }
        );

        for (const record of records) {
            await this.rawMaterialsStockTable.remove(record);
            this.logger.log(`Raw Materials Stock Record deleted: ${JSON.stringify(record)}`);
        }
    }

    async convertToDto(record: RawMaterialsStockDataType): Promise<RawMaterialsStockDto> {
        const dto = new RawMaterialsStockDto();
        dto.rawMaterialsStockId = record.rawMaterialsStockId ? record.rawMaterialsStockId : '';
        dto.rawMaterialId = record.rawMaterialId ? record.rawMaterialId : '';
        dto.rawMaterialName = record.rawMaterialName ? record.rawMaterialName : '';
        dto.rawMaterialUnitId = record.rawMaterialUnitId ? record.rawMaterialUnitId : '';
        dto.rawMaterialUnitName = record.rawMaterialUnitName ? record.rawMaterialUnitName : '';
        dto.rawMaterialSupplierId = record.rawMaterialSupplierId ? record.rawMaterialSupplierId : '';
        dto.rawMaterialSupplierName = record.rawMaterialSupplierName ? record.rawMaterialSupplierName : '';
        dto.rawMaterialsLocationId = record.rawMaterialsLocationId ? record.rawMaterialsLocationId : '';
        dto.rawMaterialsLocationName = record.rawMaterialsLocationName ? record.rawMaterialsLocationName : '';
        dto.rawMaterialNamePoNo = record.rawMaterialNamePoNo ? record.rawMaterialNamePoNo : '';
        dto.qty = record.qty ? record.qty : 0;
        dto.lotNo = record.lotNo ? record.lotNo : '';
        dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : {};
        dto.changeReason = (record as RawMaterialsStockDataType & { changeReason?: string }).changeReason || undefined;
        dto.approverMessage = record.approverMessage ? record.approverMessage : undefined;
        return dto;
    }

    async convertToDtoList(records: RawMaterialsStockDataType[]): Promise<RawMaterialsStockDto[]> {
        const dtoList: RawMaterialsStockDto[] = [];

        for (const record of records) {
            const dto: RawMaterialsStockDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async findRecordsByRawMaterialIdPagination(
        limit: number,
        rawMaterialId: string,
        direction: 'next' | 'prev',
        cursorPointer: string
    ): Promise<PageDto<RawMaterialsStockDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI3', direction, cursorPointer);

        const records = await this.rawMaterialsStockTable.find(
            {
                GSI3PK: `RAW_MATERIAL_STOCK#${rawMaterialId}`,
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

    async findRecordsByRawMaterialUnitIdPagination(
        limit: number,
        rawMaterialUnitId: string,
        direction: 'next' | 'prev',
        cursorPointer: string
    ): Promise<PageDto<RawMaterialsStockDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI4', direction, cursorPointer);

        const records = await this.rawMaterialsStockTable.find(
            {
                GSI4PK: `RAW_MATERIAL_STOCK#${rawMaterialUnitId}`,
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

    async findRecordsByRawMaterialSupplierIdPagination(
        limit: number,
        rawMaterialSupplierId: string,
        direction: 'next' | 'prev',
        cursorPointer: string
    ): Promise<PageDto<RawMaterialsStockDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI5', direction, cursorPointer);

        const records = await this.rawMaterialsStockTable.find(
            {
                GSI5PK: `RAW_MATERIAL_STOCK#${rawMaterialSupplierId}`,
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

    async findRecordsByRawMaterialsLocationIdPagination(
        limit: number,
        rawMaterialsLocationId: string,
        direction: 'next' | 'prev',
        cursorPointer: string
    ): Promise<PageDto<RawMaterialsStockDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI6', direction, cursorPointer);

        const records = await this.rawMaterialsStockTable.find(
            {
                GSI6PK: `RAW_MATERIAL_STOCK#${rawMaterialsLocationId}`,
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

    async batchUpdate(records: RawMaterialsStockDto[]): Promise<void> {
        await Promise.all(records.map((record) => this.updateRecord(record)));
    }

    async convertToDataType(dto: RawMaterialsStockDto): Promise<RawMaterialsStockDataType> {
        const rawMaterialsStockData: RawMaterialsStockDataType = {
            rawMaterialsStockId: dto.rawMaterialsStockId,
            rawMaterialId: dto.rawMaterialId,
            rawMaterialName: dto.rawMaterialName,
            rawMaterialUnitId: dto.rawMaterialUnitId,
            rawMaterialUnitName: dto.rawMaterialUnitName,
            rawMaterialSupplierId: dto.rawMaterialSupplierId,
            rawMaterialSupplierName: dto.rawMaterialSupplierName,
            rawMaterialsLocationId: dto.rawMaterialsLocationId,
            rawMaterialsLocationName: dto.rawMaterialsLocationName,
            rawMaterialNamePoNo: dto.rawMaterialNamePoNo,
            qty: dto.qty,
            lotNo: dto.lotNo,
            status: dto.status as any,
            GSI1PK: 'RAW_MATERIAL_STOCK',
            GSI1SK: dto.rawMaterialName,
            GSI2PK: `RAW_MATERIAL_STOCK#${dto.status}`,
            GSI2SK: dto.rawMaterialName,
            GSI3PK: `RAW_MATERIAL_STOCK#${dto.rawMaterialId}`,
            GSI3SK: dto.rawMaterialsStockId,
            GSI4PK: `RAW_MATERIAL_STOCK#${dto.rawMaterialUnitId}`,
            GSI4SK: dto.rawMaterialsStockId,
            GSI5PK: `RAW_MATERIAL_STOCK#${dto.rawMaterialSupplierId}`,
            GSI5SK: dto.rawMaterialsStockId,
            GSI6PK: `RAW_MATERIAL_STOCK#${dto.rawMaterialsLocationId}`,
            GSI6SK: dto.rawMaterialsStockId,
            activityLogs: dto.activityLogs,
            forApprovalVersion: dto.forApprovalVersion,
            changeReason: dto.changeReason,
            approverMessage: dto.approverMessage,
        };
        return rawMaterialsStockData;
    }
}
