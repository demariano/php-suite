import { CreateProductDealDto, PageDto, ProductDealDto, StatusEnum } from '@dto';
import {
    createDynamoDbOptionWithPKSKIndex,
    DynamoDbLibService,
    pageRecordHandler,
    ProductDealDataType,
    ProductSchema,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { ProductDealDatabaseServiceAbstract } from './product-deal-database-service-abstract-class';

@Injectable()
export class ProductDealDatabaseService implements ProductDealDatabaseServiceAbstract {
    protected readonly logger = new Logger(ProductDealDatabaseService.name);

    private readonly productDealTable: Model<ProductDealDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_PRODUCT_TABLE = configService.get<string>('DYNAMO_DB_PRODUCT_TABLE');
        if (!DYNAMO_DB_PRODUCT_TABLE) {
            throw new Error('DYNAMO_DB_PRODUCT_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.productDealTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_PRODUCT_TABLE, ProductSchema)
            .getModel('ProductDeal');
    }

    async createRecord(productDealDto: CreateProductDealDto): Promise<ProductDealDto> {
        const productDealData: ProductDealDataType = {
            status: productDealDto.status,
            productDealName: productDealDto.productDealName,
            additionalQty: productDealDto.additionalQty,
            minQty: productDealDto.minQty,
            activityLogs: productDealDto.activityLogs,
            forApprovalVersion: productDealDto.forApprovalVersion,

            GSI1PK: `PRODUCT_DEAL`,
            GSI1SK: productDealDto.productDealName,
            GSI2PK: `PRODUCT_DEAL#${productDealDto.status}`,
            GSI2SK: productDealDto.productDealName,
        };

        const productRecord: ProductDealDataType = await this.productDealTable.create(productDealData);

        return await this.convertToDto(productRecord);
    }

    async updateRecord(record: ProductDealDto): Promise<ProductDealDto> {
        const productRecord: ProductDealDataType = await this.convertToDataType(record);

        productRecord.productDealName = record.productDealName;
        productRecord.additionalQty = record.additionalQty;
        productRecord.minQty = record.minQty;
        productRecord.status = record.status;
        productRecord.GSI1PK = `PRODUCT_DEAL`;
        productRecord.GSI1SK = record.productDealName;
        productRecord.GSI2PK = `PRODUCT_DEAL#${record.status}`;
        productRecord.GSI2SK = record.productDealName;
        productRecord.activityLogs = record.activityLogs;
        productRecord.forApprovalVersion = record.forApprovalVersion;
        const updatedProductRecord: ProductDealDataType = await this.productDealTable.update(productRecord);

        return await this.convertToDto(updatedProductRecord);
    }

    async findRecordById(id: string): Promise<ProductDealDto | null> {
        const record = await this.productDealTable.get({
            PK: `PRODUCT_DEAL`,
            SK: `${id}`,
        });

        if (!record) {
            return null;
        }

        return await this.convertToDto(record);
    }

    async findRecordContainingName(
        limit: number,
        name: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ProductDealDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.productDealTable.find(
            {
                GSI1PK: `PRODUCT_DEAL`,
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

    async findRecordByName(name: string): Promise<ProductDealDto | null> {
        const record = await this.productDealTable.get(
            {
                GSI1PK: `PRODUCT_DEAL`,
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

    async getDatabaseRecordById(recordId: string): Promise<ProductDealDataType | undefined> {
        const record: ProductDealDataType | undefined = await this.productDealTable.get({
            PK: 'PRODUCT_DEAL',
            SK: `${recordId}`,
        });

        this.logger.log(`Product Deal Record returned: ${JSON.stringify(record)}`);

        return record;
    }

    async findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<ProductDealDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);

        const records = await this.productDealTable.find(
            {
                GSI2PK: `PRODUCT_DEAL#${status}`,
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
    ): Promise<PageDto<ProductDealDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.productDealTable.find(
            {
                GSI1PK: `PRODUCT_DEAL`,
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

    async deleteRecord(dto: ProductDealDto): Promise<ProductDealDto> {
        const productRecord: ProductDealDataType = await this.convertToDataType(dto);

        await this.productDealTable.remove(productRecord);

        this.logger.log(`Product Record hard deleted: ${JSON.stringify(productRecord)}`);

        return await this.convertToDto(productRecord);
    }

    async deleteAllRecords(): Promise<void> {
        // Get all the records
        const records = await this.productDealTable.find(
            {
                GSI1PK: `PRODUCT_DEAL`,
            },
            {
                index: 'GSI1',
            }
        );

        // Delete each record
        for (const record of records) {
            await this.productDealTable.remove(record);
            this.logger.log(`Product Deal Record deleted: ${JSON.stringify(record)}`);
        }
    }

    async convertToDto(record: ProductDealDataType): Promise<ProductDealDto> {
        const dto = new ProductDealDto();
        dto.productDealId = record.productDealId ? record.productDealId : '';
        dto.productDealName = record.productDealName ? record.productDealName : '';
        dto.additionalQty = record.additionalQty ? record.additionalQty : 0;
        dto.minQty = record.minQty ? record.minQty : 0;
        dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : {};
        return dto;
    }

    async convertToDtoList(records: ProductDealDataType[]): Promise<ProductDealDto[]> {
        const dtoList: ProductDealDto[] = [];

        for (const record of records) {
            const dto: ProductDealDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDataType(dto: ProductDealDto): Promise<ProductDealDataType> {
        const productDealData: ProductDealDataType = {
            status: dto.status,
            productDealName: dto.productDealName,
            productDealId: dto.productDealId,
            additionalQty: dto.additionalQty,
            minQty: dto.minQty,
            GSI1PK: `PRODUCT_DEAL`,
            GSI1SK: dto.productDealName,
            GSI2PK: `PRODUCT_DEAL#${dto.status}`,
            GSI2SK: dto.productDealName,
            activityLogs: dto.activityLogs,
            forApprovalVersion: dto.forApprovalVersion,
        };
        return productDealData;
    }
}
