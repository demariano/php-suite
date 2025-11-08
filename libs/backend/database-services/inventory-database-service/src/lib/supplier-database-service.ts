import { CreateSupplierDto, PageDto, StatusEnum, SupplierDto, SupplierFilterDto } from '@dto';
import {
    createDynamoDbOptionWithPKSKIndex,
    DynamoDbLibService,
    InventorySchema,
    pageRecordHandler,
    SupplierDataType,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { SupplierDatabaseServiceAbstract } from './supplier-database-service-abstract-class';

@Injectable()
export class SupplierDatabaseService implements SupplierDatabaseServiceAbstract {
    protected readonly logger = new Logger(SupplierDatabaseService.name);

    private readonly supplierTable: Model<SupplierDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_INVENTORY_TABLE = configService.get<string>('DYNAMO_DB_INVENTORY_TABLE');
        if (!DYNAMO_DB_INVENTORY_TABLE) {
            throw new Error('DYNAMO_DB_INVENTORY_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.supplierTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_INVENTORY_TABLE, InventorySchema)
            .getModel('Supplier');
    }

    async createRecord(supplierDto: CreateSupplierDto): Promise<SupplierDto> {
        const supplierData: SupplierDataType = {
            status: supplierDto.status,
            supplierName: supplierDto.supplierName,
            supplierAddress: supplierDto.supplierAddress,
            supplierPhone: supplierDto.supplierPhone,
            supplierEmail: supplierDto.supplierEmail,
            supplierContactPerson: supplierDto.supplierContactPerson,
            activityLogs: supplierDto.activityLogs,
            forApprovalVersion: supplierDto.forApprovalVersion,
            changeReason: supplierDto.changeReason,
            GSI1PK: `SUPPLIER`,
            GSI1SK: supplierDto.supplierName,
            GSI2PK: `SUPPLIER#${supplierDto.status}`,
            GSI2SK: supplierDto.supplierName,
        };

        const supplierRecord: SupplierDataType = await this.supplierTable.create(supplierData);

        return await this.convertToDto(supplierRecord);
    }

    async updateRecord(record: SupplierDto): Promise<SupplierDto> {
        const supplierRecord: SupplierDataType = await this.convertToDataType(record);

        supplierRecord.supplierName = record.supplierName;
        supplierRecord.supplierAddress = record.supplierAddress;
        supplierRecord.supplierPhone = record.supplierPhone;
        supplierRecord.supplierEmail = record.supplierEmail;
        supplierRecord.supplierContactPerson = record.supplierContactPerson;
        supplierRecord.status = record.status;
        supplierRecord.GSI1PK = `SUPPLIER`;
        supplierRecord.GSI1SK = record.supplierName;
        supplierRecord.GSI2PK = `SUPPLIER#${record.status}`;
        supplierRecord.GSI2SK = record.supplierName;
        supplierRecord.forApprovalVersion = record.forApprovalVersion;
        supplierRecord.changeReason = record.changeReason;

        const updatedSupplierRecord: SupplierDataType = await this.supplierTable.update(supplierRecord);

        return await this.convertToDto(updatedSupplierRecord);
    }

    async findRecordById(id: string): Promise<SupplierDto | null> {
        const record = await this.supplierTable.get({
            PK: `SUPPLIER`,
            SK: `${id}`,
        });

        if (!record) {
            return null;
        }

        return await this.convertToDto(record);
    }

    async findRecordContainingName(name: string): Promise<SupplierDto[] | null> {
        const supplierRecords = await this.supplierTable.find(
            {
                GSI1PK: 'SUPPLIER',
            },
            {
                where: 'contains(${supplierName}, @{supplierName})',
                substitutions: {
                    supplierName: name,
                },
                index: 'GSI1',
            }
        );

        return await this.convertToDtoList(supplierRecords);
    }

    async getDatabaseRecordById(recordId: string): Promise<SupplierDataType | undefined> {
        const record: SupplierDataType | undefined = await this.supplierTable.get({
            PK: 'SUPPLIER',
            SK: `${recordId}`,
        });

        this.logger.log(`Supplier Record returned: ${JSON.stringify(record)}`);

        return record;
    }

    async findRecordsPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<SupplierDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);

        const records = await this.supplierTable.find(
            {
                GSI2PK: `SUPPLIER#${status}`,
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
    ): Promise<PageDto<SupplierDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.supplierTable.find(
            {
                GSI1PK: `SUPPLIER`,
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

    async findSupplierRecordsByStatusAndName(status: string, name: string): Promise<SupplierDto[]> {
        const supplierRecords = await this.supplierTable.find(
            {
                GSI2PK: `SUPPLIER#${status}`,
                GSI2SK: name,
            },
            {
                index: 'GSI2',
            }
        );

        return await this.convertToDtoList(supplierRecords);
    }

    async deleteRecord(dto: SupplierDto): Promise<SupplierDto> {
        const supplierRecord: SupplierDataType = await this.convertToDataType(dto);

        await this.supplierTable.remove(supplierRecord);

        this.logger.log(`Supplier Record hard deleted: ${JSON.stringify(supplierRecord)}`);

        return await this.convertToDto(supplierRecord);
    }

    async deleteAllRecords(): Promise<void> {
        // Get all the records
        const records = await this.supplierTable.find(
            {
                GSI1PK: `SUPPLIER`,
            },
            {
                index: 'GSI1',
            }
        );

        // Delete each record
        for (const record of records) {
            await this.supplierTable.remove(record);
            this.logger.log(`Supplier Record deleted: ${JSON.stringify(record)}`);
        }
    }

    async findSupplierRecordsByFilterPagination(
        filter: SupplierFilterDto,
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<SupplierDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const whereClause = [
            filter.status ? '(${status} = @{status})' : null,
            filter.supplierName && filter.supplierName.length > 0 ? 'contains(${supplierName}, @{supplierName})' : null,
            filter.supplierAddress && filter.supplierAddress.length > 0
                ? 'contains(${supplierAddress}, @{supplierAddress})'
                : null,
            filter.supplierPhone && filter.supplierPhone.length > 0
                ? 'contains(${supplierPhone}, @{supplierPhone})'
                : null,
            filter.supplierEmail && filter.supplierEmail.length > 0
                ? 'contains(${supplierEmail}, @{supplierEmail})'
                : null,
            filter.supplierContactPerson && filter.supplierContactPerson.length > 0
                ? 'contains(${supplierContactPerson}, @{supplierContactPerson})'
                : null,
        ]
            .filter(Boolean)
            .join(' and ');

        const substitutions = {
            ...(filter.status && { status: filter.status }),
            ...(filter.supplierName && { supplierName: filter.supplierName }),
            ...(filter.supplierAddress && { supplierAddress: filter.supplierAddress }),
            ...(filter.supplierPhone && { supplierPhone: filter.supplierPhone }),
            ...(filter.supplierEmail && { supplierEmail: filter.supplierEmail }),
            ...(filter.supplierContactPerson && { supplierContactPerson: filter.supplierContactPerson }),
        };

        //check if filter.fields not undefined but not an array , convert it to an array
        if (filter.fields && !Array.isArray(filter.fields)) {
            filter.fields = [filter.fields];
        }

        //check filter.fields , if it does not include supplierId , then add it to the fields
        if (!filter.fields?.includes('supplierId')) {
            filter.fields?.push('supplierId');
        }

        const supplierRecords = await this.supplierTable.find(
            {
                GSI1PK: 'SUPPLIER',
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
            supplierRecords,
            limit,
            direction,
            'GSI1PK',
            'GSI1SK',
            'PK',
            'SK',
            JSON.stringify(supplierRecords.next),
            JSON.stringify(supplierRecords.prev)
        );

        return new PageDto(
            await this.convertToDtoList(supplierRecords),
            pageRecordCursorPointers.nextCursorPointer,
            pageRecordCursorPointers.prevCursorPointer
        );
    }

    async convertToDto(record: SupplierDataType): Promise<SupplierDto> {
        const dto = new SupplierDto();
        dto.supplierId = record.supplierId ? record.supplierId : '';
        dto.supplierName = record.supplierName ? record.supplierName : '';
        dto.supplierAddress = record.supplierAddress ? record.supplierAddress : '';
        dto.supplierPhone = record.supplierPhone ? record.supplierPhone : '';
        dto.supplierEmail = record.supplierEmail ? record.supplierEmail : '';
        dto.supplierContactPerson = record.supplierContactPerson ? record.supplierContactPerson : '';
        dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : {};
        dto.changeReason = record.changeReason ? record.changeReason : undefined;
        return dto;
    }

    async convertToDtoList(records: SupplierDataType[]): Promise<SupplierDto[]> {
        const dtoList: SupplierDto[] = [];

        for (const record of records) {
            const dto: SupplierDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDataType(dto: SupplierDto): Promise<SupplierDataType> {
        const supplierData: SupplierDataType = {
            supplierId: dto.supplierId,
            status: dto.status,
            supplierName: dto.supplierName,
            supplierAddress: dto.supplierAddress,
            supplierPhone: dto.supplierPhone,
            supplierEmail: dto.supplierEmail,
            supplierContactPerson: dto.supplierContactPerson,
            GSI1PK: `SUPPLIER`,
            GSI1SK: dto.supplierName,
            GSI2PK: `SUPPLIER#${dto.status}`,
            GSI2SK: dto.supplierName,
            activityLogs: dto.activityLogs,
            forApprovalVersion: dto.forApprovalVersion,
            changeReason: dto.changeReason,
        };
        return supplierData;
    }
}
