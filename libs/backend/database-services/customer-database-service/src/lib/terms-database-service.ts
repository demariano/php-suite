import { CreateTermsDto, PageDto, StatusEnum, TermsDto } from '@dto';
import {
    createDynamoDbOptionWithPKSKIndex,
    CustomerSchema,
    DynamoDbLibService,
    pageRecordHandler,
    TermsDataType,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { TermsDatabaseServiceAbstract } from './terms-database-service-abstract-class';

@Injectable()
export class TermsDatabaseService implements TermsDatabaseServiceAbstract {
    protected readonly logger = new Logger(TermsDatabaseService.name);

    private readonly termsTable: Model<TermsDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_CUSTOMER_TABLE = configService.get<string>('DYNAMO_DB_CUSTOMER_TABLE');
        if (!DYNAMO_DB_CUSTOMER_TABLE) {
            throw new Error('DYNAMO_DB_CUSTOMER_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.termsTable = dynamoDbService.dynamoDbMainTable(DYNAMO_DB_CUSTOMER_TABLE, CustomerSchema).getModel('Terms');
    }

    async createRecord(termsDto: CreateTermsDto): Promise<TermsDto> {
        const termsData: TermsDataType = {
            status: termsDto.status,
            termsName: termsDto.termsName,
            activityLogs: termsDto.activityLogs,
            days: termsDto.days,
            forApprovalVersion: termsDto.forApprovalVersion,

            GSI1PK: `TERMS`,
            GSI1SK: termsDto.termsName,
            GSI2PK: `TERMS#${termsDto.status}`,
            GSI2SK: termsDto.termsName,
        };

        const termsRecord: TermsDataType = await this.termsTable.create(termsData);

        return await this.convertToDto(termsRecord);
    }

    async updateRecord(record: TermsDto): Promise<TermsDto> {
        const termsRecord: TermsDataType = await this.convertToDataType(record);

        termsRecord.termsName = record.termsName;
        termsRecord.status = record.status;
        termsRecord.days = record.days;
        termsRecord.GSI1PK = `TERMS`;
        termsRecord.GSI1SK = record.termsName;
        termsRecord.GSI2PK = `TERMS#${record.status}`;
        termsRecord.GSI2SK = record.termsName;
        termsRecord.forApprovalVersion = record.forApprovalVersion;
        termsRecord.changeReason = record.changeReason;

        const updatedTermsRecord: TermsDataType = await this.termsTable.update(termsRecord);

        return await this.convertToDto(updatedTermsRecord);
    }

    async findRecordById(id: string): Promise<TermsDto | null> {
        const record = await this.termsTable.get({
            PK: `TERMS`,
            SK: `${id}`,
        });

        if (!record) {
            return null;
        }

        return await this.convertToDto(record);
    }

    async deleteAllRecords(): Promise<void> {
        //get all the records
        const records = await this.termsTable.find(
            {
                GSI1PK: `TERMS`,
            },
            {
                index: 'GSI1',
            }
        );

        for (const record of records) {
            await this.termsTable.remove(record);
        }
    }

    async findRecordsByNamePagination(
        limit: number,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<TermsDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.termsTable.find(
            {
                GSI1PK: `TERMS`,
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

    async findRecordByName(name: string): Promise<TermsDto | null> {
        const record = await this.termsTable.get(
            {
                GSI1PK: `TERMS`,
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

    async getDatabaseRecordById(recordId: string): Promise<TermsDataType | undefined> {
        const record: TermsDataType | undefined = await this.termsTable.get({
            PK: 'TERMS',
            SK: `${recordId}`,
        });

        this.logger.log(`Terms Record returned: ${JSON.stringify(record)}`);

        return record;
    }

    async findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<TermsDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);

        const records = await this.termsTable.find(
            {
                GSI2PK: `TERMS#${status}`,
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

    async findRecordsByPagination(limit: number, direction: string, cursorPointer: string): Promise<PageDto<TermsDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.termsTable.find(
            {
                GSI1PK: `TERMS`,
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

    async deleteRecord(dto: TermsDto): Promise<TermsDto> {
        const termsRecord: TermsDataType = await this.convertToDataType(dto);

        await this.termsTable.remove(termsRecord);

        this.logger.log(`Terms Record hard deleted: ${JSON.stringify(termsRecord)}`);

        return await this.convertToDto(termsRecord);
    }

    async convertToDto(record: TermsDataType): Promise<TermsDto> {
        const dto = new TermsDto();
        dto.termsId = record.termsId ? record.termsId : '';
        dto.termsName = record.termsName ? record.termsName : '';
        dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        dto.days = record.days ? record.days : 0;
        dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : {};
        dto.changeReason = (record as TermsDataType & { changeReason?: string }).changeReason || undefined;
        return dto;
    }

    async convertToDtoList(records: TermsDataType[]): Promise<TermsDto[]> {
        const dtoList: TermsDto[] = [];

        for (const record of records) {
            const dto: TermsDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDataType(dto: TermsDto): Promise<TermsDataType> {
        const termsData: TermsDataType = {
            termsId: dto.termsId,
            status: dto.status,
            termsName: dto.termsName,
            days: dto.days,
            GSI1PK: `TERMS`,
            GSI1SK: dto.termsName,
            GSI2PK: `TERMS#${dto.status}`,
            GSI2SK: dto.termsName,
            activityLogs: dto.activityLogs,
            forApprovalVersion: dto.forApprovalVersion,
            changeReason: dto.changeReason,
        };
        return termsData;
    }
}
