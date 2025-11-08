import { CreateCustomerDto, CustomerDto, CustomerFilterDto, PageDto, StatusEnum } from '@dto';
import {
    createDynamoDbOptionWithPKSKIndex,
    CustomerDataType,
    CustomerSchema,
    DynamoDbLibService,
    pageRecordHandler,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { CustomerDatabaseServiceAbstract } from './customer-database-service-abstract-class';

@Injectable()
export class CustomerDatabaseService implements CustomerDatabaseServiceAbstract {
    protected readonly logger = new Logger(CustomerDatabaseService.name);

    private readonly customerTable: Model<CustomerDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_CUSTOMER_TABLE = configService.get<string>('DYNAMO_DB_CUSTOMER_TABLE');
        if (!DYNAMO_DB_CUSTOMER_TABLE) {
            throw new Error('DYNAMO_DB_CUSTOMER_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.customerTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_CUSTOMER_TABLE, CustomerSchema)
            .getModel('Customer');
    }

    async createRecord(customerDto: CreateCustomerDto): Promise<CustomerDto> {
        const customerData: CustomerDataType = {
            status: customerDto.status,
            customerName: customerDto.customerName,
            email: customerDto.email,
            address1: customerDto.address1,
            address2: customerDto.address2,
            balance: customerDto.balance,
            contactNo: customerDto.contactNo,
            contactPerson: customerDto.contactPerson,
            townId: customerDto.townId,
            townName: customerDto.townName,
            creditLimit: customerDto.creditLimit,
            customerCredit: customerDto.customerCredit,
            tinNumber: customerDto.tinNumber,
            areaId: customerDto.areaId,
            areaName: customerDto.areaName,
            customerClassificationId: customerDto.customerClassificationId,
            customerClassificationName: customerDto.customerClassificationName,
            customerTypeId: customerDto.customerTypeId,
            customerTypeName: customerDto.customerTypeName,
            forApprovalVersion: customerDto.forApprovalVersion,
            changeReason: customerDto.changeReason,
            activityLogs: customerDto.activityLogs,
            customerTerms: customerDto.customerTerms,
            customerProductDeals: customerDto.customerProductDeals,
            GSI1PK: `CUSTOMER`,
            GSI1SK: customerDto.customerName,
            GSI2PK: `CUSTOMER#${customerDto.status}`,
            GSI2SK: customerDto.customerName,
            GSI3PK: `CUSTOMER#${customerDto.customerClassificationId}`,
            GSI3SK: customerDto.customerName,
            GSI4PK: `CUSTOMER#${customerDto.customerTypeId}`,
            GSI4SK: customerDto.customerName,
            GSI5PK: `CUSTOMER#${customerDto.areaId}`,
            GSI5SK: customerDto.customerName,
            GSI6PK: `CUSTOMER#${customerDto.townId}`,
            GSI6SK: customerDto.customerName,
        };

        const customerRecord: CustomerDataType = await this.customerTable.create(customerData);

        return await this.convertToDto(customerRecord);
    }

    async updateRecord(record: CustomerDto): Promise<CustomerDto> {
        const customerRecord: CustomerDataType = await this.convertToDataType(record);

        const updatedCustomerRecord: CustomerDataType = await this.customerTable.update(customerRecord);

        return await this.convertToDto(updatedCustomerRecord);
    }

    async findRecordById(id: string): Promise<CustomerDto | null> {
        const record = await this.customerTable.get({
            PK: `CUSTOMER`,
            SK: `${id}`,
        });

        if (!record) {
            return null;
        }

        return await this.convertToDto(record);
    }

    async findRecordContainingName(name: string): Promise<CustomerDto[] | null> {
        const customerRecords = await this.customerTable.find(
            {
                GSI1PK: 'CUSTOMER',
            },
            {
                where: 'contains(${customerName}, @{customerName})',
                substitutions: {
                    customerName: name,
                },
                index: 'GSI1',
            }
        );

        return await this.convertToDtoList(customerRecords);
    }

    async findRecordByName(name: string): Promise<CustomerDto | null> {
        const record = await this.customerTable.get(
            {
                GSI1PK: `CUSTOMER`,
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

    async deleteAllRecords(): Promise<void> {
        //get all the records
        const records = await this.customerTable.find(
            {
                GSI1PK: `CUSTOMER`,
            },
            {
                index: 'GSI1',
            }
        );

        for (const record of records) {
            await this.customerTable.remove(record);
        }
    }

    async findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<CustomerDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);

        const records = await this.customerTable.find(
            {
                GSI2PK: `CUSTOMER#${status}`,
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
    ): Promise<PageDto<CustomerDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.customerTable.find(
            {
                GSI1PK: `CUSTOMER`,
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
    ): Promise<PageDto<CustomerDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.customerTable.find(
            {
                GSI1PK: `CUSTOMER`,
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

    async findCustomerRecordsByFilterPagination(
        filter: CustomerFilterDto,
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<CustomerDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const whereClause = [
            filter.status ? 'contains(${status}, @{status})' : null,
            filter.customerClassificationId && filter.customerClassificationId.length > 0
                ? '(${customerClassificationId} IN (@{...customerClassificationIds}))'
                : null,
            filter.customerTypeId && filter.customerTypeId.length > 0
                ? '(${customerTypeId} IN (@{...customerTypes}))'
                : null,
            filter.areaId && filter.areaId.length > 0 ? '(${areaId} IN (@{...areaIds}))' : null,
            filter.townId && filter.townId.length > 0 ? '(${townId} IN (@{...townIds}))' : null,
        ]
            .filter(Boolean)
            .join(' and ');

        const substitutions = {
            ...(filter.status && { status: filter.status.toLocaleLowerCase() }),
            ...(filter.customerClassificationId &&
                filter.customerClassificationId.length > 0 && {
                    customerClassificationIds: filter.customerClassificationId,
                }),
            ...(filter.customerTypeId && filter.customerTypeId.length > 0 && { customerTypes: filter.customerTypeId }),
            ...(filter.areaId && filter.areaId.length > 0 && { areaIds: filter.areaId }),
            ...(filter.townId && filter.townId.length > 0 && { townIds: filter.townId }),
        };

        //check if filter.fields not undefined but not an array , convert it to an array
        if (filter.fields && !Array.isArray(filter.fields)) {
            filter.fields = [filter.fields];
        }

        //check filter.fields , if it does not include customerId , then add it to the fields
        if (!filter.fields?.includes('customerId')) {
            filter.fields?.push('customerId');
        }

        const customerRecords = await this.customerTable.find(
            {
                GSI1PK: 'CUSTOMER',
            },
            {
                fields: filter.fields ? filter.fields : undefined,
                where: whereClause || undefined,
                substitutions: Object.keys(substitutions).length > 0 ? substitutions : undefined,
                reverse: filter.reverse,
                ...dynamoDbOption,
            }
        );

        const pageRecordCursorPointers = pageRecordHandler(
            customerRecords,
            limit,
            direction,
            'GSI1PK',
            'GSI1SK',
            'PK',
            'SK',
            JSON.stringify(customerRecords.next),
            JSON.stringify(customerRecords.prev)
        );

        return new PageDto(
            await this.convertToDtoList(customerRecords),
            pageRecordCursorPointers.nextCursorPointer,
            pageRecordCursorPointers.prevCursorPointer
        );
    }

    async findAllCustomersByClassificationId(customerClassificationId: string): Promise<CustomerDto[]> {
        const customerRecords = await this.customerTable.find(
            {
                GSI3PK: `CUSTOMER#${customerClassificationId}`,
            },
            {
                index: 'GSI3',
            }
        );

        return await this.convertToDtoList(customerRecords);
    }

    async findAllCustomersByTypeId(customerTypeId: string): Promise<CustomerDto[]> {
        const customerRecords = await this.customerTable.find(
            {
                GSI4PK: `CUSTOMER#${customerTypeId}`,
            },
            {
                index: 'GSI4',
            }
        );

        return await this.convertToDtoList(customerRecords);
    }

    async findAllCustomersByAreaId(areaId: string): Promise<CustomerDto[]> {
        const customerRecords = await this.customerTable.find(
            {
                GSI5PK: `CUSTOMER#${areaId}`,
            },
            {
                index: 'GSI5',
            }
        );

        return await this.convertToDtoList(customerRecords);
    }

    async findAllCustomersByTownId(townId: string): Promise<CustomerDto[]> {
        const customerRecords = await this.customerTable.find(
            {
                GSI6PK: `CUSTOMER#${townId}`,
            },
            {
                index: 'GSI6',
            }
        );

        return await this.convertToDtoList(customerRecords);
    }

    async deleteRecord(dto: CustomerDto): Promise<CustomerDto> {
        const customerRecord: CustomerDataType = await this.convertToDataType(dto);

        await this.customerTable.remove(customerRecord);

        this.logger.log(`Customer Record hard deleted: ${JSON.stringify(customerRecord)}`);

        return await this.convertToDto(customerRecord);
    }

    async convertToDto(record: CustomerDataType): Promise<CustomerDto> {
        const dto = new CustomerDto();
        dto.customerId = record.customerId ? record.customerId : '';
        dto.customerName = record.customerName ? record.customerName : '';
        dto.email = record.email ? record.email : '';
        dto.address1 = record.address1 ? record.address1 : '';
        dto.address2 = record.address2 ? record.address2 : '';
        dto.balance = record.balance ? record.balance : 0;
        dto.contactNo = record.contactNo ? record.contactNo : '';
        dto.contactPerson = record.contactPerson ? record.contactPerson : '';
        dto.townId = record.townId ? record.townId : '';
        dto.townName = record.townName ? record.townName : '';
        dto.creditLimit = record.creditLimit ? record.creditLimit : 0;
        dto.customerCredit = record.customerCredit ? record.customerCredit : 0;
        dto.tinNumber = record.tinNumber ? record.tinNumber : '';
        dto.areaId = record.areaId ? record.areaId : '';
        dto.areaName = record.areaName ? record.areaName : '';
        dto.customerClassificationId = record.customerClassificationId ? record.customerClassificationId : '';
        dto.customerClassificationName = record.customerClassificationName ? record.customerClassificationName : '';
        dto.customerTypeId = record.customerTypeId ? record.customerTypeId : '';
        dto.customerTypeName = record.customerTypeName ? record.customerTypeName : '';
        dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;
        dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : {};
        dto.changeReason = record.changeReason ? record.changeReason : '';
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        dto.customerTerms = record.customerTerms ? record.customerTerms : [];
        dto.customerProductDeals = record.customerProductDeals ? record.customerProductDeals : [];
        return dto;
    }

    async convertToDtoList(records: CustomerDataType[]): Promise<CustomerDto[]> {
        const dtoList: CustomerDto[] = [];

        for (const record of records) {
            const dto: CustomerDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDataType(dto: CustomerDto): Promise<CustomerDataType> {
        const customerData: CustomerDataType = {
            customerId: dto.customerId,
            status: dto.status,
            customerName: dto.customerName,
            email: dto.email,
            address1: dto.address1,
            address2: dto.address2,
            balance: dto.balance,
            contactNo: dto.contactNo,
            contactPerson: dto.contactPerson,
            townId: dto.townId,
            townName: dto.townName,
            creditLimit: dto.creditLimit,
            customerCredit: dto.customerCredit,
            tinNumber: dto.tinNumber,
            areaId: dto.areaId,
            areaName: dto.areaName,
            customerClassificationId: dto.customerClassificationId,
            customerClassificationName: dto.customerClassificationName,
            customerTypeId: dto.customerTypeId,
            customerTypeName: dto.customerTypeName,
            forApprovalVersion: dto.forApprovalVersion,
            changeReason: dto.changeReason,
            activityLogs: dto.activityLogs,
            customerTerms: dto.customerTerms,
            customerProductDeals: dto.customerProductDeals,
            GSI1PK: `CUSTOMER`,
            GSI1SK: dto.customerName,
            GSI2PK: `CUSTOMER#${dto.status}`,
            GSI2SK: dto.customerName,
            GSI3PK: `CUSTOMER#${dto.customerClassificationId}`,
            GSI3SK: dto.customerName,
            GSI4PK: `CUSTOMER#${dto.customerTypeId}`,
            GSI4SK: dto.customerName,
            GSI5PK: `CUSTOMER#${dto.areaId}`,
            GSI5SK: dto.customerName,
            GSI6PK: `CUSTOMER#${dto.townId}`,
            GSI6SK: dto.customerName,
        };
        return customerData;
    }
}
