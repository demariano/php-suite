import { CreateCustomerTypeDto, CustomerTypeDto, PageDto, StatusEnum } from '@dto';
import {
    createDynamoDbOptionWithPKSKIndex,
    CustomerSchema,
    CustomerTypeDataType,
    DynamoDbLibService,
    pageRecordHandler,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { CustomerTypeDatabaseServiceAbstract } from './customer-type-database-service-abstract-class';

@Injectable()
export class CustomerTypeDatabaseService implements CustomerTypeDatabaseServiceAbstract {
    protected readonly logger = new Logger(CustomerTypeDatabaseService.name);

    private readonly customerTypeTable: Model<CustomerTypeDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_CUSTOMER_TABLE = configService.get<string>('DYNAMO_DB_CUSTOMER_TABLE');
        if (!DYNAMO_DB_CUSTOMER_TABLE) {
            throw new Error('DYNAMO_DB_CUSTOMER_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.customerTypeTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_CUSTOMER_TABLE, CustomerSchema)
            .getModel('CustomerType');
    }

    async createRecord(customerTypeDto: CreateCustomerTypeDto): Promise<CustomerTypeDto> {
        const customerTypeData: CustomerTypeDataType = {
            status: customerTypeDto.status,
            customerTypeName: customerTypeDto.customerTypeName,
            activityLogs: customerTypeDto.activityLogs,
            forApprovalVersion: customerTypeDto.forApprovalVersion,

            GSI1PK: `CUSTOMER_TYPE`,
            GSI1SK: customerTypeDto.customerTypeName,
            GSI2PK: `CUSTOMER_TYPE#${customerTypeDto.status}`,
            GSI2SK: customerTypeDto.customerTypeName,
        };

        const customerTypeRecord: CustomerTypeDataType = await this.customerTypeTable.create(customerTypeData);

        return await this.convertToDto(customerTypeRecord);
    }

    async updateRecord(record: CustomerTypeDto): Promise<CustomerTypeDto> {
        const customerTypeRecord: CustomerTypeDataType = await this.convertToDataType(record);

        customerTypeRecord.customerTypeName = record.customerTypeName;
        customerTypeRecord.status = record.status;
        customerTypeRecord.GSI1PK = `CUSTOMER_TYPE`;
        customerTypeRecord.GSI1SK = record.customerTypeName;
        customerTypeRecord.GSI2PK = `CUSTOMER_TYPE#${record.status}`;
        customerTypeRecord.GSI2SK = record.customerTypeName;
        customerTypeRecord.forApprovalVersion = record.forApprovalVersion;

        const updatedCustomerTypeRecord: CustomerTypeDataType = await this.customerTypeTable.update(customerTypeRecord);

        return await this.convertToDto(updatedCustomerTypeRecord);
    }

    async findRecordById(id: string): Promise<CustomerTypeDto | null> {
        const record = await this.customerTypeTable.get({
            PK: `CUSTOMER_TYPE`,
            SK: `${id}`,
        });

        if (!record) {
            return null;
        }

        return await this.convertToDto(record);
    }

    async deleteAllRecords(): Promise<void> {
        //get all the records
        const records = await this.customerTypeTable.find(
            {
                GSI1PK: `CUSTOMER_TYPE`,
            },
            {
                index: 'GSI1',
            }
        );

        for (const record of records) {
            await this.customerTypeTable.remove(record);
        }
    }

    async findRecordContainingName(
        limit: number,
        name: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<CustomerTypeDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.customerTypeTable.find(
            {
                GSI1PK: `CUSTOMER_TYPE`,
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

    async findRecordByName(name: string): Promise<CustomerTypeDto | null> {
        const record = await this.customerTypeTable.get(
            {
                GSI1PK: `CUSTOMER_TYPE`,
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

    async getDatabaseRecordById(recordId: string): Promise<CustomerTypeDataType | undefined> {
        const record: CustomerTypeDataType | undefined = await this.customerTypeTable.get({
            PK: 'CUSTOMER_TYPE',
            SK: `${recordId}`,
        });

        this.logger.log(`Customer Type Record returned: ${JSON.stringify(record)}`);

        return record;
    }

    async findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<CustomerTypeDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);

        const records = await this.customerTypeTable.find(
            {
                GSI2PK: `CUSTOMER_TYPE#${status}`,
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
    ): Promise<PageDto<CustomerTypeDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.customerTypeTable.find(
            {
                GSI1PK: `CUSTOMER_TYPE`,
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

    async deleteRecord(dto: CustomerTypeDto): Promise<CustomerTypeDto> {
        const customerTypeRecord: CustomerTypeDataType = await this.convertToDataType(dto);

        await this.customerTypeTable.remove(customerTypeRecord);

        this.logger.log(`Customer Type Record hard deleted: ${JSON.stringify(customerTypeRecord)}`);

        return await this.convertToDto(customerTypeRecord);
    }

    async convertToDto(record: CustomerTypeDataType): Promise<CustomerTypeDto> {
        const dto = new CustomerTypeDto();
        dto.customerTypeId = record.customerTypeId ? record.customerTypeId : '';
        dto.customerTypeName = record.customerTypeName ? record.customerTypeName : '';
        dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : {};
        return dto;
    }

    async convertToDtoList(records: CustomerTypeDataType[]): Promise<CustomerTypeDto[]> {
        const dtoList: CustomerTypeDto[] = [];

        for (const record of records) {
            const dto: CustomerTypeDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDataType(dto: CustomerTypeDto): Promise<CustomerTypeDataType> {
        const customerTypeData: CustomerTypeDataType = {
            customerTypeId: dto.customerTypeId,
            status: dto.status,
            customerTypeName: dto.customerTypeName,
            GSI1PK: `CUSTOMER_TYPE`,
            GSI1SK: dto.customerTypeName,
            GSI2PK: `CUSTOMER_TYPE#${dto.status}`,
            GSI2SK: dto.customerTypeName,
            activityLogs: dto.activityLogs,
            forApprovalVersion: dto.forApprovalVersion,
        };
        return customerTypeData;
    }
}
