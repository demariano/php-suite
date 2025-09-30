import { CreateCustomerClassificationDto, CustomerClassificationDto, PageDto, StatusEnum } from '@dto';
import {
    createDynamoDbOptionWithPKSKIndex,
    CustomerClassificationDataType,
    CustomerSchema,
    DynamoDbLibService,
    pageRecordHandler,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { CustomerClassificationDatabaseServiceAbstract } from './customer-classification-database-service-abstract-class';

@Injectable()
export class CustomerClassificationDatabaseService implements CustomerClassificationDatabaseServiceAbstract {
    protected readonly logger = new Logger(CustomerClassificationDatabaseService.name);

    private readonly customerClassificationTable: Model<CustomerClassificationDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_CUSTOMER_TABLE = configService.get<string>('DYNAMO_DB_CUSTOMER_TABLE');
        if (!DYNAMO_DB_CUSTOMER_TABLE) {
            throw new Error('DYNAMO_DB_CUSTOMER_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.customerClassificationTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_CUSTOMER_TABLE, CustomerSchema)
            .getModel('CustomerClassification');
    }

    async createRecord(customerClassificationDto: CreateCustomerClassificationDto): Promise<CustomerClassificationDto> {
        const customerClassificationData: CustomerClassificationDataType = {
            status: customerClassificationDto.status,
            customerClassificationName: customerClassificationDto.customerClassificationName,
            activityLogs: customerClassificationDto.activityLogs,
            forApprovalVersion: customerClassificationDto.forApprovalVersion,

            GSI1PK: `CUSTOMER_CLASSIFICATION`,
            GSI1SK: customerClassificationDto.customerClassificationName,
            GSI2PK: `CUSTOMER_CLASSIFICATION#${customerClassificationDto.status}`,
            GSI2SK: customerClassificationDto.customerClassificationName,
        };

        const customerClassificationRecord: CustomerClassificationDataType =
            await this.customerClassificationTable.create(customerClassificationData);

        return await this.convertToDto(customerClassificationRecord);
    }

    async updateRecord(record: CustomerClassificationDto): Promise<CustomerClassificationDto> {
        const customerClassificationRecord: CustomerClassificationDataType = await this.convertToDataType(record);

        customerClassificationRecord.customerClassificationName = record.customerClassificationName;
        customerClassificationRecord.status = record.status;
        customerClassificationRecord.GSI1PK = `CUSTOMER_CLASSIFICATION`;
        customerClassificationRecord.GSI1SK = record.customerClassificationName;
        customerClassificationRecord.GSI2PK = `CUSTOMER_CLASSIFICATION#${record.status}`;
        customerClassificationRecord.GSI2SK = record.customerClassificationName;
        customerClassificationRecord.forApprovalVersion = record.forApprovalVersion;

        const updatedCustomerClassificationRecord: CustomerClassificationDataType =
            await this.customerClassificationTable.update(customerClassificationRecord);

        return await this.convertToDto(updatedCustomerClassificationRecord);
    }

    async findRecordById(id: string): Promise<CustomerClassificationDto | null> {
        const record = await this.customerClassificationTable.get({
            PK: `CUSTOMER_CLASSIFICATION`,
            SK: `${id}`,
        });

        if (!record) {
            return null;
        }

        return await this.convertToDto(record);
    }

    async findRecordContainingName(name: string): Promise<CustomerClassificationDto[] | null> {
        const customerClassificationRecords = await this.customerClassificationTable.find(
            {
                GSI1PK: 'CUSTOMER_CLASSIFICATION',
            },
            {
                where: 'contains(${customerClassificationName}, @{customerClassificationName})',
                substitutions: {
                    customerClassificationName: name,
                },
                index: 'GSI1',
            }
        );

        return await this.convertToDtoList(customerClassificationRecords);
    }

    async deleteAllRecords(): Promise<void> {
        const customerClassificationRecords = await this.customerClassificationTable.find(
            {
                GSI1PK: 'CUSTOMER_CLASSIFICATION',
            },
            {
                index: 'GSI1',
            }
        );

        for (const record of customerClassificationRecords) {
            await this.customerClassificationTable.remove(record);
        }
    }

    async findRecordByName(name: string): Promise<CustomerClassificationDto | null> {
        const record = await this.customerClassificationTable.get(
            {
                GSI1PK: `CUSTOMER_CLASSIFICATION`,
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

    async getDatabaseRecordById(recordId: string): Promise<CustomerClassificationDataType | undefined> {
        const record: CustomerClassificationDataType | undefined = await this.customerClassificationTable.get({
            PK: 'CUSTOMER_CLASSIFICATION',
            SK: `${recordId}`,
        });

        this.logger.log(`Customer Classification Record returned: ${JSON.stringify(record)}`);

        return record;
    }

    async findRecordsPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<CustomerClassificationDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);

        const records = await this.customerClassificationTable.find(
            {
                GSI2PK: `CUSTOMER_CLASSIFICATION#${status}`,
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

    async deleteRecord(dto: CustomerClassificationDto): Promise<CustomerClassificationDto> {
        const customerClassificationRecord: CustomerClassificationDataType = await this.convertToDataType(dto);

        await this.customerClassificationTable.remove(customerClassificationRecord);

        this.logger.log(`Customer Classification Record hard deleted: ${JSON.stringify(customerClassificationRecord)}`);

        return await this.convertToDto(customerClassificationRecord);
    }

    async convertToDto(record: CustomerClassificationDataType): Promise<CustomerClassificationDto> {
        const dto = new CustomerClassificationDto();
        dto.customerClassificationId = record.customerClassificationId ? record.customerClassificationId : '';
        dto.customerClassificationName = record.customerClassificationName ? record.customerClassificationName : '';
        dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : {};
        return dto;
    }

    async convertToDtoList(records: CustomerClassificationDataType[]): Promise<CustomerClassificationDto[]> {
        const dtoList: CustomerClassificationDto[] = [];

        for (const record of records) {
            const dto: CustomerClassificationDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDataType(dto: CustomerClassificationDto): Promise<CustomerClassificationDataType> {
        const customerClassificationData: CustomerClassificationDataType = {
            customerClassificationId: dto.customerClassificationId,
            status: dto.status,
            customerClassificationName: dto.customerClassificationName,
            GSI1PK: `CUSTOMER_CLASSIFICATION`,
            GSI1SK: dto.customerClassificationName,
            GSI2PK: `CUSTOMER_CLASSIFICATION#${dto.status}`,
            GSI2SK: dto.customerClassificationName,
            activityLogs: dto.activityLogs,
            forApprovalVersion: dto.forApprovalVersion,
        };
        return customerClassificationData;
    }
}
