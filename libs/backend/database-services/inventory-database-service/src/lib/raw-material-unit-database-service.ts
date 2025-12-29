import { CreateRawMaterialUnitDto, PageDto, RawMaterialUnitDto, StatusEnum } from '@dto';
import {
    createDynamoDbOptionWithPKSKIndex,
    DynamoDbLibService,
    InventorySchema,
    pageRecordHandler,
    RawMaterialUnitsDataType,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { RawMaterialUnitDatabaseServiceAbstract } from './raw-material-unit-database-service-abstract-class';

@Injectable()
export class RawMaterialUnitDatabaseService implements RawMaterialUnitDatabaseServiceAbstract {
    protected readonly logger = new Logger(RawMaterialUnitDatabaseService.name);

    private readonly rawMaterialUnitTable: Model<RawMaterialUnitsDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_INVENTORY_TABLE = configService.get<string>('DYNAMO_DB_INVENTORY_TABLE');
        if (!DYNAMO_DB_INVENTORY_TABLE) {
            throw new Error('DYNAMO_DB_INVENTORY_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.rawMaterialUnitTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_INVENTORY_TABLE, InventorySchema)
            .getModel('RawMaterialUnits');
    }

    async createRecord(rawMaterialUnitDto: CreateRawMaterialUnitDto): Promise<RawMaterialUnitDto> {
        const rawMaterialUnitData: RawMaterialUnitsDataType = {
            status: rawMaterialUnitDto.status,
            rawMaterialUnitName: rawMaterialUnitDto.rawMaterialUnitName,
            activityLogs: rawMaterialUnitDto.activityLogs,
            forApprovalVersion: rawMaterialUnitDto.forApprovalVersion,
            changeReason: rawMaterialUnitDto.changeReason,
            approverMessage: rawMaterialUnitDto.approverMessage,
            GSI1PK: 'RAW_MATERIAL_UNIT',
            GSI1SK: rawMaterialUnitDto.rawMaterialUnitName,
            GSI2PK: `RAW_MATERIAL_UNIT#${rawMaterialUnitDto.status}`,
            GSI2SK: rawMaterialUnitDto.rawMaterialUnitName,
        };

        const rawMaterialUnitRecord: RawMaterialUnitsDataType = await this.rawMaterialUnitTable.create(
            rawMaterialUnitData
        );

        return await this.convertToDto(rawMaterialUnitRecord);
    }

    async updateRecord(record: RawMaterialUnitDto): Promise<RawMaterialUnitDto> {
        const rawMaterialUnitRecord: RawMaterialUnitsDataType = await this.convertToDataType(record);

        rawMaterialUnitRecord.rawMaterialUnitName = record.rawMaterialUnitName;
        rawMaterialUnitRecord.status = record.status;
        rawMaterialUnitRecord.GSI1PK = 'RAW_MATERIAL_UNIT';
        rawMaterialUnitRecord.GSI1SK = record.rawMaterialUnitName;
        rawMaterialUnitRecord.GSI2PK = `RAW_MATERIAL_UNIT#${record.status}`;
        rawMaterialUnitRecord.GSI2SK = record.rawMaterialUnitName;
        rawMaterialUnitRecord.forApprovalVersion = record.forApprovalVersion;
        rawMaterialUnitRecord.changeReason = record.changeReason;
        rawMaterialUnitRecord.approverMessage = record.approverMessage;

        const updatedRawMaterialUnitRecord: RawMaterialUnitsDataType = await this.rawMaterialUnitTable.update(
            rawMaterialUnitRecord
        );

        return await this.convertToDto(updatedRawMaterialUnitRecord);
    }

    async findRecordById(id: string): Promise<RawMaterialUnitDto | null> {
        const record = await this.rawMaterialUnitTable.get({
            PK: 'RAW_MATERIAL_UNIT',
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
    ): Promise<PageDto<RawMaterialUnitDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.rawMaterialUnitTable.find(
            {
                GSI1PK: 'RAW_MATERIAL_UNIT',
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

    async findRecordByName(name: string): Promise<RawMaterialUnitDto | null> {
        const record = await this.rawMaterialUnitTable.get(
            {
                GSI1PK: 'RAW_MATERIAL_UNIT',
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

    async getDatabaseRecordById(recordId: string): Promise<RawMaterialUnitsDataType | undefined> {
        const record: RawMaterialUnitsDataType | undefined = await this.rawMaterialUnitTable.get({
            PK: 'RAW_MATERIAL_UNIT',
            SK: `${recordId}`,
        });

        this.logger.log(`RawMaterialUnit Record returned: ${JSON.stringify(record)}`);

        return record;
    }

    async findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<RawMaterialUnitDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);

        const records = await this.rawMaterialUnitTable.find(
            {
                GSI2PK: `RAW_MATERIAL_UNIT#${status}`,
                ...(name != null ? { GSI2SK: { begins: name } } : {}),
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
    ): Promise<PageDto<RawMaterialUnitDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.rawMaterialUnitTable.find(
            {
                GSI1PK: 'RAW_MATERIAL_UNIT',
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

    async deleteRecord(dto: RawMaterialUnitDto): Promise<RawMaterialUnitDto> {
        const rawMaterialUnitRecord: RawMaterialUnitsDataType = await this.convertToDataType(dto);

        await this.rawMaterialUnitTable.remove(rawMaterialUnitRecord);

        this.logger.log(`RawMaterialUnit Record hard deleted: ${JSON.stringify(rawMaterialUnitRecord)}`);

        return await this.convertToDto(rawMaterialUnitRecord);
    }

    async deleteAllRecords(): Promise<void> {
        const records = await this.rawMaterialUnitTable.find(
            {
                GSI1PK: 'RAW_MATERIAL_UNIT',
            },
            {
                index: 'GSI1',
            }
        );

        for (const record of records) {
            await this.rawMaterialUnitTable.remove(record);
            this.logger.log(`Raw Material Unit Record deleted: ${JSON.stringify(record)}`);
        }
    }

    async convertToDto(record: RawMaterialUnitsDataType): Promise<RawMaterialUnitDto> {
        const dto = new RawMaterialUnitDto();
        dto.rawMaterialUnitId = record.rawMaterialUnitId ? record.rawMaterialUnitId : '';
        dto.rawMaterialUnitName = record.rawMaterialUnitName ? record.rawMaterialUnitName : '';
        dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : {};
        dto.changeReason = (record as RawMaterialUnitsDataType & { changeReason?: string }).changeReason || undefined;
        dto.approverMessage = record.approverMessage ? record.approverMessage : undefined;
        return dto;
    }

    async convertToDtoList(records: RawMaterialUnitsDataType[]): Promise<RawMaterialUnitDto[]> {
        const dtoList: RawMaterialUnitDto[] = [];

        for (const record of records) {
            const dto: RawMaterialUnitDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDataType(dto: RawMaterialUnitDto): Promise<RawMaterialUnitsDataType> {
        const rawMaterialUnitData: RawMaterialUnitsDataType = {
            rawMaterialUnitId: dto.rawMaterialUnitId,
            rawMaterialUnitName: dto.rawMaterialUnitName,
            status: dto.status,
            GSI1PK: 'RAW_MATERIAL_UNIT',
            GSI1SK: dto.rawMaterialUnitName,
            GSI2PK: `RAW_MATERIAL_UNIT#${dto.status}`,
            GSI2SK: dto.rawMaterialUnitName,
            activityLogs: dto.activityLogs,
            forApprovalVersion: dto.forApprovalVersion,
            changeReason: dto.changeReason,
            approverMessage: dto.approverMessage,
        };
        return rawMaterialUnitData;
    }
}
