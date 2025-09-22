import { CreateProductPriceTypeDto, PageDto, ProductPriceTypeDto, StatusEnum } from '@dto';
import {
    createDynamoDbOptionWithPKSKIndex,
    DynamoDbLibService,
    pageRecordHandler,
    ProductPriceTypeDataType,
    ProductSchema,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { ProductPriceTypeDatabaseServiceAbstract } from './product-price-type-database-service-abstract-class';

@Injectable()
export class ProductPriceTypeDatabaseService implements ProductPriceTypeDatabaseServiceAbstract {
    protected readonly logger = new Logger(ProductPriceTypeDatabaseService.name);

    private readonly productPriceTypeTable: Model<ProductPriceTypeDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_PRODUCT_TABLE = configService.get<string>('DYNAMO_DB_PRODUCT_TABLE');
        if (!DYNAMO_DB_PRODUCT_TABLE) {
            throw new Error('DYNAMO_DB_PRODUCT_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.productPriceTypeTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_PRODUCT_TABLE, ProductSchema)
            .getModel('ProductPriceType');
    }

    async createRecord(productPriceTypeDto: CreateProductPriceTypeDto): Promise<ProductPriceTypeDto> {
        const productPriceTypeData: ProductPriceTypeDataType = {
            status: productPriceTypeDto.status,
            productPriceTypeName: productPriceTypeDto.productPriceTypeName,

            GSI1PK: `PRODUCT_PRICE_TYPE`,
            GSI1SK: productPriceTypeDto.productPriceTypeName,
            GSI2PK: `PRODUCT_PRICE_TYPE`,
            GSI2SK: productPriceTypeDto.status,
        };

        const productRecord: ProductPriceTypeDataType = await this.productPriceTypeTable.create(productPriceTypeData);

        return await this.convertToDto(productRecord);
    }

    async updateRecord(record: ProductPriceTypeDto): Promise<ProductPriceTypeDto> {
        const productRecord: ProductPriceTypeDataType = await this.convertToDataType(record);

        productRecord.productPriceTypeName = record.productPriceTypeName;
        productRecord.status = record.status;
        productRecord.GSI1PK = `PRODUCT_PRICE_TYPE`;
        productRecord.GSI1SK = record.productPriceTypeName;
        productRecord.GSI2PK = `PRODUCT_PRICE_TYPE#${record.status}`;
        productRecord.GSI2SK = record.productPriceTypeName;

        const updatedProductRecord: ProductPriceTypeDataType = await this.productPriceTypeTable.update(productRecord);

        return await this.convertToDto(updatedProductRecord);
    }

    async findRecordById(id: string): Promise<ProductPriceTypeDto | null> {
        const record = await this.productPriceTypeTable.get({
            PK: `PRODUCT_PRICE_TYPE`,
            SK: `${id}`,
        });

        if (!record) {
            return null;
        }

        return await this.convertToDto(record);
    }

    async getDatabaseRecordById(recordId: string): Promise<ProductPriceTypeDataType | undefined> {
        const record: ProductPriceTypeDataType | undefined = await this.productPriceTypeTable.get({
            PK: 'PRODUCT_PRICE_TYPE',
            SK: `${recordId}`,
        });

        this.logger.log(`Product Price Type Record returned: ${JSON.stringify(record)}`);

        return record;
    }

    async findRecordsPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ProductPriceTypeDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);

        const records = await this.productPriceTypeTable.find(
            {
                GSI2PK: `PRODUCT_PRICE_TYPE#${status}`,
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

    async deleteRecord(dto: ProductPriceTypeDto): Promise<ProductPriceTypeDto> {
        const productRecord: ProductPriceTypeDataType = await this.convertToDataType(dto);

        await this.productPriceTypeTable.remove(productRecord);

        this.logger.log(`Product Record hard deleted: ${JSON.stringify(productRecord)}`);

        return await this.convertToDto(productRecord);
    }

    async convertToDto(record: ProductPriceTypeDataType): Promise<ProductPriceTypeDto> {
        const dto = new ProductPriceTypeDto();
        dto.productPriceTypeId = record.productPriceTypeId ? record.productPriceTypeId : '';
        dto.productPriceTypeName = record.productPriceTypeName ? record.productPriceTypeName : '';
        dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;

        return dto;
    }

    async convertToDtoList(records: ProductPriceTypeDataType[]): Promise<ProductPriceTypeDto[]> {
        const dtoList: ProductPriceTypeDto[] = [];

        for (const record of records) {
            const dto: ProductPriceTypeDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDataType(dto: ProductPriceTypeDto): Promise<ProductPriceTypeDataType> {
        const productPriceTypeData: ProductPriceTypeDataType = {
            status: dto.status,
            productPriceTypeName: dto.productPriceTypeName,
            productPriceTypeId: dto.productPriceTypeId,
            GSI1PK: `PRODUCT_PRICE_TYPE`,
            GSI1SK: dto.productPriceTypeName,
            GSI2PK: `PRODUCT_PRICE_TYPE#${dto.status}`,
            GSI2SK: dto.productPriceTypeName,
        };
        return productPriceTypeData;
    }
}
