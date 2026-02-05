import { CreateRawMaterialsPurchaseOrderDto, PageDto, RawMaterialsPurchaseOrderDto } from '@dto';
import { RawMaterialsPurchaseOrderDataType } from '@dynamo-db-lib';

export abstract class RawMaterialsPurchaseOrderDatabaseServiceAbstract {
    abstract createRecord(
        rawMaterialsPurchaseOrderDto: CreateRawMaterialsPurchaseOrderDto
    ): Promise<RawMaterialsPurchaseOrderDto>;

    abstract findRecordById(id: string): Promise<RawMaterialsPurchaseOrderDto | null>;

    abstract findRecordByDocNo(docNo: string): Promise<RawMaterialsPurchaseOrderDto | null>;

    abstract findRecordsByStatusPagination(
        limit: number,
        poStatus: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<RawMaterialsPurchaseOrderDto>>;

    abstract findRecordsByApprovalStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name?: string
    ): Promise<PageDto<RawMaterialsPurchaseOrderDto>>;

    abstract findRecordsBySupplierPagination(
        limit: number,
        supplierId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<RawMaterialsPurchaseOrderDto>>;

    abstract findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<RawMaterialsPurchaseOrderDto>>;

    abstract updateRecord(
        rawMaterialsPurchaseOrderData: RawMaterialsPurchaseOrderDto
    ): Promise<RawMaterialsPurchaseOrderDto>;

    abstract deleteRecord(
        rawMaterialsPurchaseOrderDto: RawMaterialsPurchaseOrderDto
    ): Promise<RawMaterialsPurchaseOrderDto>;

    abstract deleteAllRecords(): Promise<void>;

    abstract convertToDto(record: RawMaterialsPurchaseOrderDataType): Promise<RawMaterialsPurchaseOrderDto>;

    abstract convertToDtoList(records: RawMaterialsPurchaseOrderDataType[]): Promise<RawMaterialsPurchaseOrderDto[]>;

    abstract convertToDataType(dto: RawMaterialsPurchaseOrderDto): Promise<RawMaterialsPurchaseOrderDataType>;

    abstract batchUpdate(records: RawMaterialsPurchaseOrderDto[]): Promise<void>;

    abstract findRecordsByRawMaterialSupplierIdPagination(
        limit: number,
        rawMaterialId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<RawMaterialsPurchaseOrderDto>>;
}
