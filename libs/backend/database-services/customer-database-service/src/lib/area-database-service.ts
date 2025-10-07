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
            GSI1PK: `AREA`,
            GSI1SK: areaDto.areaName,
            GSI2PK: `AREA#${areaDto.status}`,
            GSI2SK: areaDto.areaName,
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
        areaRecord.forApprovalVersion = record.forApprovalVersion;

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

        console.log('Records:', records);

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

    async convertToDataType(dto: AreaDto): Promise<AreaDataType> {
        const areaData: AreaDataType = {
            areaId: dto.areaId,
            status: dto.status,
            areaName: dto.areaName,
            GSI1PK: `AREA`,
            GSI1SK: dto.areaName,
            GSI2PK: `AREA#${dto.status}`,
            GSI2SK: dto.areaName,
            activityLogs: dto.activityLogs,
            forApprovalVersion: dto.forApprovalVersion,
        };
        return areaData;
    }
}
