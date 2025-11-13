import { CreateProductDto, PageDto, ProductDto, ProductFilterDto } from '@dto';
import { ProductDataType } from '@dynamo-db-lib';

export abstract class ProductDatabaseServiceAbstract {
    abstract createRecord(productDto: CreateProductDto): Promise<ProductDto>;

    abstract updateRecord(productDto: ProductDto): Promise<ProductDto>;

    abstract findRecordById(id: string): Promise<ProductDto | null>;

    abstract findRecordByName(name: string): Promise<ProductDto | null>;

    abstract findRecordContainingName(name: string): Promise<ProductDto[] | null>;

    abstract findRecordsByNamePagination(
        limit: number,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<ProductDto>>;

    abstract findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<ProductDto>>;

    abstract findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ProductDto>>;

    abstract findRecordsByFilterPagination(
        filter: ProductFilterDto,
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ProductDto>>;

    abstract deleteRecord(productDto: ProductDto): Promise<ProductDto>;

    abstract deleteAllRecords(): Promise<void>;

    abstract convertToDto(record: ProductDataType): Promise<ProductDto>;

    abstract convertToDtoList(records: ProductDataType[]): Promise<ProductDto[]>;

    abstract convertToDataType(dto: ProductDto): Promise<ProductDataType>;
}
