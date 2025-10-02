import { CreateProductPriceTypeDto, PageDto, ProductPriceTypeDto } from '@dto';

export abstract class ProductPriceTypeDatabaseServiceAbstract {
    abstract createRecord(productPriceTypeDto: CreateProductPriceTypeDto): Promise<ProductPriceTypeDto>;

    abstract findRecordById(id: string): Promise<ProductPriceTypeDto | null>;

    abstract findRecordContainingName(
        limit: number,
        name: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ProductPriceTypeDto>>;

    abstract findRecordByName(name: string): Promise<ProductPriceTypeDto | null>;

    abstract updateRecord(data: ProductPriceTypeDto): Promise<ProductPriceTypeDto>;

    abstract findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<ProductPriceTypeDto>>;

    abstract findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ProductPriceTypeDto>>;

    abstract deleteRecord(productPriceTypeDto: ProductPriceTypeDto): Promise<ProductPriceTypeDto>;

    abstract deleteAllRecords(): Promise<void>;

    abstract convertToDto(record: ProductPriceTypeDto): Promise<ProductPriceTypeDto>;

    abstract convertToDtoList(records: ProductPriceTypeDto[]): Promise<ProductPriceTypeDto[]>;
}
