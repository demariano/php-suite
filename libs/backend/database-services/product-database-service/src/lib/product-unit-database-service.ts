import { CreateProductUnitDto, PageDto, ProductUnitDto, StatusEnum } from '@dto';
import {
    createDynamoDbOptionWithPKSKIndex,
    DynamoDbLibService,
    pageRecordHandler,
    ProductSchema,
    ProductUnitDataType,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { ProductUnitDatabaseServiceAbstract } from './product-unit-database-service-abstract-class';

@Injectable()
export class ProductUnitDatabaseService implements ProductUnitDatabaseServiceAbstract {
    protected readonly logger = new Logger(ProductUnitDatabaseService.name);

    private readonly productUnitTable: Model<ProductUnitDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_PRODUCT_TABLE = configService.get<string>('DYNAMO_DB_PRODUCT_TABLE');
        if (!DYNAMO_DB_PRODUCT_TABLE) {
            throw new Error('DYNAMO_DB_PRODUCT_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.productUnitTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_PRODUCT_TABLE, ProductSchema)
            .getModel('ProductUnit');
    }

    async createRecord(productUnitDto: CreateProductUnitDto): Promise<ProductUnitDto> {
        const productUnitData: ProductUnitDataType = {
            status: productUnitDto.status,
            productUnitName: productUnitDto.productUnitName,
            activityLogs: productUnitDto.activityLogs,
            forApprovalVersion: productUnitDto.forApprovalVersion,

            GSI1PK: `PRODUCT_UNIT`,
            GSI1SK: productUnitDto.productUnitName,
            GSI2PK: `PRODUCT_UNIT`,
            GSI2SK: productUnitDto.status,
        };

        const productRecord: ProductUnitDataType = await this.productUnitTable.create(productUnitData);

        return await this.convertToDto(productRecord);
    }

    async updateRecord(record: ProductUnitDto): Promise<ProductUnitDto> {
        const productRecord: ProductUnitDataType = await this.convertToDataType(record);

        productRecord.productUnitName = record.productUnitName;
        productRecord.status = record.status;
        productRecord.GSI1PK = `PRODUCT_UNIT`;
        productRecord.GSI1SK = record.productUnitName;
        productRecord.GSI2PK = `PRODUCT_UNIT`;
        productRecord.GSI2SK = record.status;
        productRecord.activityLogs = record.activityLogs;
        productRecord.forApprovalVersion = record.forApprovalVersion;

        const updatedProductRecord: ProductUnitDataType = await this.productUnitTable.update(productRecord);

        return await this.convertToDto(updatedProductRecord);
    }

    async findRecordById(id: string): Promise<ProductUnitDto | null> {
        const record = await this.productUnitTable.get({
            PK: `PRODUCT_UNIT`,
            SK: `${id}`,
        });

        if (!record) {
            return null;
        }

        return await this.convertToDto(record);
    }

    async findRecordContainingName(name: string): Promise<ProductUnitDto[] | null> {
        const productUnitRecords = await this.productUnitTable.find(
            {
                GSI1PK: 'PRODUCT_UNIT',
            },
            {
                where: 'contains(${productUnitName}, @{productUnitName})',
                substitutions: {
                    productUnitName: name,
                },
                index: 'GSI1',
            }
        );

        return await this.convertToDtoList(productUnitRecords);
    }

    async findRecordByName(name: string): Promise<ProductUnitDto | null> {
        const record = await this.productUnitTable.get(
            {
                GSI1PK: `PRODUCT_UNIT`,
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

    async getDatabaseRecordById(recordId: string): Promise<ProductUnitDataType | undefined> {
        const record: ProductUnitDataType | undefined = await this.productUnitTable.get({
            PK: 'PRODUCT_UNIT',
            SK: `${recordId}`,
        });

        this.logger.log(`Product Unit Record returned: ${JSON.stringify(record)}`);

        return record;
    }

    async findRecordsPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ProductUnitDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);

        const records = await this.productUnitTable.find(
            {
                GSI2PK: `PRODUCT_UNIT`,
                GSI2SK: `${status}`,
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

    async deleteRecord(dto: ProductUnitDto): Promise<ProductUnitDto> {
        const productRecord: ProductUnitDataType = await this.convertToDataType(dto);

        await this.productUnitTable.remove(productRecord);

        this.logger.log(`Product Record hard deleted: ${JSON.stringify(productRecord)}`);

        return await this.convertToDto(productRecord);
    }

    async convertToDto(record: ProductUnitDataType): Promise<ProductUnitDto> {
        const dto = new ProductUnitDto();
        dto.productUnitId = record.productUnitId ? record.productUnitId : '';
        dto.productUnitName = record.productUnitName ? record.productUnitName : '';
        dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : {};
        return dto;
    }

    async convertToDtoList(records: ProductUnitDataType[]): Promise<ProductUnitDto[]> {
        const dtoList: ProductUnitDto[] = [];

        for (const record of records) {
            const dto: ProductUnitDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDataType(dto: ProductUnitDto): Promise<ProductUnitDataType> {
        const productUnitData: ProductUnitDataType = {
            status: dto.status,
            productUnitName: dto.productUnitName,
            productUnitId: dto.productUnitId,
            GSI1PK: `PRODUCT_UNIT`,
            GSI1SK: dto.productUnitName,
            GSI2PK: `PRODUCT_UNIT#${dto.status}`,
            GSI2SK: dto.productUnitName,
            activityLogs: dto.activityLogs,
            forApprovalVersion: dto.forApprovalVersion,
        };
        return productUnitData;
    }
}
