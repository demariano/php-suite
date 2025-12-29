import { CreateRawMaterialSupplierDto, PageDto, RawMaterialSupplierDto, StatusEnum } from '@dto';
import {
    createDynamoDbOptionWithPKSKIndex,
    DynamoDbLibService,
    InventorySchema,
    RawMaterialSupplierDataType,
    pageRecordHandler,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { RawMaterialSupplierDatabaseServiceAbstract } from './raw-material-supplier-database-service-abstract-class';

@Injectable()
export class RawMaterialSupplierDatabaseService implements RawMaterialSupplierDatabaseServiceAbstract {
    protected readonly logger = new Logger(RawMaterialSupplierDatabaseService.name);

    private readonly rawMaterialSupplierTable: Model<RawMaterialSupplierDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_INVENTORY_TABLE = configService.get<string>('DYNAMO_DB_INVENTORY_TABLE');
        if (!DYNAMO_DB_INVENTORY_TABLE) {
            throw new Error('DYNAMO_DB_INVENTORY_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.rawMaterialSupplierTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_INVENTORY_TABLE, InventorySchema)
            .getModel('RawMaterialSupplier');
    }

    async createRecord(rawMaterialSupplierDto: CreateRawMaterialSupplierDto): Promise<RawMaterialSupplierDto> {
        const rawMaterialSupplierData: RawMaterialSupplierDataType = {
            status: rawMaterialSupplierDto.status,
            rawMaterialSupplierName: rawMaterialSupplierDto.rawMaterialSupplierName,
            activityLogs: rawMaterialSupplierDto.activityLogs,
            forApprovalVersion: rawMaterialSupplierDto.forApprovalVersion,
            changeReason: rawMaterialSupplierDto.changeReason,
            approverMessage: rawMaterialSupplierDto.approverMessage,
            GSI1PK: 'RAW_MATERIAL_SUPPLIER',
            GSI1SK: rawMaterialSupplierDto.rawMaterialSupplierName,
            GSI2PK: `RAW_MATERIAL_SUPPLIER#${rawMaterialSupplierDto.status}`,
            GSI2SK: rawMaterialSupplierDto.rawMaterialSupplierName,
        };

        const rawMaterialSupplierRecord: RawMaterialSupplierDataType = await this.rawMaterialSupplierTable.create(
            rawMaterialSupplierData
        );

        return await this.convertToDto(rawMaterialSupplierRecord);
    }

    async updateRecord(record: RawMaterialSupplierDto): Promise<RawMaterialSupplierDto> {
        const rawMaterialSupplierRecord: RawMaterialSupplierDataType = await this.convertToDataType(record);

        rawMaterialSupplierRecord.rawMaterialSupplierName = record.rawMaterialSupplierName;
        rawMaterialSupplierRecord.status = record.status;
        rawMaterialSupplierRecord.GSI1PK = 'RAW_MATERIAL_SUPPLIER';
        rawMaterialSupplierRecord.GSI1SK = record.rawMaterialSupplierName;
        rawMaterialSupplierRecord.GSI2PK = `RAW_MATERIAL_SUPPLIER#${record.status}`;
        rawMaterialSupplierRecord.GSI2SK = record.rawMaterialSupplierName;
        rawMaterialSupplierRecord.forApprovalVersion = record.forApprovalVersion;
        rawMaterialSupplierRecord.changeReason = record.changeReason;
        rawMaterialSupplierRecord.approverMessage = record.approverMessage;

        const updatedRawMaterialSupplierRecord: RawMaterialSupplierDataType =
            await this.rawMaterialSupplierTable.update(rawMaterialSupplierRecord);

        return await this.convertToDto(updatedRawMaterialSupplierRecord);
    }

    async findRecordById(id: string): Promise<RawMaterialSupplierDto | null> {
        const record = await this.rawMaterialSupplierTable.get({
            PK: 'RAW_MATERIAL_SUPPLIER',
            SK: `${id}`,
        });

        if (!record) {
            return null;
        }

        return await this.convertToDto(record);
    }

    async findRecordsByNamePagination(
        limit: number,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<RawMaterialSupplierDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.rawMaterialSupplierTable.find(
            {
                GSI1PK: 'RAW_MATERIAL_SUPPLIER',
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

    async findRecordByName(name: string): Promise<RawMaterialSupplierDto | null> {
        const record = await this.rawMaterialSupplierTable.get(
            {
                GSI1PK: 'RAW_MATERIAL_SUPPLIER',
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

    async getDatabaseRecordById(recordId: string): Promise<RawMaterialSupplierDataType | undefined> {
        const record: RawMaterialSupplierDataType | undefined = await this.rawMaterialSupplierTable.get({
            PK: 'RAW_MATERIAL_SUPPLIER',
            SK: `${recordId}`,
        });

        this.logger.log(`RawMaterialSupplier Record returned: ${JSON.stringify(record)}`);

        return record;
    }

    async findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<RawMaterialSupplierDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);

        const records = await this.rawMaterialSupplierTable.find(
            {
                GSI2PK: `RAW_MATERIAL_SUPPLIER#${status}`,
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
    ): Promise<PageDto<RawMaterialSupplierDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.rawMaterialSupplierTable.find(
            {
                GSI1PK: 'RAW_MATERIAL_SUPPLIER',
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

    async deleteRecord(dto: RawMaterialSupplierDto): Promise<RawMaterialSupplierDto> {
        const rawMaterialSupplierRecord: RawMaterialSupplierDataType = await this.convertToDataType(dto);

        await this.rawMaterialSupplierTable.remove(rawMaterialSupplierRecord);

        this.logger.log(`RawMaterialSupplier Record hard deleted: ${JSON.stringify(rawMaterialSupplierRecord)}`);

        return await this.convertToDto(rawMaterialSupplierRecord);
    }

    async deleteAllRecords(): Promise<void> {
        const records = await this.rawMaterialSupplierTable.find(
            {
                GSI1PK: 'RAW_MATERIAL_SUPPLIER',
            },
            {
                index: 'GSI1',
            }
        );

        for (const record of records) {
            await this.rawMaterialSupplierTable.remove(record);
            this.logger.log(`Raw Material Supplier Record deleted: ${JSON.stringify(record)}`);
        }
    }

    async convertToDto(record: RawMaterialSupplierDataType): Promise<RawMaterialSupplierDto> {
        const dto = new RawMaterialSupplierDto();
        dto.rawMaterialSupplierId = record.rawMaterialSupplierId ? record.rawMaterialSupplierId : '';
        dto.rawMaterialSupplierName = record.rawMaterialSupplierName ? record.rawMaterialSupplierName : '';
        dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : {};
        dto.changeReason =
            (record as RawMaterialSupplierDataType & { changeReason?: string }).changeReason || undefined;
        dto.approverMessage = record.approverMessage ? record.approverMessage : undefined;
        return dto;
    }

    async convertToDtoList(records: RawMaterialSupplierDataType[]): Promise<RawMaterialSupplierDto[]> {
        const dtoList: RawMaterialSupplierDto[] = [];

        for (const record of records) {
            const dto: RawMaterialSupplierDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDataType(dto: RawMaterialSupplierDto): Promise<RawMaterialSupplierDataType> {
        const rawMaterialSupplierData: RawMaterialSupplierDataType = {
            rawMaterialSupplierId: dto.rawMaterialSupplierId,
            rawMaterialSupplierName: dto.rawMaterialSupplierName,
            status: dto.status,
            GSI1PK: 'RAW_MATERIAL_SUPPLIER',
            GSI1SK: dto.rawMaterialSupplierName,
            GSI2PK: `RAW_MATERIAL_SUPPLIER#${dto.status}`,
            GSI2SK: dto.rawMaterialSupplierName,
            activityLogs: dto.activityLogs,
            forApprovalVersion: dto.forApprovalVersion,
            changeReason: dto.changeReason,
            approverMessage: dto.approverMessage,
        };
        return rawMaterialSupplierData;
    }
}
