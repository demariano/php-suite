import { CreateProductDealDto, PageDto, ProductDealDto } from '@dto';

export abstract class ProductDealDatabaseServiceAbstract {
    abstract createRecord(productDealDto: CreateProductDealDto): Promise<ProductDealDto>;

    abstract findRecordById(id: string): Promise<ProductDealDto | null>;

    abstract findRecordContainingName(
        limit: number,
        name: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ProductDealDto>>;

    abstract findRecordByName(name: string): Promise<ProductDealDto | null>;

    abstract updateRecord(productData: ProductDealDto): Promise<ProductDealDto>;

    abstract findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<ProductDealDto>>;

    abstract findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ProductDealDto>>;

    abstract deleteRecord(productDealDto: ProductDealDto): Promise<ProductDealDto>;

    abstract deleteAllRecords(): Promise<void>;

    abstract convertToDto(record: ProductDealDto): Promise<ProductDealDto>;

    abstract convertToDtoList(records: ProductDealDto[]): Promise<ProductDealDto[]>;
}
