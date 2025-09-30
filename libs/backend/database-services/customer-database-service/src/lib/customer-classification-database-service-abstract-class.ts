import { CreateCustomerClassificationDto, CustomerClassificationDto, PageDto } from '@dto';

export abstract class CustomerClassificationDatabaseServiceAbstract {
    abstract createRecord(
        customerClassificationDto: CreateCustomerClassificationDto
    ): Promise<CustomerClassificationDto>;

    abstract findRecordById(id: string): Promise<CustomerClassificationDto | null>;

    abstract findRecordContainingName(name: string): Promise<CustomerClassificationDto[] | null>;

    abstract findRecordByName(name: string): Promise<CustomerClassificationDto | null>;

    abstract updateRecord(customerClassificationData: CustomerClassificationDto): Promise<CustomerClassificationDto>;

    abstract findRecordsPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<CustomerClassificationDto>>;

    abstract deleteRecord(customerClassificationDto: CustomerClassificationDto): Promise<CustomerClassificationDto>;

    abstract convertToDto(record: CustomerClassificationDto): Promise<CustomerClassificationDto>;

    abstract convertToDtoList(records: CustomerClassificationDto[]): Promise<CustomerClassificationDto[]>;

    abstract deleteAllRecords(): Promise<void>;
}
