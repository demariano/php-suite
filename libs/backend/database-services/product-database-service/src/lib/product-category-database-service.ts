import { CreateProductCategoryDto, PageDto, ProductCategoryDto, StatusEnum } from '@dto';
import {
    createDynamoDbOptionWithPKSKIndex,
    DynamoDbLibService,
    pageRecordHandler,
    ProductCategoryDataType,
    ProductSchema,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { ProductCategoryDatabaseServiceAbstract } from './product-category-database-service-abstract-class';
@Injectable()
export class ProductCategoryDatabaseService implements ProductCategoryDatabaseServiceAbstract {
    protected readonly logger = new Logger(ProductCategoryDatabaseService.name);

    private readonly productCategoryTable: Model<ProductCategoryDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_PRODUCT_TABLE = configService.get<string>('DYNAMO_DB_PRODUCT_TABLE');
        if (!DYNAMO_DB_PRODUCT_TABLE) {
            throw new Error('DYNAMO_DB_PRODUCT_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.productCategoryTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_PRODUCT_TABLE, ProductSchema)
            .getModel('ProductCategory');
    }

    async createRecord(productCategoryDto: CreateProductCategoryDto): Promise<ProductCategoryDto> {
        const productCategoryData: ProductCategoryDataType = {
            status: productCategoryDto.status,
            productCategoryName: productCategoryDto.productCategoryName,

            GSI1PK: `PRODUCT_CATEGORY`,
            GSI1SK: productCategoryDto.productCategoryName,
            GSI2PK: `PRODUCT_CATEGORY`,
            GSI2SK: productCategoryDto.status,
        };

        const productRecord: ProductCategoryDataType = await this.productCategoryTable.create(productCategoryData);

        return await this.convertToDto(productRecord);
    }

    async updateRecord(record: ProductCategoryDto): Promise<ProductCategoryDto> {
        const productRecord: ProductCategoryDataType = await this.convertToDataType(record);

        productRecord.productCategoryName = record.productCategoryName;
        productRecord.status = record.status;
        productRecord.GSI1PK = `PRODUCT_CATEGORY`;
        productRecord.GSI1SK = record.productCategoryName;
        productRecord.GSI2PK = `PRODUCT_CATEGORY#${record.status}`;
        productRecord.GSI2SK = record.productCategoryName;

        const updatedProductRecord: ProductCategoryDataType = await this.productCategoryTable.update(productRecord);

        return await this.convertToDto(updatedProductRecord);
    }

    async findRecordById(id: string): Promise<ProductCategoryDto | null> {
        const record = await this.productCategoryTable.get({
            PK: `PRODUCT_CATEGORY`,
            SK: `${id}`,
        });

        if (!record) {
            return null;
        }

        return await this.convertToDto(record);
    }

    async getDatabaseRecordById(recordId: string): Promise<ProductCategoryDataType | undefined> {
        const record: ProductCategoryDataType | undefined = await this.productCategoryTable.get({
            PK: 'PRODUCT_CATEGORY',
            SK: `${recordId}`,
        });

        this.logger.log(`Product Category Record returned: ${JSON.stringify(record)}`);

        return record;
    }

    async findRecordsPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ProductCategoryDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);

        const records = await this.productCategoryTable.find(
            {
                GSI2PK: `PRODUCT_CATEGORY#${status}`,
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

    async deleteRecord(dto: ProductCategoryDto): Promise<ProductCategoryDto> {
        const productRecord: ProductCategoryDataType = await this.convertToDataType(dto);

        await this.productCategoryTable.remove(productRecord);

        this.logger.log(`Product Record hard deleted: ${JSON.stringify(productRecord)}`);

        return await this.convertToDto(productRecord);
    }

    async convertToDto(record: ProductCategoryDataType): Promise<ProductCategoryDto> {
        const dto = new ProductCategoryDto();
        dto.productCategoryId = record.productCategoryId ? record.productCategoryId : '';
        dto.productCategoryName = record.productCategoryName ? record.productCategoryName : '';
        dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;

        return dto;
    }

    async convertToDtoList(records: ProductCategoryDataType[]): Promise<ProductCategoryDto[]> {
        const dtoList: ProductCategoryDto[] = [];

        for (const record of records) {
            const dto: ProductCategoryDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDataType(dto: ProductCategoryDto): Promise<ProductCategoryDataType> {
        const productCategoryData: ProductCategoryDataType = {
            status: dto.status,
            productCategoryName: dto.productCategoryName,
            productCategoryId: dto.productCategoryId,
            GSI1PK: `PRODUCT_CATEGORY`,
            GSI1SK: dto.productCategoryName,
            GSI2PK: `PRODUCT_CATEGORY#${dto.status}`,
            GSI2SK: dto.productCategoryName,
        };
        return productCategoryData;
    }
}
