import { CreateRawMaterialsLocationDto, PageDto, RawMaterialsLocationDto, StatusEnum } from '@dto';
import {
    createDynamoDbOptionWithPKSKIndex,
    DynamoDbLibService,
    InventorySchema,
    RawMaterialsLocationDataType,
    pageRecordHandler,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { RawMaterialsLocationDatabaseServiceAbstract } from './raw-materials-location-database-service-abstract-class';

@Injectable()
export class RawMaterialsLocationDatabaseService implements RawMaterialsLocationDatabaseServiceAbstract {
    protected readonly logger = new Logger(RawMaterialsLocationDatabaseService.name);

    private readonly rawMaterialsLocationTable: Model<RawMaterialsLocationDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_INVENTORY_TABLE = configService.get<string>('DYNAMO_DB_INVENTORY_TABLE');
        if (!DYNAMO_DB_INVENTORY_TABLE) {
            throw new Error('DYNAMO_DB_INVENTORY_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.rawMaterialsLocationTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_INVENTORY_TABLE, InventorySchema)
            .getModel('RawMaterialsLocation');
    }

    async createRecord(rawMaterialsLocationDto: CreateRawMaterialsLocationDto): Promise<RawMaterialsLocationDto> {
        const rawMaterialsLocationData: RawMaterialsLocationDataType = {
            status: rawMaterialsLocationDto.status as any,
            rawMaterialsLocationName: rawMaterialsLocationDto.rawMaterialsLocationName,
            activityLogs: rawMaterialsLocationDto.activityLogs,
            forApprovalVersion: rawMaterialsLocationDto.forApprovalVersion,
            changeReason: rawMaterialsLocationDto.changeReason,
            approverMessage: rawMaterialsLocationDto.approverMessage,
            GSI1PK: 'RAW_MATERIAL_LOCATION',
            GSI1SK: rawMaterialsLocationDto.rawMaterialsLocationName,
            GSI2PK: `RAW_MATERIAL_LOCATION#${rawMaterialsLocationDto.status}`,
            GSI2SK: rawMaterialsLocationDto.rawMaterialsLocationName,
        };

        const rawMaterialsLocationRecord: RawMaterialsLocationDataType = await this.rawMaterialsLocationTable.create(
            rawMaterialsLocationData
        );

        return await this.convertToDto(rawMaterialsLocationRecord);
    }

    async updateRecord(record: RawMaterialsLocationDto): Promise<RawMaterialsLocationDto> {
        const rawMaterialsLocationRecord: RawMaterialsLocationDataType = await this.convertToDataType(record);

        rawMaterialsLocationRecord.rawMaterialsLocationName = record.rawMaterialsLocationName;
        rawMaterialsLocationRecord.status = record.status as any;
        rawMaterialsLocationRecord.GSI1PK = 'RAW_MATERIAL_LOCATION';
        rawMaterialsLocationRecord.GSI1SK = record.rawMaterialsLocationName;
        rawMaterialsLocationRecord.GSI2PK = `RAW_MATERIAL_LOCATION#${record.status}`;
        rawMaterialsLocationRecord.GSI2SK = record.rawMaterialsLocationName;
        rawMaterialsLocationRecord.forApprovalVersion = record.forApprovalVersion;
        rawMaterialsLocationRecord.changeReason = record.changeReason;
        rawMaterialsLocationRecord.approverMessage = record.approverMessage;

        const updatedRawMaterialsLocationRecord: RawMaterialsLocationDataType =
            await this.rawMaterialsLocationTable.update(rawMaterialsLocationRecord);

        return await this.convertToDto(updatedRawMaterialsLocationRecord);
    }

    async findRecordById(id: string): Promise<RawMaterialsLocationDto | null> {
        const record = await this.rawMaterialsLocationTable.get({
            PK: 'RAW_MATERIAL_LOCATION',
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
    ): Promise<PageDto<RawMaterialsLocationDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.rawMaterialsLocationTable.find(
            {
                GSI1PK: 'RAW_MATERIAL_LOCATION',
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

    async findRecordByName(name: string): Promise<RawMaterialsLocationDto | null> {
        const record = await this.rawMaterialsLocationTable.get(
            {
                GSI1PK: 'RAW_MATERIAL_LOCATION',
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

    async getDatabaseRecordById(recordId: string): Promise<RawMaterialsLocationDataType | undefined> {
        const record: RawMaterialsLocationDataType | undefined = await this.rawMaterialsLocationTable.get({
            PK: 'RAW_MATERIAL_LOCATION',
            SK: `${recordId}`,
        });

        this.logger.log(`RawMaterialsLocation Record returned: ${JSON.stringify(record)}`);

        return record;
    }

    async findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<RawMaterialsLocationDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);

        const records = await this.rawMaterialsLocationTable.find(
            {
                GSI2PK: `RAW_MATERIAL_LOCATION#${status}`,
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
    ): Promise<PageDto<RawMaterialsLocationDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.rawMaterialsLocationTable.find(
            {
                GSI1PK: 'RAW_MATERIAL_LOCATION',
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

    async deleteRecord(dto: RawMaterialsLocationDto): Promise<RawMaterialsLocationDto> {
        const rawMaterialsLocationRecord: RawMaterialsLocationDataType = await this.convertToDataType(dto);

        await this.rawMaterialsLocationTable.remove(rawMaterialsLocationRecord);

        this.logger.log(`RawMaterialsLocation Record hard deleted: ${JSON.stringify(rawMaterialsLocationRecord)}`);

        return await this.convertToDto(rawMaterialsLocationRecord);
    }

    async deleteAllRecords(): Promise<void> {
        const records = await this.rawMaterialsLocationTable.find(
            {
                GSI1PK: 'RAW_MATERIAL_LOCATION',
            },
            {
                index: 'GSI1',
            }
        );

        for (const record of records) {
            await this.rawMaterialsLocationTable.remove(record);
            this.logger.log(`Raw Materials Location Record deleted: ${JSON.stringify(record)}`);
        }
    }

    async convertToDto(record: RawMaterialsLocationDataType): Promise<RawMaterialsLocationDto> {
        const dto = new RawMaterialsLocationDto();
        dto.rawMaterialsLocationId = record.rawMaterialsLocationId ? record.rawMaterialsLocationId : '';
        dto.rawMaterialsLocationName = record.rawMaterialsLocationName ? record.rawMaterialsLocationName : '';
        dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : {};
        dto.changeReason =
            (record as RawMaterialsLocationDataType & { changeReason?: string }).changeReason || undefined;
        dto.approverMessage = record.approverMessage ? record.approverMessage : undefined;
        return dto;
    }

    async convertToDtoList(records: RawMaterialsLocationDataType[]): Promise<RawMaterialsLocationDto[]> {
        const dtoList: RawMaterialsLocationDto[] = [];

        for (const record of records) {
            const dto: RawMaterialsLocationDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDataType(dto: RawMaterialsLocationDto): Promise<RawMaterialsLocationDataType> {
        const rawMaterialsLocationData: RawMaterialsLocationDataType = {
            rawMaterialsLocationId: dto.rawMaterialsLocationId,
            rawMaterialsLocationName: dto.rawMaterialsLocationName,
            status: dto.status as any,
            GSI1PK: 'RAW_MATERIAL_LOCATION',
            GSI1SK: dto.rawMaterialsLocationName,
            GSI2PK: `RAW_MATERIAL_LOCATION#${dto.status}`,
            GSI2SK: dto.rawMaterialsLocationName,
            activityLogs: dto.activityLogs,
            forApprovalVersion: dto.forApprovalVersion,
            changeReason: dto.changeReason,
            approverMessage: dto.approverMessage,
        };
        return rawMaterialsLocationData;
    }
}
