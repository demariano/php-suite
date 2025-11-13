import { CreateCustomerTypeDto, CustomerTypeDto, PageDto } from '@dto';

export abstract class CustomerTypeDatabaseServiceAbstract {
    abstract createRecord(customerTypeDto: CreateCustomerTypeDto): Promise<CustomerTypeDto>;

    abstract findRecordById(id: string): Promise<CustomerTypeDto | null>;

    abstract findRecordsByNamePagination(
        limit: number,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<CustomerTypeDto>>;

    abstract findRecordByName(name: string): Promise<CustomerTypeDto | null>;

    abstract updateRecord(customerTypeData: CustomerTypeDto): Promise<CustomerTypeDto>;

    abstract findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        name: string
    ): Promise<PageDto<CustomerTypeDto>>;

    abstract findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<CustomerTypeDto>>;

    abstract deleteRecord(customerTypeDto: CustomerTypeDto): Promise<CustomerTypeDto>;

    abstract convertToDto(record: CustomerTypeDto): Promise<CustomerTypeDto>;

    abstract convertToDtoList(records: CustomerTypeDto[]): Promise<CustomerTypeDto[]>;

    abstract deleteAllRecords(): Promise<void>;
}
