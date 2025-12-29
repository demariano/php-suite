import { CreateRawMaterialsStockDto, PageDto, RawMaterialsStockDto } from '@dto';

export abstract class RawMaterialsStockDatabaseServiceAbstract {
    abstract createRecord(rawMaterialsStockDto: CreateRawMaterialsStockDto): Promise<RawMaterialsStockDto>;

    abstract findRecordById(id: string): Promise<RawMaterialsStockDto | null>;

    abstract findRecordsByNamePagination(
        limit: number,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<RawMaterialsStockDto>>;

    abstract findRecordByName(name: string): Promise<RawMaterialsStockDto | null>;

    abstract findRecordByNameAndLotNo(name: string, lotNo?: string): Promise<RawMaterialsStockDto | null>;

    abstract updateRecord(rawMaterialsStockData: RawMaterialsStockDto): Promise<RawMaterialsStockDto>;

    abstract findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<RawMaterialsStockDto>>;

    abstract findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<RawMaterialsStockDto>>;

    abstract deleteRecord(rawMaterialsStockDto: RawMaterialsStockDto): Promise<RawMaterialsStockDto>;

    abstract convertToDto(record: RawMaterialsStockDto): Promise<RawMaterialsStockDto>;

    abstract convertToDtoList(records: RawMaterialsStockDto[]): Promise<RawMaterialsStockDto[]>;

    abstract deleteAllRecords(): Promise<void>;
}
