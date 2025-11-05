import { CreateVoucherDto, PageDto, VoucherDto } from '@dto';
import { VoucherDataType } from '@dynamo-db-lib';

export abstract class VoucherDatabaseServiceAbstract {
    abstract createRecord(dto: CreateVoucherDto): Promise<VoucherDto>;

    abstract updateRecord(dto: VoucherDto): Promise<VoucherDto>;

    abstract findRecordById(id: string): Promise<VoucherDto | null>;

    abstract findRecordByVoucherNo(voucherNo: string): Promise<VoucherDto | null>;

    abstract findRecordContainingVoucherNo(
        limit: number,
        voucherNo: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<VoucherDto>>;

    abstract getDatabaseRecordById(recordId: string): Promise<VoucherDataType | undefined>;

    abstract findRecordsPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<VoucherDto>>;

    abstract findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        voucherNo: string
    ): Promise<PageDto<VoucherDto>>;

    abstract findRecordsByVoucherDatePagination(
        limit: number,
        voucherDate: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<VoucherDto>>;

    abstract deleteRecord(dto: VoucherDto): Promise<VoucherDto>;

    abstract deleteAllRecords(): Promise<void>;

    abstract convertToDto(record: VoucherDataType): Promise<VoucherDto>;

    abstract convertToDtoList(records: VoucherDataType[]): Promise<VoucherDto[]>;

    abstract convertToDataType(dto: VoucherDto): Promise<VoucherDataType>;
}
