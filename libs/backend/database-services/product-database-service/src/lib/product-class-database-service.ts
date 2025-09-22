import { CreateProductClassDto, PageDto, ProductClassDto, StatusEnum } from '@dto';
import {
    createDynamoDbOptionWithPKSKIndex,
    DynamoDbLibService,
    pageRecordHandler,
    ProductClassDataType,
    ProductSchema,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { ProductClassDatabaseServiceAbstract } from './product-class-database-service-abstract-class';

@Injectable()
export class ProductClassDatabaseService implements ProductClassDatabaseServiceAbstract {
    protected readonly logger = new Logger(ProductClassDatabaseService.name);

    private readonly productClassTable: Model<ProductClassDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_PRODUCT_TABLE = configService.get<string>('DYNAMO_DB_PRODUCT_TABLE');
        if (!DYNAMO_DB_PRODUCT_TABLE) {
            throw new Error('DYNAMO_DB_PRODUCT_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.productClassTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_PRODUCT_TABLE, ProductSchema)
            .getModel('ProductClass');
    }

    async createRecord(productClassDto: CreateProductClassDto): Promise<ProductClassDto> {
        const productClassData: ProductClassDataType = {
            status: productClassDto.status,
            productClassName: productClassDto.productClassName,

            GSI1PK: `PRODUCT_CLASS`,
            GSI1SK: productClassDto.productClassName,
            GSI2PK: `PRODUCT_CLASS`,
            GSI2SK: productClassDto.status,
        };

        const productRecord: ProductClassDataType = await this.productClassTable.create(productClassData);

        return await this.convertToDto(productRecord);
    }

    async updateRecord(record: ProductClassDto): Promise<ProductClassDto> {
        const productRecord: ProductClassDataType = await this.convertToDataType(record);

        productRecord.productClassName = record.productClassName;
        productRecord.status = record.status;
        productRecord.GSI1PK = `PRODUCT_CLASS`;
        productRecord.GSI1SK = record.productClassName;
        productRecord.GSI2PK = `PRODUCT_CLASS#${record.status}`;
        productRecord.GSI2SK = record.productClassName;

        const updatedProductRecord: ProductClassDataType = await this.productClassTable.update(productRecord);

        return await this.convertToDto(updatedProductRecord);
    }

    async findRecordById(id: string): Promise<ProductClassDto | null> {
        const record = await this.productClassTable.get({
            PK: `PRODUCT_CLASS`,
            SK: `${id}`,
        });

        if (!record) {
            return null;
        }

        return await this.convertToDto(record);
    }

    async getDatabaseRecordById(recordId: string): Promise<ProductClassDataType | undefined> {
        const record: ProductClassDataType | undefined = await this.productClassTable.get({
            PK: 'PRODUCT_CLASS',
            SK: `${recordId}`,
        });

        this.logger.log(`Product Class Record returned: ${JSON.stringify(record)}`);

        return record;
    }

    async findRecordsPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ProductClassDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);

        const records = await this.productClassTable.find(
            {
                GSI2PK: `PRODUCT_CLASS#${status}`,
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

    async deleteRecord(dto: ProductClassDto): Promise<ProductClassDto> {
        const productRecord: ProductClassDataType = await this.convertToDataType(dto);

        await this.productClassTable.remove(productRecord);

        this.logger.log(`Product Record hard deleted: ${JSON.stringify(productRecord)}`);

        return await this.convertToDto(productRecord);
    }

    async convertToDto(record: ProductClassDataType): Promise<ProductClassDto> {
        const dto = new ProductClassDto();
        dto.productClassId = record.productClassId ? record.productClassId : '';
        dto.productClassName = record.productClassName ? record.productClassName : '';
        dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;

        return dto;
    }

    async convertToDtoList(records: ProductClassDataType[]): Promise<ProductClassDto[]> {
        const dtoList: ProductClassDto[] = [];

        for (const record of records) {
            const dto: ProductClassDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDataType(dto: ProductClassDto): Promise<ProductClassDataType> {
        const productClassData: ProductClassDataType = {
            status: dto.status,
            productClassName: dto.productClassName,
            productClassId: dto.productClassId,
            GSI1PK: `PRODUCT_CLASS`,
            GSI1SK: dto.productClassName,
            GSI2PK: `PRODUCT_CLASS#${dto.status}`,
            GSI2SK: dto.productClassName,
        };
        return productClassData;
    }
}
