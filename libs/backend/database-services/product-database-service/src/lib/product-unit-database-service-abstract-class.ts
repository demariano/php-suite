import { CreateProductUnitDto, PageDto, ProductUnitDto } from '@dto';

export abstract class ProductUnitDatabaseServiceAbstract {
    abstract createRecord(productUnitDto: CreateProductUnitDto): Promise<ProductUnitDto>;

    abstract findRecordById(id: string): Promise<ProductUnitDto | null>;

    abstract findRecordContainingName(name: string): Promise<ProductUnitDto[] | null>;

    abstract findRecordByName(name: string): Promise<ProductUnitDto | null>;

    abstract updateRecord(productData: ProductUnitDto): Promise<ProductUnitDto>;

    abstract findRecordsPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ProductUnitDto>>;

    abstract deleteRecord(productUnitDto: ProductUnitDto): Promise<ProductUnitDto>;

    abstract convertToDto(record: ProductUnitDto): Promise<ProductUnitDto>;

    abstract convertToDtoList(records: ProductUnitDto[]): Promise<ProductUnitDto[]>;
}
