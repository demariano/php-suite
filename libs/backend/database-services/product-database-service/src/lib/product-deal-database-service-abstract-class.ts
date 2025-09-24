import { CreateProductDealDto, PageDto, ProductDealDto } from '@dto';

export abstract class ProductDealDatabaseServiceAbstract {
    abstract createRecord(productDealDto: CreateProductDealDto): Promise<ProductDealDto>;

    abstract findRecordById(id: string): Promise<ProductDealDto | null>;

    abstract findRecordContainingName(name: string): Promise<ProductDealDto[] | null>;

    abstract findRecordByName(name: string): Promise<ProductDealDto | null>;

    abstract updateRecord(productData: ProductDealDto): Promise<ProductDealDto>;

    abstract findRecordsPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ProductDealDto>>;

    abstract deleteRecord(productDealDto: ProductDealDto): Promise<ProductDealDto>;

    abstract convertToDto(record: ProductDealDto): Promise<ProductDealDto>;

    abstract convertToDtoList(records: ProductDealDto[]): Promise<ProductDealDto[]>;
}
