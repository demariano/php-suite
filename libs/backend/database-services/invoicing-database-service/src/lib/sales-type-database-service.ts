import { CreateSalesTypeDto, PageDto, SalesTypeDto, StatusEnum } from '@dto';
import {
    createDynamoDbOptionWithPKSKIndex,
    DynamoDbLibService,
    InvoicingSchema,
    pageRecordHandler,
    SalesTypeDataType,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { SalesTypeDatabaseServiceAbstract } from './sales-type-database-service-abstract-class';

@Injectable()
export class SalesTypeDatabaseService implements SalesTypeDatabaseServiceAbstract {
    protected readonly logger = new Logger(SalesTypeDatabaseService.name);

    private readonly salesTypeTable: Model<SalesTypeDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_INVOICING_TABLE = configService.get<string>('DYNAMO_DB_INVOICING_TABLE');
        if (!DYNAMO_DB_INVOICING_TABLE) {
            throw new Error('DYNAMO_DB_INVOICING_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.salesTypeTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_INVOICING_TABLE, InvoicingSchema)
            .getModel('SalesType');
    }

    async createRecord(salesTypeDto: CreateSalesTypeDto): Promise<SalesTypeDto> {
        const salesTypeData: SalesTypeDataType = {
            status: salesTypeDto.status,
            salesTypeName: salesTypeDto.salesTypeName,
            allowDiscount: salesTypeDto.allowDiscount,
            contractSales: salesTypeDto.contractSales,
            defaultDiscount: salesTypeDto.defaultDiscount,
            defaultTax: salesTypeDto.defaultTax,
            incomeGenerating: salesTypeDto.incomeGenerating,
            taxable: salesTypeDto.taxable,
            activityLogs: salesTypeDto.activityLogs,
            forApprovalVersion: salesTypeDto.forApprovalVersion,

            GSI1PK: `SALES_TYPE`,
            GSI1SK: salesTypeDto.salesTypeName,
            GSI2PK: `SALES_TYPE#${salesTypeDto.status}`,
            GSI2SK: salesTypeDto.salesTypeName,
        };

        const salesTypeRecord: SalesTypeDataType = await this.salesTypeTable.create(salesTypeData);

        return await this.convertToDto(salesTypeRecord);
    }

    async updateRecord(record: SalesTypeDto): Promise<SalesTypeDto> {
        const salesTypeRecord: SalesTypeDataType = await this.convertToDataType(record);

        salesTypeRecord.salesTypeName = record.salesTypeName;
        salesTypeRecord.status = record.status;
        salesTypeRecord.GSI1PK = `SALES_TYPE`;
        salesTypeRecord.GSI1SK = record.salesTypeName;
        salesTypeRecord.GSI2PK = `SALES_TYPE#${record.status}`;
        salesTypeRecord.GSI2SK = record.salesTypeName;
        salesTypeRecord.allowDiscount = record.allowDiscount;
        salesTypeRecord.contractSales = record.contractSales;
        salesTypeRecord.defaultDiscount = record.defaultDiscount;
        salesTypeRecord.defaultTax = record.defaultTax;
        salesTypeRecord.incomeGenerating = record.incomeGenerating;
        salesTypeRecord.taxable = record.taxable;
        salesTypeRecord.forApprovalVersion = record.forApprovalVersion;

        const updatedSalesTypeRecord: SalesTypeDataType = await this.salesTypeTable.update(salesTypeRecord);

        return await this.convertToDto(updatedSalesTypeRecord);
    }

    async findRecordById(id: string): Promise<SalesTypeDto | null> {
        const record = await this.salesTypeTable.get({
            PK: `SALES_TYPE`,
            SK: `${id}`,
        });

        if (!record) {
            return null;
        }

        return await this.convertToDto(record);
    }

    async deleteAllRecords(): Promise<void> {
        //get all the records
        const records = await this.salesTypeTable.find(
            {
                GSI1PK: `SALES_TYPE`,
            },
            {
                index: 'GSI1',
            }
        );

        for (const record of records) {
            await this.salesTypeTable.remove(record);
        }
    }

    async findRecordContainingName(
        limit: number,
        name: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<SalesTypeDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.salesTypeTable.find(
            {
                GSI1PK: `SALES_TYPE`,
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

    async findRecordByName(name: string): Promise<SalesTypeDto | null> {
        const record = await this.salesTypeTable.get(
            {
                GSI1PK: `SALES_TYPE`,
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

    async getDatabaseRecordById(recordId: string): Promise<SalesTypeDataType | undefined> {
        const record: SalesTypeDataType | undefined = await this.salesTypeTable.get({
            PK: 'SALES_TYPE',
            SK: `${recordId}`,
        });

        this.logger.log(`Sales Type Record returned: ${JSON.stringify(record)}`);

        return record;
    }

    async findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<SalesTypeDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);

        const records = await this.salesTypeTable.find(
            {
                GSI2PK: `SALES_TYPE#${status}`,
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
    ): Promise<PageDto<SalesTypeDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.salesTypeTable.find(
            {
                GSI1PK: `SALES_TYPE`,
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

    async deleteRecord(dto: SalesTypeDto): Promise<SalesTypeDto> {
        const salesTypeRecord: SalesTypeDataType = await this.convertToDataType(dto);

        await this.salesTypeTable.remove(salesTypeRecord);

        this.logger.log(`Sales Type Record hard deleted: ${JSON.stringify(salesTypeRecord)}`);

        return await this.convertToDto(salesTypeRecord);
    }

    async convertToDto(record: SalesTypeDataType): Promise<SalesTypeDto> {
        const dto = new SalesTypeDto();
        dto.salesTypeId = record.salesTypeId ? record.salesTypeId : '';
        dto.salesTypeName = record.salesTypeName ? record.salesTypeName : '';
        dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;
        dto.allowDiscount = record.allowDiscount ? record.allowDiscount : false;
        dto.contractSales = record.contractSales ? record.contractSales : false;
        dto.defaultDiscount = record.defaultDiscount ? record.defaultDiscount : 0;
        dto.defaultTax = record.defaultTax ? record.defaultTax : 0;
        dto.incomeGenerating = record.incomeGenerating ? record.incomeGenerating : false;
        dto.taxable = record.taxable ? record.taxable : false;
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : {};
        return dto;
    }

    async convertToDtoList(records: SalesTypeDataType[]): Promise<SalesTypeDto[]> {
        const dtoList: SalesTypeDto[] = [];

        for (const record of records) {
            const dto: SalesTypeDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDataType(dto: SalesTypeDto): Promise<SalesTypeDataType> {
        const salesTypeData: SalesTypeDataType = {
            salesTypeId: dto.salesTypeId,
            status: dto.status,
            salesTypeName: dto.salesTypeName,
            allowDiscount: dto.allowDiscount,
            contractSales: dto.contractSales,
            defaultDiscount: dto.defaultDiscount,
            defaultTax: dto.defaultTax,
            incomeGenerating: dto.incomeGenerating,
            taxable: dto.taxable,
            GSI1PK: `SALES_TYPE`,
            GSI1SK: dto.salesTypeName,
            GSI2PK: `SALES_TYPE#${dto.status}`,
            GSI2SK: dto.salesTypeName,
            activityLogs: dto.activityLogs,
            forApprovalVersion: dto.forApprovalVersion,
        };
        return salesTypeData;
    }
}
