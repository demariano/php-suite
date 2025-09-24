import { CreateProductDto, PageDto, ProductDto, ProductFilterDto, StatusEnum } from '@dto';
import {
    createDynamoDbOptionWithPKSKIndex,
    DynamoDbLibService,
    pageRecordHandler,
    ProductDataType,
    ProductSchema,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { ProductDatabaseServiceAbstract } from './product-database-service-abstract-class';
@Injectable()
export class ProductDatabaseService implements ProductDatabaseServiceAbstract {
    protected readonly logger = new Logger(ProductDatabaseService.name);

    private readonly productTable: Model<ProductDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_PRODUCT_TABLE = configService.get<string>('DYNAMO_DB_PRODUCT_TABLE');
        if (!DYNAMO_DB_PRODUCT_TABLE) {
            throw new Error('DYNAMO_DB_PRODUCT_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.productTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_PRODUCT_TABLE, ProductSchema)
            .getModel('Product');
    }

    async createRecord(productDto: CreateProductDto): Promise<ProductDto> {
        const productData: ProductDataType = {
            status: productDto.status,
            productName: productDto.productName,
            criticalLevel: productDto.criticalLevel,
            productCategoryId: productDto.productCategoryId,
            productCategoryName: productDto.productCategoryName,
            productClassId: productDto.productClassId,
            productClassName: productDto.productClassName,
            productDeals: productDto.productDeals,
            productUnitPrice: productDto.productUnitPrice,
            GSI1PK: `PRODUCT`,
            GSI1SK: productDto.productName,
            GSI2PK: `PRODUCT`,
            GSI2SK: productDto.status,
            GSI3PK: `PRODUCT#${productDto.productCategoryId}`,
            GSI3SK: productDto.productName,
            GSI4PK: `PRODUCT#${productDto.productClassId}`,
            GSI4SK: productDto.productName,
        };

        const productRecord: ProductDataType = await this.productTable.create(productData);

        return await this.convertToDto(productRecord);
    }

    async updateProductRecord(productData: ProductDto): Promise<ProductDto> {
        const productRecord: ProductDataType = await this.convertToDataType(productData);

        productRecord.productName = productData.productName;
        productRecord.criticalLevel = productData.criticalLevel;
        productRecord.productCategoryId = productData.productCategoryId;
        productRecord.productCategoryName = productData.productCategoryName;
        productRecord.productClassId = productData.productClassId;
        productRecord.productClassName = productData.productClassName;
        productRecord.productDeals = productData.productDeals;
        productRecord.productUnitPrice = productData.productUnitPrice;
        productRecord.GSI1PK = `PRODUCT`;
        productRecord.GSI1SK = productData.productName;
        productRecord.GSI2PK = `PRODUCT`;
        productRecord.GSI2SK = productData.status;
        productRecord.GSI3PK = `PRODUCT#${productData.productCategoryId}`;
        productRecord.GSI3SK = productData.productName;
        productRecord.GSI4PK = `PRODUCT#${productData.productClassId}`;
        productRecord.GSI4SK = productData.productName;

        const updatedProductRecord: ProductDataType = await this.productTable.update(productRecord);

        return await this.convertToDto(updatedProductRecord);
    }

    async findProductRecordById(id: string): Promise<ProductDto | null> {
        const productRecord = await this.productTable.get({
            PK: `PRODUCT`,
            SK: `${id}`,
        });

        if (!productRecord) {
            return null;
        }

        return await this.convertToDto(productRecord);
    }

    async getDatabaseRecordById(productId: string): Promise<ProductDataType | undefined> {
        const productRecord: ProductDataType | undefined = await this.productTable.get({
            PK: 'PRODUCT',
            SK: `${productId}`,
        });

        this.logger.log(`Product Record returned: ${JSON.stringify(productRecord)}`);

        return productRecord;
    }

    async findProductRecordsPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ProductDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);

        const productRecords = await this.productTable.find(
            {
                GSI2PK: `PRODUCT#${status}`,
            },
            dynamoDbOption
        );

        const pageRecordCursorPointers = pageRecordHandler(
            productRecords,
            limit,
            direction,
            'GSI2PK',
            'GSI2SK',
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

    async findProductRecordsByFilterPagination(
        filter: ProductFilterDto,
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ProductDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const whereClause = [
            filter.status ? 'contains(${status}, @{status})' : null,
            filter.productCategoryId && filter.productCategoryId.length > 0
                ? '(${productCategoryId} IN (@{...productCategoryIds}))'
                : null,
            filter.productClassId && filter.productClassId.length > 0
                ? '(${productClassId} IN (@{...productClassIds}))'
                : null,
        ]
            .filter(Boolean)
            .join(' and ');

        const substitutions = {
            ...(filter.status && { status: filter.status.toLocaleLowerCase() }),
            ...(filter.productCategoryId &&
                filter.productCategoryId.length > 0 && { productCategoryIds: filter.productCategoryId }),
            ...(filter.productClassId &&
                filter.productClassId.length > 0 && { productClassIds: filter.productClassId }),
        };

        //check if filter.fields not undefiend but not an array , convert it to an array
        if (filter.fields && !Array.isArray(filter.fields)) {
            filter.fields = [filter.fields];
        }

        //check filter.fields , if it does not include userId , then add it to the fields
        if (!filter.fields?.includes('productId')) {
            filter.fields?.push('productId');
        }

        if (!filter.fields?.includes('productId')) {
            filter.fields?.push('productId');
        }

        const userRecords = await this.productTable.find(
            {
                GSI1PK: 'PRODUCT',
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
            userRecords,
            limit,
            direction,
            'GSI1PK',
            'GSI1SK',
            'PK',
            'SK',
            JSON.stringify(userRecords.next),
            JSON.stringify(userRecords.prev)
        );

        return new PageDto(
            await this.convertToDtoList(userRecords),
            pageRecordCursorPointers.nextCursorPointer,
            pageRecordCursorPointers.prevCursorPointer
        );
    }

    async deleteProductRecord(productDto: ProductDto): Promise<ProductDto> {
        const productRecord: ProductDataType = await this.convertToDataType(productDto);

        await this.productTable.remove(productRecord);

        this.logger.log(`Product Record hard deleted: ${JSON.stringify(productRecord)}`);

        return await this.convertToDto(productRecord);
    }

    async convertToDto(record: ProductDataType): Promise<ProductDto> {
        const dto = new ProductDto();
        dto.productId = record.productId ? record.productId : '';
        dto.productName = record.productName ? record.productName : '';
        dto.criticalLevel = record.criticalLevel ? record.criticalLevel : 0;
        dto.productCategoryId = record.productCategoryId ? record.productCategoryId : '';
        dto.productCategoryName = record.productCategoryName ? record.productCategoryName : '';
        dto.productClassId = record.productClassId ? record.productClassId : '';
        dto.productClassName = record.productClassName ? record.productClassName : '';
        dto.productDeals = record.productDeals ? record.productDeals : [];
        dto.productUnitPrice = record.productUnitPrice ? record.productUnitPrice : [];
        dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        return dto;
    }

    async convertToDtoList(records: ProductDataType[]): Promise<ProductDto[]> {
        const dtoList: ProductDto[] = [];

        for (const record of records) {
            const dto: ProductDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDataType(dto: ProductDto): Promise<ProductDataType> {
        const productData: ProductDataType = {
            status: dto.status,
            productName: dto.productName,
            criticalLevel: dto.criticalLevel,
            productCategoryId: dto.productCategoryId,
            productCategoryName: dto.productCategoryName,
            productClassId: dto.productClassId,
            productClassName: dto.productClassName,
            productDeals: dto.productDeals,
            productUnitPrice: dto.productUnitPrice,
            GSI1PK: `PRODUCT`,
            GSI1SK: dto.productName,
            GSI2PK: `PRODUCT#${dto.status}`,
            GSI2SK: dto.productName,
            GSI3PK: `PRODUCT#${dto.productCategoryId}`,
            GSI3SK: dto.productName,
            GSI4PK: `PRODUCT#${dto.productClassId}`,
            GSI4SK: dto.productName,
            activityLogs: dto.activityLogs,
        };
        return productData;
    }
}
