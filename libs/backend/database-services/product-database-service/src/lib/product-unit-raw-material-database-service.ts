import { CreateProductUnitRawMaterialDto, PageDto, ProductUnitRawMaterialDto, StatusEnum } from '@dto';
import {
    createDynamoDbOptionWithPKSKIndex,
    DynamoDbLibService,
    pageRecordHandler,
    ProductSchema,
    ProductUnitRawMaterialDataType,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { ProductUnitRawMaterialDatabaseServiceAbstract } from './product-unit-raw-material-database-service-abstract-class';

@Injectable()
export class ProductUnitRawMaterialDatabaseService implements ProductUnitRawMaterialDatabaseServiceAbstract {
    protected readonly logger = new Logger(ProductUnitRawMaterialDatabaseService.name);

    private readonly productUnitRawMaterialTable: Model<ProductUnitRawMaterialDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_PRODUCT_TABLE = configService.get<string>('DYNAMO_DB_PRODUCT_TABLE');
        if (!DYNAMO_DB_PRODUCT_TABLE) {
            throw new Error('DYNAMO_DB_PRODUCT_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.productUnitRawMaterialTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_PRODUCT_TABLE, ProductSchema)
            .getModel('ProductUnitRawMaterial');
    }

    async createRecord(productUnitRawMaterialDto: CreateProductUnitRawMaterialDto): Promise<ProductUnitRawMaterialDto> {
        const productUnitRawMaterialData: ProductUnitRawMaterialDataType = {
            status: productUnitRawMaterialDto.status,
            productId: productUnitRawMaterialDto.productId,
            productName: productUnitRawMaterialDto.productName,
            rawMaterialsPerUnit: productUnitRawMaterialDto.rawMaterialsPerUnit,
            activityLogs: productUnitRawMaterialDto.activityLogs,
            forApprovalVersion: productUnitRawMaterialDto.forApprovalVersion,
            GSI1PK: `PRODUCT_UNIT_RAW_MATERIAL#${productUnitRawMaterialDto.productId}`,
            GSI2PK: `PRODUCT_UNIT_RAW_MATERIAL#${productUnitRawMaterialDto.productId}#${productUnitRawMaterialDto.status}`,
        };

        const productRecord: ProductUnitRawMaterialDataType = await this.productUnitRawMaterialTable.create(
            productUnitRawMaterialData
        );

        // Update GSI SK values with the generated ID
        productRecord.GSI1SK = productRecord.productUnitRawMaterialId || '';
        productRecord.GSI2SK = productRecord.productUnitRawMaterialId || '';

        const updatedRecord = await this.productUnitRawMaterialTable.update(productRecord);

        return await this.convertToDto(updatedRecord);
    }

    async updateRecord(record: ProductUnitRawMaterialDto): Promise<ProductUnitRawMaterialDto> {
        const productRecord: ProductUnitRawMaterialDataType = await this.convertToDataType(record);

        productRecord.productId = record.productId;
        productRecord.productName = record.productName;
        productRecord.rawMaterialsPerUnit = record.rawMaterialsPerUnit;
        productRecord.status = record.status;
        productRecord.GSI1PK = `PRODUCT_UNIT_RAW_MATERIAL#${record.productId}`;
        productRecord.GSI1SK = record.productUnitRawMaterialId;
        productRecord.GSI2PK = `PRODUCT_UNIT_RAW_MATERIAL#${record.productId}#${record.status}`;
        productRecord.GSI2SK = record.productUnitRawMaterialId;
        productRecord.activityLogs = record.activityLogs;
        productRecord.forApprovalVersion = record.forApprovalVersion;
        productRecord.changeReason = record.changeReason;
        productRecord.approverMessage = record.approverMessage;

        const updatedProductRecord: ProductUnitRawMaterialDataType = await this.productUnitRawMaterialTable.update(
            productRecord
        );

        return await this.convertToDto(updatedProductRecord);
    }

    async findRecordById(id: string): Promise<ProductUnitRawMaterialDto | null> {
        const record = await this.productUnitRawMaterialTable.get({
            PK: `PRODUCT_UNIT_RAW_MATERIAL`,
            SK: `${id}`,
        });

        if (!record) {
            return null;
        }

        return await this.convertToDto(record);
    }

    async findRecordByProductId(productId: string): Promise<ProductUnitRawMaterialDto | null> {
        const records = await this.productUnitRawMaterialTable.find(
            {
                GSI1PK: `PRODUCT_UNIT_RAW_MATERIAL#${productId}`,
            },
            {
                index: 'GSI1',
                limit: 1,
            }
        );

        if (!records || records.length === 0) {
            return null;
        }

        return await this.convertToDto(records[0]);
    }

    async getDatabaseRecordById(recordId: string): Promise<ProductUnitRawMaterialDataType | undefined> {
        const record: ProductUnitRawMaterialDataType | undefined = await this.productUnitRawMaterialTable.get({
            PK: 'PRODUCT_UNIT_RAW_MATERIAL',
            SK: `${recordId}`,
        });

        this.logger.log(`Product Unit Raw Material Record returned: ${JSON.stringify(record)}`);

        return record;
    }

    async findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        productId: string
    ): Promise<PageDto<ProductUnitRawMaterialDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);

        const records = await this.productUnitRawMaterialTable.find(
            {
                GSI2PK: `PRODUCT_UNIT_RAW_MATERIAL#${productId}#${status}`,
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

    async findRecordsByProductUnitPagination(
        limit: number,
        productId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ProductUnitRawMaterialDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.productUnitRawMaterialTable.find(
            {
                GSI1PK: `PRODUCT_UNIT_RAW_MATERIAL#${productId}`,
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

    async deleteRecord(dto: ProductUnitRawMaterialDto): Promise<ProductUnitRawMaterialDto> {
        const productRecord: ProductUnitRawMaterialDataType = await this.convertToDataType(dto);

        await this.productUnitRawMaterialTable.remove(productRecord);

        this.logger.log(`Product Unit Raw Material Record hard deleted: ${JSON.stringify(productRecord)}`);

        return await this.convertToDto(productRecord);
    }

    async deleteAllRecords(): Promise<void> {
        // Get all the records
        const records = await this.productUnitRawMaterialTable.find({
            PK: `PRODUCT_UNIT_RAW_MATERIAL`,
        });

        // Delete each record
        for (const record of records) {
            await this.productUnitRawMaterialTable.remove(record);
            this.logger.log(`Product Unit Raw Material Record deleted: ${JSON.stringify(record)}`);
        }
    }

    async convertToDto(record: ProductUnitRawMaterialDataType): Promise<ProductUnitRawMaterialDto> {
        const dto = new ProductUnitRawMaterialDto();
        dto.productUnitRawMaterialId = record.productUnitRawMaterialId ? record.productUnitRawMaterialId : '';
        dto.productId = record.productId ? record.productId : '';
        dto.productName = record.productName ? record.productName : '';
        dto.rawMaterialsPerUnit = record.rawMaterialsPerUnit ? record.rawMaterialsPerUnit : [];
        dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : {};
        dto.changeReason = (record as ProductUnitRawMaterialDataType & { changeReason?: string }).changeReason || '';
        dto.approverMessage = record.approverMessage ? record.approverMessage : undefined;
        return dto;
    }

    async convertToDtoList(records: ProductUnitRawMaterialDataType[]): Promise<ProductUnitRawMaterialDto[]> {
        const dtoList: ProductUnitRawMaterialDto[] = [];

        for (const record of records) {
            const dto: ProductUnitRawMaterialDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDataType(dto: ProductUnitRawMaterialDto): Promise<ProductUnitRawMaterialDataType> {
        const productUnitRawMaterialData: ProductUnitRawMaterialDataType = {
            status: dto.status,
            productUnitRawMaterialId: dto.productUnitRawMaterialId,
            productId: dto.productId,
            productName: dto.productName,
            rawMaterialsPerUnit: dto.rawMaterialsPerUnit,
            GSI1PK: `PRODUCT_UNIT_RAW_MATERIAL#${dto.productId}`,
            GSI1SK: dto.productUnitRawMaterialId,
            GSI2PK: `PRODUCT_UNIT_RAW_MATERIAL#${dto.productId}#${dto.status}`,
            GSI2SK: dto.productUnitRawMaterialId,
            activityLogs: dto.activityLogs,
            forApprovalVersion: dto.forApprovalVersion,
            changeReason: dto.changeReason,
            approverMessage: dto.approverMessage,
        };
        return productUnitRawMaterialData;
    }

    async findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ProductUnitRawMaterialDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, undefined, direction, cursorPointer);

        const productRecords = await this.productUnitRawMaterialTable.find(
            {
                PK: `PRODUCT_UNIT_RAW_MATERIAL`,
            },
            dynamoDbOption
        );

        const pageRecordCursorPointers = pageRecordHandler(
            productRecords,
            limit,
            direction,
            'PK',
            'SK',
            'PK',
            'SK',
            JSON.stringify(productRecords.next),
            JSON.stringify(productRecords.prev)
        );

        return new PageDto(
            await this.convertToDtoList(productRecords),
            pageRecordCursorPointers.nextCursorPointer,
            pageRecordCursorPointers.prevCursorPointer
        );
    }
}
