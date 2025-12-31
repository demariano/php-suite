import { CreateProductUnitRawMaterialDto, PageDto, ProductUnitRawMaterialDto } from '@dto';

export abstract class ProductUnitRawMaterialDatabaseServiceAbstract {
    abstract createRecord(
        productUnitRawMaterialDto: CreateProductUnitRawMaterialDto
    ): Promise<ProductUnitRawMaterialDto>;

    abstract findRecordById(id: string): Promise<ProductUnitRawMaterialDto | null>;

    abstract findRecordByProductId(productId: string): Promise<ProductUnitRawMaterialDto | null>;

    abstract updateRecord(productData: ProductUnitRawMaterialDto): Promise<ProductUnitRawMaterialDto>;

    abstract findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        productUnitId: string
    ): Promise<PageDto<ProductUnitRawMaterialDto>>;

    abstract findRecordsByProductUnitPagination(
        limit: number,
        productUnitId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ProductUnitRawMaterialDto>>;

    abstract findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ProductUnitRawMaterialDto>>;

    abstract deleteRecord(productUnitRawMaterialDto: ProductUnitRawMaterialDto): Promise<ProductUnitRawMaterialDto>;

    abstract deleteAllRecords(): Promise<void>;

    abstract convertToDto(record: ProductUnitRawMaterialDto): Promise<ProductUnitRawMaterialDto>;

    abstract convertToDtoList(records: ProductUnitRawMaterialDto[]): Promise<ProductUnitRawMaterialDto[]>;
}
