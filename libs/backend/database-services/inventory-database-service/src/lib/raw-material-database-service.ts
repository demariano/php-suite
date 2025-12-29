import { CreateRawMaterialDto, PageDto, RawMaterialDto, StatusEnum } from '@dto';
import {
    createDynamoDbOptionWithPKSKIndex,
    DynamoDbLibService,
    InventorySchema,
    pageRecordHandler,
    RawMaterialsDataType,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { RawMaterialDatabaseServiceAbstract } from './raw-material-database-service-abstract-class';

@Injectable()
export class RawMaterialDatabaseService implements RawMaterialDatabaseServiceAbstract {
    protected readonly logger = new Logger(RawMaterialDatabaseService.name);

    private readonly rawMaterialTable: Model<RawMaterialsDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_INVENTORY_TABLE = configService.get<string>('DYNAMO_DB_INVENTORY_TABLE');
        if (!DYNAMO_DB_INVENTORY_TABLE) {
            throw new Error('DYNAMO_DB_INVENTORY_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.rawMaterialTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_INVENTORY_TABLE, InventorySchema)
            .getModel('RawMaterials');
    }

    async createRecord(rawMaterialDto: CreateRawMaterialDto): Promise<RawMaterialDto> {
        const rawMaterialData: RawMaterialsDataType = {
            status: rawMaterialDto.status,
            rawMaterialName: rawMaterialDto.rawMaterialName,
            description: rawMaterialDto.description,
            activityLogs: rawMaterialDto.activityLogs,
            forApprovalVersion: rawMaterialDto.forApprovalVersion,
            changeReason: rawMaterialDto.changeReason,
            approverMessage: rawMaterialDto.approverMessage,
            GSI1PK: 'RAW_MATERIAL',
            GSI1SK: rawMaterialDto.rawMaterialName,
            GSI2PK: `RAW_MATERIAL#${rawMaterialDto.status}`,
            GSI2SK: rawMaterialDto.rawMaterialName,
        };

        const rawMaterialRecord: RawMaterialsDataType = await this.rawMaterialTable.create(rawMaterialData);

        return await this.convertToDto(rawMaterialRecord);
    }

    async updateRecord(record: RawMaterialDto): Promise<RawMaterialDto> {
        const rawMaterialRecord: RawMaterialsDataType = await this.convertToDataType(record);

        rawMaterialRecord.rawMaterialName = record.rawMaterialName;
        rawMaterialRecord.description = record.description;
        rawMaterialRecord.status = record.status;
        rawMaterialRecord.GSI1PK = 'RAW_MATERIAL';
        rawMaterialRecord.GSI1SK = record.rawMaterialName;
        rawMaterialRecord.GSI2PK = `RAW_MATERIAL#${record.status}`;
        rawMaterialRecord.GSI2SK = record.rawMaterialName;
        rawMaterialRecord.forApprovalVersion = record.forApprovalVersion;
        rawMaterialRecord.changeReason = record.changeReason;
        rawMaterialRecord.approverMessage = record.approverMessage;

        const updatedRawMaterialRecord: RawMaterialsDataType = await this.rawMaterialTable.update(rawMaterialRecord);

        return await this.convertToDto(updatedRawMaterialRecord);
    }

    async findRecordById(id: string): Promise<RawMaterialDto | null> {
        const record = await this.rawMaterialTable.get({
            PK: 'RAW_MATERIAL',
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
    ): Promise<PageDto<RawMaterialDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.rawMaterialTable.find(
            {
                GSI1PK: 'RAW_MATERIAL',
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

    async findRecordByName(name: string): Promise<RawMaterialDto | null> {
        const record = await this.rawMaterialTable.get(
            {
                GSI1PK: 'RAW_MATERIAL',
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

    async getDatabaseRecordById(recordId: string): Promise<RawMaterialsDataType | undefined> {
        const record: RawMaterialsDataType | undefined = await this.rawMaterialTable.get({
            PK: 'RAW_MATERIAL',
            SK: `${recordId}`,
        });

        this.logger.log(`RawMaterial Record returned: ${JSON.stringify(record)}`);

        return record;
    }

    async findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<RawMaterialDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);

        const records = await this.rawMaterialTable.find(
            {
                GSI2PK: `RAW_MATERIAL#${status}`,
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
    ): Promise<PageDto<RawMaterialDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.rawMaterialTable.find(
            {
                GSI1PK: 'RAW_MATERIAL',
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

    async deleteRecord(dto: RawMaterialDto): Promise<RawMaterialDto> {
        const rawMaterialRecord: RawMaterialsDataType = await this.convertToDataType(dto);

        await this.rawMaterialTable.remove(rawMaterialRecord);

        this.logger.log(`RawMaterial Record hard deleted: ${JSON.stringify(rawMaterialRecord)}`);

        return await this.convertToDto(rawMaterialRecord);
    }

    async deleteAllRecords(): Promise<void> {
        const records = await this.rawMaterialTable.find(
            {
                GSI1PK: 'RAW_MATERIAL',
            },
            {
                index: 'GSI1',
            }
        );

        for (const record of records) {
            await this.rawMaterialTable.remove(record);
            this.logger.log(`Raw Material Record deleted: ${JSON.stringify(record)}`);
        }
    }

    async convertToDto(record: RawMaterialsDataType): Promise<RawMaterialDto> {
        const dto = new RawMaterialDto();
        dto.rawMaterialId = record.rawMaterialId ? record.rawMaterialId : '';
        dto.rawMaterialName = record.rawMaterialName ? record.rawMaterialName : '';
        dto.description = record.description ? record.description : '';
        dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : {};
        dto.changeReason = (record as RawMaterialsDataType & { changeReason?: string }).changeReason || undefined;
        dto.approverMessage = record.approverMessage ? record.approverMessage : undefined;
        return dto;
    }

    async convertToDtoList(records: RawMaterialsDataType[]): Promise<RawMaterialDto[]> {
        const dtoList: RawMaterialDto[] = [];

        for (const record of records) {
            const dto: RawMaterialDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDataType(dto: RawMaterialDto): Promise<RawMaterialsDataType> {
        const rawMaterialData: RawMaterialsDataType = {
            rawMaterialId: dto.rawMaterialId,
            rawMaterialName: dto.rawMaterialName,
            description: dto.description,
            status: dto.status,
            GSI1PK: 'RAW_MATERIAL',
            GSI1SK: dto.rawMaterialName,
            GSI2PK: `RAW_MATERIAL#${dto.status}`,
            GSI2SK: dto.rawMaterialName,
            activityLogs: dto.activityLogs,
            forApprovalVersion: dto.forApprovalVersion,
            changeReason: dto.changeReason,
            approverMessage: dto.approverMessage,
        };
        return rawMaterialData;
    }
}
