import { CreateProductClassDto, PageDto, ProductClassDto } from '@dto';

export abstract class ProductClassDatabaseServiceAbstract {
    abstract createRecord(productClassDto: CreateProductClassDto): Promise<ProductClassDto>;

    abstract findRecordById(id: string): Promise<ProductClassDto | null>;

    abstract findRecordContainingName(
        limit: number,
        name: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ProductClassDto>>;

    abstract findRecordByName(name: string): Promise<ProductClassDto | null>;

    abstract updateRecord(productData: ProductClassDto): Promise<ProductClassDto>;

    abstract findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<ProductClassDto>>;

    abstract findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ProductClassDto>>;

    abstract deleteRecord(productClassDto: ProductClassDto): Promise<ProductClassDto>;

    abstract deleteAllRecords(): Promise<void>;

    abstract convertToDto(record: ProductClassDto): Promise<ProductClassDto>;

    abstract convertToDtoList(records: ProductClassDto[]): Promise<ProductClassDto[]>;
}
