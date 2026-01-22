import { AreaDto, CreateAreaDto, PageDto, StatusEnum } from '@dto';
import {
    AreaDataType,
    createDynamoDbOptionWithPKSKIndex,
    CustomerSchema,
    DynamoDbLibService,
    pageRecordHandler,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { AreaDatabaseServiceAbstract } from './area-database-service-abstract-class';

@Injectable()
export class AreaDatabaseService implements AreaDatabaseServiceAbstract {
    protected readonly logger = new Logger(AreaDatabaseService.name);

    private readonly areaTable: Model<AreaDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_CUSTOMER_TABLE = configService.get<string>('DYNAMO_DB_CUSTOMER_TABLE');
        if (!DYNAMO_DB_CUSTOMER_TABLE) {
            throw new Error('DYNAMO_DB_CUSTOMER_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.areaTable = dynamoDbService.dynamoDbMainTable(DYNAMO_DB_CUSTOMER_TABLE, CustomerSchema).getModel('Area');
    }

    async createRecord(areaDto: CreateAreaDto): Promise<AreaDto> {
        const areaData: AreaDataType = {
            status: areaDto.status,
            areaName: areaDto.areaName,
            activityLogs: areaDto.activityLogs,
            forApprovalVersion: areaDto.forApprovalVersion,
            territoryManagerId: areaDto.territoryManagerId,
            territoryManagerName: areaDto.territoryManagerName,
            towns: areaDto.towns,
            idPrefix: areaDto.idPrefix,
            GSI1PK: `AREA`,
            GSI1SK: areaDto.areaName,
            GSI2PK: `AREA#${areaDto.status}`,
            GSI2SK: areaDto.areaName,
            GSI3PK: `AREA`,
            GSI3SK: areaDto.territoryManagerId,
        };

        const areaRecord: AreaDataType = await this.areaTable.create(areaData);

        return await this.convertToDto(areaRecord);
    }

    async updateRecord(record: AreaDto): Promise<AreaDto> {
        const areaRecord: AreaDataType = await this.convertToDataType(record);

        areaRecord.areaName = record.areaName;
        areaRecord.status = record.status;
        areaRecord.GSI1PK = `AREA`;
        areaRecord.GSI1SK = record.areaName;
        areaRecord.GSI2PK = `AREA#${record.status}`;
        areaRecord.GSI2SK = record.areaName;
        areaRecord.GSI3PK = `AREA`;
        areaRecord.GSI3SK = record.territoryManagerId;
        areaRecord.forApprovalVersion = record.forApprovalVersion;
        areaRecord.territoryManagerId = record.territoryManagerId;
        areaRecord.territoryManagerName = record.territoryManagerName;
        areaRecord.changeReason = record.changeReason;
        areaRecord.approverMessage = record.approverMessage;
        areaRecord.towns = record.towns || [];
        areaRecord.idPrefix = record.idPrefix;

        const updatedAreaRecord: AreaDataType = await this.areaTable.update(areaRecord);

        return await this.convertToDto(updatedAreaRecord);
    }

    async findRecordById(id: string): Promise<AreaDto | null> {
        const record = await this.areaTable.get({
            PK: `AREA`,
            SK: `${id}`,
        });

        if (!record) {
            return null;
        }

        return await this.convertToDto(record);
    }

    async deleteAllRecords(): Promise<void> {
        //get all the records
        const records = await this.areaTable.find(
            {
                GSI1PK: `AREA`,
            },
            {
                index: 'GSI1',
            }
        );

        for (const record of records) {
            await this.areaTable.remove(record);
        }
    }

    async findRecordContainingName(
        limit: number,
        name: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<AreaDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.areaTable.find(
            {
                GSI1PK: `AREA`,
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

    async findRecordByName(name: string): Promise<AreaDto | null> {
        const record = await this.areaTable.get(
            {
                GSI1PK: `AREA`,
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

    async getDatabaseRecordById(recordId: string): Promise<AreaDataType | undefined> {
        const record: AreaDataType | undefined = await this.areaTable.get({
            PK: 'AREA',
            SK: `${recordId}`,
        });

        this.logger.log(`Area Record returned: ${JSON.stringify(record)}`);

        return record;
    }

    async findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<AreaDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);

        const records = await this.areaTable.find(
            {
                GSI2PK: `AREA#${status}`,
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

    async findRecordsByPagination(limit: number, direction: string, cursorPointer: string): Promise<PageDto<AreaDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.areaTable.find(
            {
                GSI1PK: `AREA`,
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

    async deleteRecord(dto: AreaDto): Promise<AreaDto> {
        const areaRecord: AreaDataType = await this.convertToDataType(dto);

        await this.areaTable.remove(areaRecord);

        this.logger.log(`Area Record hard deleted: ${JSON.stringify(areaRecord)}`);

        return await this.convertToDto(areaRecord);
    }

    async convertToDto(record: AreaDataType): Promise<AreaDto> {
        const dto = new AreaDto();
        dto.areaId = record.areaId ? record.areaId : '';
        dto.areaName = record.areaName ? record.areaName : '';
        dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : {};
        dto.territoryManagerId = record.territoryManagerId ? record.territoryManagerId : '';
        dto.territoryManagerName = record.territoryManagerName ? record.territoryManagerName : '';
        dto.changeReason = (record as AreaDataType & { changeReason?: string }).changeReason || undefined;
        dto.approverMessage = record.approverMessage ? record.approverMessage : undefined;
        dto.towns = record.towns ? record.towns : [];
        dto.idPrefix = record.idPrefix ? record.idPrefix : undefined;
        return dto;
    }

    async convertToDtoList(records: AreaDataType[]): Promise<AreaDto[]> {
        const dtoList: AreaDto[] = [];

        for (const record of records) {
            const dto: AreaDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async findRecordsByTerritoryManagerIdPagination(
        limit: number,
        territoryManagerId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<AreaDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI3', direction, cursorPointer);

        const records = await this.areaTable.find(
            {
                GSI3PK: `AREA`,
                GSI3SK: territoryManagerId,
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

    async batchUpdate(records: AreaDto[]): Promise<void> {
        const updatePromises = records.map((record) => this.updateRecord(record));
        await Promise.all(updatePromises);
    }

    async convertToDataType(dto: AreaDto): Promise<AreaDataType> {
        const areaData: AreaDataType = {
            areaId: dto.areaId,
            status: dto.status,
            areaName: dto.areaName,
            GSI1PK: `AREA`,
            GSI1SK: dto.areaName,
            GSI2PK: `AREA#${dto.status}`,
            GSI2SK: dto.areaName,
            GSI3PK: `AREA`,
            GSI3SK: dto.territoryManagerId,
            towns: dto.towns,
            activityLogs: dto.activityLogs,
            forApprovalVersion: dto.forApprovalVersion,
            territoryManagerId: dto.territoryManagerId,
            territoryManagerName: dto.territoryManagerName,
            changeReason: dto.changeReason,
            approverMessage: dto.approverMessage,
            idPrefix: dto.idPrefix,
        };
        return areaData;
    }

    async findRecordsByTerritoryManagerId(territoryManagerId: string): Promise<AreaDto[]> {
        const records = await this.areaTable.find(
            {
                GSI3PK: 'AREA',
                GSI3SK: territoryManagerId,
            },
            { index: 'GSI3' }
        );

        return await this.convertToDtoList(records);
    }

    async findRecordByIdPrefix(idPrefix: string): Promise<AreaDto | null> {
        if (!idPrefix || idPrefix.trim() === '') {
            return null;
        }

        // Since there's no index on idPrefix, we need to scan all areas
        // Using GSI1 to get all areas and filter by idPrefix
        const records = await this.areaTable.find(
            {
                GSI1PK: 'AREA',
            },
            { index: 'GSI1' }
        );

        // Filter records to find one with matching idPrefix
        for (const record of records) {
            if (record.idPrefix && record.idPrefix.trim().toLowerCase() === idPrefix.trim().toLowerCase()) {
                return await this.convertToDto(record);
            }
        }

        return null;
    }
}
