import { CreateTerritoryManagerDto, PageDto, StatusEnum, TerritoryManagerDto } from '@dto';
import {
    createDynamoDbOptionWithPKSKIndex,
    DynamoDbLibService,
    InvoicingSchema,
    pageRecordHandler,
    TerritoryManagerDataType,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { TerritoryManagerDatabaseServiceAbstract } from './territory-manager-database-service-abstract-class';

@Injectable()
export class TerritoryManagerDatabaseService implements TerritoryManagerDatabaseServiceAbstract {
    protected readonly logger = new Logger(TerritoryManagerDatabaseService.name);

    private readonly territoryManagerTable: Model<TerritoryManagerDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_INVOICING_TABLE = configService.get<string>('DYNAMO_DB_INVOICING_TABLE');
        if (!DYNAMO_DB_INVOICING_TABLE) {
            throw new Error('DYNAMO_DB_INVOICING_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.territoryManagerTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_INVOICING_TABLE, InvoicingSchema)
            .getModel('TerritoryManager');
    }

    async createRecord(territoryManagerDto: CreateTerritoryManagerDto): Promise<TerritoryManagerDto> {
        const territoryManagerData: TerritoryManagerDataType = {
            status: territoryManagerDto.status,
            territoryManagerName: territoryManagerDto.territoryManagerName,
            contactNo: territoryManagerDto.contactNo,
            activityLogs: territoryManagerDto.activityLogs,
            forApprovalVersion: territoryManagerDto.forApprovalVersion,

            GSI1PK: `TERRITORY_MANAGER`,
            GSI1SK: territoryManagerDto.territoryManagerName,
            GSI2PK: `TERRITORY_MANAGER#${territoryManagerDto.status}`,
            GSI2SK: territoryManagerDto.territoryManagerName,
        };

        const territoryManagerRecord: TerritoryManagerDataType = await this.territoryManagerTable.create(
            territoryManagerData
        );

        return await this.convertToDto(territoryManagerRecord);
    }

    async updateRecord(record: TerritoryManagerDto): Promise<TerritoryManagerDto> {
        const territoryManagerRecord: TerritoryManagerDataType = await this.convertToDataType(record);

        territoryManagerRecord.territoryManagerName = record.territoryManagerName;
        territoryManagerRecord.status = record.status;
        territoryManagerRecord.GSI1PK = `TERRITORY_MANAGER`;
        territoryManagerRecord.GSI1SK = record.territoryManagerName;
        territoryManagerRecord.GSI2PK = `TERRITORY_MANAGER#${record.status}`;
        territoryManagerRecord.GSI2SK = record.territoryManagerName;
        territoryManagerRecord.contactNo = record.contactNo;
        territoryManagerRecord.forApprovalVersion = record.forApprovalVersion;
        territoryManagerRecord.approverMessage = record.approverMessage;
        // CRITICAL: Explicitly set changeReason on the record before calling update()
        // This ensures the field is persisted even if convertToDataType is called separately
        territoryManagerRecord.changeReason = record.changeReason;
        territoryManagerRecord.approverMessage = record.approverMessage;
        const updatedTerritoryManagerRecord: TerritoryManagerDataType = await this.territoryManagerTable.update(
            territoryManagerRecord
        );

        return await this.convertToDto(updatedTerritoryManagerRecord);
    }

    async findRecordById(id: string): Promise<TerritoryManagerDto | null> {
        const record = await this.territoryManagerTable.get({
            PK: `TERRITORY_MANAGER`,
            SK: `${id}`,
        });

        if (!record) {
            return null;
        }

        return await this.convertToDto(record);
    }

    async deleteAllRecords(): Promise<void> {
        //get all the records
        const records = await this.territoryManagerTable.find(
            {
                GSI1PK: `TERRITORY_MANAGER`,
            },
            {
                index: 'GSI1',
            }
        );

        for (const record of records) {
            await this.territoryManagerTable.remove(record);
        }
    }

    async findRecordContainingName(name: string): Promise<TerritoryManagerDto[] | null> {
        const territoryManagerRecords = await this.territoryManagerTable.find(
            {
                GSI1PK: 'TERRITORY_MANAGER',
            },
            {
                where: 'contains(${territoryManagerName}, @{territoryManagerName})',
                substitutions: {
                    territoryManagerName: name,
                },
                index: 'GSI1',
            }
        );

        return await this.convertToDtoList(territoryManagerRecords);
    }

    async findRecordByName(name: string): Promise<TerritoryManagerDto | null> {
        const record = await this.territoryManagerTable.get(
            {
                GSI1PK: `TERRITORY_MANAGER`,
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

    async getDatabaseRecordById(recordId: string): Promise<TerritoryManagerDataType | undefined> {
        const record: TerritoryManagerDataType | undefined = await this.territoryManagerTable.get({
            PK: 'TERRITORY_MANAGER',
            SK: `${recordId}`,
        });

        this.logger.log(`Territory Manager Record returned: ${JSON.stringify(record)}`);

        return record;
    }

    async findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<TerritoryManagerDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);

        const records = await this.territoryManagerTable.find(
            {
                GSI2PK: `TERRITORY_MANAGER#${status}`,
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

    async findRecordsByNamePagination(
        limit: number,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<TerritoryManagerDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.territoryManagerTable.find(
            {
                GSI1PK: `TERRITORY_MANAGER`,
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

    async findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<TerritoryManagerDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.territoryManagerTable.find(
            {
                GSI1PK: `TERRITORY_MANAGER`,
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

    async deleteRecord(dto: TerritoryManagerDto): Promise<TerritoryManagerDto> {
        const territoryManagerRecord: TerritoryManagerDataType = await this.convertToDataType(dto);

        await this.territoryManagerTable.remove(territoryManagerRecord);

        this.logger.log(`Territory Manager Record hard deleted: ${JSON.stringify(territoryManagerRecord)}`);

        return await this.convertToDto(territoryManagerRecord);
    }

    async convertToDto(record: TerritoryManagerDataType): Promise<TerritoryManagerDto> {
        const dto = new TerritoryManagerDto();
        dto.territoryManagerId = record.territoryManagerId ? record.territoryManagerId : '';
        dto.territoryManagerName = record.territoryManagerName ? record.territoryManagerName : '';
        dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;
        dto.contactNo = record.contactNo ? record.contactNo : '';
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : {};
        dto.changeReason = (record as TerritoryManagerDataType & { changeReason?: string }).changeReason || undefined;
        dto.approverMessage = record.approverMessage ? record.approverMessage : undefined;
        return dto;
    }

    async convertToDtoList(records: TerritoryManagerDataType[]): Promise<TerritoryManagerDto[]> {
        const dtoList: TerritoryManagerDto[] = [];

        for (const record of records) {
            const dto: TerritoryManagerDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDataType(dto: TerritoryManagerDto): Promise<TerritoryManagerDataType> {
        const territoryManagerData: TerritoryManagerDataType = {
            territoryManagerId: dto.territoryManagerId,
            status: dto.status,
            territoryManagerName: dto.territoryManagerName,
            contactNo: dto.contactNo,
            GSI1PK: `TERRITORY_MANAGER`,
            GSI1SK: dto.territoryManagerName,
            GSI2PK: `TERRITORY_MANAGER#${dto.status}`,
            GSI2SK: dto.territoryManagerName,
            activityLogs: dto.activityLogs,
            forApprovalVersion: dto.forApprovalVersion,
            changeReason: dto.changeReason,
            approverMessage: dto.approverMessage,
        };
        return territoryManagerData;
    }
}
