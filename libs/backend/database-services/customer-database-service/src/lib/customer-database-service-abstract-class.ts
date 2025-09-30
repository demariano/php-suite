import { CreateCustomerDto, CustomerDto, CustomerFilterDto, PageDto } from '@dto';

export abstract class CustomerDatabaseServiceAbstract {
    abstract createRecord(customerDto: CreateCustomerDto): Promise<CustomerDto>;

    abstract findRecordById(id: string): Promise<CustomerDto | null>;

    abstract findRecordContainingName(name: string): Promise<CustomerDto[] | null>;

    abstract findRecordByName(name: string): Promise<CustomerDto | null>;

    abstract updateRecord(customerData: CustomerDto): Promise<CustomerDto>;

    abstract findRecordsPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<CustomerDto>>;

    abstract findCustomerRecordsByFilterPagination(
        filter: CustomerFilterDto,
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<CustomerDto>>;

    // Separate functions for getting all customers by specific criteria without pagination
    abstract findAllCustomersByClassificationId(customerClassificationId: string): Promise<CustomerDto[]>;

    abstract findAllCustomersByTypeId(customerTypeId: string): Promise<CustomerDto[]>;

    abstract findAllCustomersByAreaId(areaId: string): Promise<CustomerDto[]>;

    abstract findAllCustomersByTownId(townId: string): Promise<CustomerDto[]>;

    abstract deleteRecord(customerDto: CustomerDto): Promise<CustomerDto>;

    abstract convertToDto(record: CustomerDto): Promise<CustomerDto>;

    abstract convertToDtoList(records: CustomerDto[]): Promise<CustomerDto[]>;

    abstract deleteAllRecords(): Promise<void>;
}
