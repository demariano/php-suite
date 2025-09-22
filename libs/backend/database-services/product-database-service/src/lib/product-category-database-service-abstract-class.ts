import { CreateProductCategoryDto, PageDto, ProductCategoryDto } from '@dto';

export abstract class ProductCategoryDatabaseServiceAbstract {
    abstract createRecord(productCategoryDto: CreateProductCategoryDto): Promise<ProductCategoryDto>;

    abstract findRecordById(id: string): Promise<ProductCategoryDto | null>;

    abstract updateRecord(productData: ProductCategoryDto): Promise<ProductCategoryDto>;

    abstract findRecordsPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ProductCategoryDto>>;

    abstract deleteRecord(productCategoryDto: ProductCategoryDto): Promise<ProductCategoryDto>;

    abstract convertToDto(record: ProductCategoryDto): Promise<ProductCategoryDto>;

    abstract convertToDtoList(records: ProductCategoryDto[]): Promise<ProductCategoryDto[]>;
}
