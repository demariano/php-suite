import { CreateProductDto, PageDto, ProductDto, ProductFilterDto } from '@dto';
import { ProductDataType } from '@dynamo-db-lib';

export abstract class ProductDatabaseServiceAbstract {
    abstract createRecord(productDto: CreateProductDto): Promise<ProductDto>;

    abstract findProductRecordById(id: string): Promise<ProductDto | null>;

    abstract updateProductRecord(productData: ProductDto): Promise<ProductDto>;

    abstract findRecordByName(name: string): Promise<ProductDto | null>;

    abstract findRecordContainingName(name: string): Promise<ProductDto[] | null>;

    abstract findProductRecordsPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ProductDto>>;

    abstract findProductRecordsByFilterPagination(
        filter: ProductFilterDto,
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ProductDto>>;

    abstract deleteProductRecord(productDto: ProductDto): Promise<ProductDto>;

    abstract deleteAllRecords(): Promise<void>;

    abstract convertToDto(record: ProductDto): Promise<ProductDto>;

    abstract convertToDtoList(records: ProductDto[]): Promise<ProductDto[]>;

    abstract convertToDataType(dto: ProductDto): Promise<ProductDataType>;
}
