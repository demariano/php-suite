import { ContractDto, ContractPaymentDto, CreateContractDto, PageDto } from '@dto';
import { ContractDataType } from '@dynamo-db-lib';

export abstract class ContractDatabaseServiceAbstract {
    abstract createRecord(contractDto: CreateContractDto): Promise<ContractDto>;

    abstract findRecordById(id: string): Promise<ContractDto | null>;

    abstract findRecordByCustomerId(
        limit: number,
        customerId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ContractDto>>;

    abstract findRecordByAreaId(
        limit: number,
        areaId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ContractDto>>;

    abstract getContractCountByAreaId(areaId: string): Promise<number>;

    abstract findRecordByContractNo(contractNo: string): Promise<ContractDto | null>;

    abstract findPendingPaymentContracts(customerId: string): Promise<ContractDto[] | null>;

    abstract findRecordContainingContractNo(
        limit: number,
        contractNo: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ContractDto>>;

    abstract updateRecord(contractData: ContractDto): Promise<ContractDto>;

    abstract findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        customerId: string
    ): Promise<PageDto<ContractDto>>;

    abstract findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ContractDto>>;

    abstract deleteRecord(contractDto: ContractDto): Promise<ContractDto>;

    abstract convertToDto(record: ContractDataType): Promise<ContractDto>;

    abstract convertToDtoList(records: ContractDataType[]): Promise<ContractDto[]>;

    abstract convertToDataType(dto: ContractDto): Promise<ContractDataType>;

    abstract deleteAllRecords(): Promise<void>;

    abstract addPaymentToContract(contractId: string, payment: ContractPaymentDto): Promise<ContractDto>;

    abstract removePaymentFromContract(contractId: string, paymentId: string): Promise<ContractDto>;

    abstract updatePaymentInContract(
        contractId: string,
        paymentId: string,
        updatedPayment: ContractPaymentDto
    ): Promise<ContractDto>;

    abstract updateInvoicedAmount(contractId: string, invoicedAmount: number): Promise<ContractDto>;

    abstract batchUpdateRecords(contracts: ContractDto[]): Promise<void>;
}
