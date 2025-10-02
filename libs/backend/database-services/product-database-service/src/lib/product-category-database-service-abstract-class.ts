import { CreateProductCategoryDto, PageDto, ProductCategoryDto } from '@dto';

export abstract class ProductCategoryDatabaseServiceAbstract {
    abstract createRecord(productCategoryDto: CreateProductCategoryDto): Promise<ProductCategoryDto>;

    abstract findRecordById(id: string): Promise<ProductCategoryDto | null>;

    abstract findRecordContainingName(
        limit: number,
        name: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ProductCategoryDto>>;

    abstract findRecordByName(name: string): Promise<ProductCategoryDto | null>;

    abstract updateRecord(productData: ProductCategoryDto): Promise<ProductCategoryDto>;

    abstract findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<ProductCategoryDto>>;

    abstract findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ProductCategoryDto>>;

    abstract deleteRecord(productCategoryDto: ProductCategoryDto): Promise<ProductCategoryDto>;

    abstract deleteAllRecords(): Promise<void>;

    abstract convertToDto(record: ProductCategoryDto): Promise<ProductCategoryDto>;

    abstract convertToDtoList(records: ProductCategoryDto[]): Promise<ProductCategoryDto[]>;
}
