import { CreateTownDto, PageDto, StatusEnum, TownDto } from '@dto';
import {
    createDynamoDbOptionWithPKSKIndex,
    CustomerSchema,
    DynamoDbLibService,
    pageRecordHandler,
    TownDataType,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { TownDatabaseServiceAbstract } from './town-database-service-abstract-class';

@Injectable()
export class TownDatabaseService implements TownDatabaseServiceAbstract {
    protected readonly logger = new Logger(TownDatabaseService.name);

    private readonly townTable: Model<TownDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_CUSTOMER_TABLE = configService.get<string>('DYNAMO_DB_CUSTOMER_TABLE');
        if (!DYNAMO_DB_CUSTOMER_TABLE) {
            throw new Error('DYNAMO_DB_CUSTOMER_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.townTable = dynamoDbService.dynamoDbMainTable(DYNAMO_DB_CUSTOMER_TABLE, CustomerSchema).getModel('Town');
    }

    async createRecord(townDto: CreateTownDto): Promise<TownDto> {
        const townData: TownDataType = {
            status: townDto.status,
            townName: townDto.townName,
            activityLogs: townDto.activityLogs,
            forApprovalVersion: townDto.forApprovalVersion,
            areaId: townDto.areaId,
            areaName: townDto.areaName,
            GSI1PK: `TOWN`,
            GSI1SK: townDto.townName,
            GSI2PK: `TOWN#${townDto.status}`,
            GSI2SK: townDto.townName,
        };

        const townRecord: TownDataType = await this.townTable.create(townData);

        return await this.convertToDto(townRecord);
    }

    async updateRecord(record: TownDto): Promise<TownDto> {
        const townRecord: TownDataType = await this.convertToDataType(record);

        townRecord.townName = record.townName;
        townRecord.status = record.status;
        townRecord.areaId = record.areaId;
        townRecord.areaName = record.areaName;
        townRecord.GSI1PK = `TOWN`;
        townRecord.GSI1SK = record.townName;
        townRecord.GSI2PK = `TOWN#${record.status}`;
        townRecord.GSI2SK = record.townName;
        townRecord.forApprovalVersion = record.forApprovalVersion;
        townRecord.changeReason = record.changeReason;

        const updatedTownRecord: TownDataType = await this.townTable.update(townRecord);

        return await this.convertToDto(updatedTownRecord);
    }

    async findRecordById(id: string): Promise<TownDto | null> {
        const record = await this.townTable.get({
            PK: `TOWN`,
            SK: `${id}`,
        });

        if (!record) {
            return null;
        }

        return await this.convertToDto(record);
    }

    async findRecordContainingName(
        limit: number,
        name: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<TownDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.townTable.find(
            {
                GSI1PK: `TOWN`,
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

    async findRecordByName(name: string): Promise<TownDto | null> {
        const record = await this.townTable.get(
            {
                GSI1PK: `TOWN`,
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

    async findRecordsByNamePagination(
        limit: number,
        name: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<TownDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.townTable.find(
            {
                GSI1PK: `TOWN`,
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

    async deleteAllRecords(): Promise<void> {
        //get all the records
        const records = await this.townTable.find(
            {
                GSI1PK: `TOWN`,
            },
            {
                index: 'GSI1',
            }
        );

        for (const record of records) {
            await this.townTable.remove(record);
        }
    }

    async getDatabaseRecordById(recordId: string): Promise<TownDataType | undefined> {
        const record: TownDataType | undefined = await this.townTable.get({
            PK: 'TOWN',
            SK: `${recordId}`,
        });

        this.logger.log(`Town Record returned: ${JSON.stringify(record)}`);

        return record;
    }

    async findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<TownDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);

        const records = await this.townTable.find(
            {
                GSI2PK: `TOWN#${status}`,
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

    async findRecordsByPagination(limit: number, direction: string, cursorPointer: string): Promise<PageDto<TownDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.townTable.find(
            {
                GSI1PK: `TOWN`,
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

    async findRecordByStatusAndAreaId(areaId: string, status: string): Promise<TownDto[] | null> {
        const townRecords = await this.townTable.find(
            {
                GSI3PK: `TOWN#${areaId}#${status}`,
            },
            {
                index: 'GSI3',
            }
        );

        return await this.convertToDtoList(townRecords);
    }

    async deleteRecord(dto: TownDto): Promise<TownDto> {
        const townRecord: TownDataType = await this.convertToDataType(dto);

        await this.townTable.remove(townRecord);

        this.logger.log(`Town Record hard deleted: ${JSON.stringify(townRecord)}`);

        return await this.convertToDto(townRecord);
    }

    async convertToDto(record: TownDataType): Promise<TownDto> {
        const dto = new TownDto();
        dto.townId = record.townId ? record.townId : '';
        dto.townName = record.townName ? record.townName : '';
        dto.areaName = record.areaName ? record.areaName : '';
        dto.areaId = record.areaId ? record.areaId : '';
        dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : {};
        dto.changeReason = (record as TownDataType & { changeReason?: string }).changeReason || undefined;
        return dto;
    }

    async convertToDtoList(records: TownDataType[]): Promise<TownDto[]> {
        const dtoList: TownDto[] = [];

        for (const record of records) {
            const dto: TownDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDataType(dto: TownDto): Promise<TownDataType> {
        const townData: TownDataType = {
            townId: dto.townId,
            areaId: dto.areaId,
            areaName: dto.areaName,
            status: dto.status,
            townName: dto.townName,
            GSI1PK: `TOWN`,
            GSI1SK: dto.townName,
            GSI2PK: `TOWN#${dto.status}`,
            GSI2SK: dto.townName,
            activityLogs: dto.activityLogs,
            forApprovalVersion: dto.forApprovalVersion,
            changeReason: dto.changeReason,
        };
        return townData;
    }
}
