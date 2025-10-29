import { AccountsDto, CreateAccountsDto, PageDto } from '@dto';
import { AccountsDataType } from '@dynamo-db-lib';

export abstract class AccountsDatabaseServiceAbstract {
    abstract createRecord(dto: CreateAccountsDto): Promise<AccountsDto>;

    abstract updateRecord(dto: AccountsDto): Promise<AccountsDto>;

    abstract findRecordById(id: string): Promise<AccountsDto | null>;

    abstract findRecordByName(name: string): Promise<AccountsDto | null>;

    abstract findRecordContainingName(
        limit: number,
        name: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<AccountsDto>>;

    abstract getDatabaseRecordById(recordId: string): Promise<AccountsDataType | undefined>;

    abstract findRecordsPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<AccountsDto>>;

    abstract findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<AccountsDto>>;

    abstract findRecordsByAccountTypePagination(
        limit: number,
        accountType: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<AccountsDto>>;

    abstract deleteRecord(dto: AccountsDto): Promise<AccountsDto>;

    abstract deleteAllRecords(): Promise<void>;

    abstract convertToDto(record: AccountsDataType): Promise<AccountsDto>;

    abstract convertToDtoList(records: AccountsDataType[]): Promise<AccountsDto[]>;

    abstract convertToDataType(dto: AccountsDto): Promise<AccountsDataType>;
}
