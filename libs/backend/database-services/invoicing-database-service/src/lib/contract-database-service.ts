import {
    ContractDto,
    CreateContractDto,
    DeliveryStatusEnum,
    PageDto,
    PaymentStatusEnum,
    ProductDealQtyDto,
    StatusEnum,
} from '@dto';
import {
    ContractDataType,
    createDynamoDbOptionWithPKSKIndex,
    DynamoDbLibService,
    InvoicingSchema,
    pageRecordHandler,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';

import { ContractDatabaseServiceAbstract } from './contract-database-service-abstract-class';

@Injectable()
export class ContractDatabaseService implements ContractDatabaseServiceAbstract {
    protected readonly logger = new Logger(ContractDatabaseService.name);

    private readonly contractTable: Model<ContractDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_INVOICING_TABLE = configService.get<string>('DYNAMO_DB_INVOICING_TABLE');
        if (!DYNAMO_DB_INVOICING_TABLE) {
            throw new Error('DYNAMO_DB_INVOICING_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.contractTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_INVOICING_TABLE, InvoicingSchema)
            .getModel('Contract');
    }

    async createRecord(contractDto: CreateContractDto): Promise<ContractDto> {
        const contractData: ContractDataType = {
            status: contractDto.status,
            contractNo: contractDto.contractNo,
            contractName: contractDto.contractName,
            customerId: contractDto.customerId,
            customerName: contractDto.customerName,
            startDate: contractDto.startDate,
            endDate: contractDto.endDate,
            contractAmount: contractDto.contractAmount,
            amountPaid: contractDto.amountPaid,
            productDealId: contractDto.productDealId,
            productDealName: contractDto.productDealName,
            deliveryStatus: contractDto.deliveryStatus,
            paymentStatus: contractDto.paymentStatus,
            deliveredAmount: contractDto.deliveredAmount,
            changeReason: contractDto.changeReason,
            activityLogs: contractDto.activityLogs,
            forApprovalVersion: contractDto.forApprovalVersion,
            productDealQty: contractDto.productDealQty,
            rebatePercentage: contractDto.rebatePercentage,
            rebateType: contractDto.rebateType,
            rebateAmount: contractDto.rebateAmount,
            rebateClaimedAmount: contractDto.rebateClaimedAmount,
            rebateClaimedStatus: contractDto.rebateClaimedStatus,
            GSI1PK: `CONTRACT`,
            GSI1SK: contractDto.contractNo,
            GSI2PK: `CONTRACT#${contractDto.status}`,
            GSI2SK: contractDto.contractNo,
            GSI3PK: `CONTRACT#${contractDto.customerId}`,
            GSI3SK: contractDto.contractNo,
            GSI4PK: `CONTRACT#${contractDto.customerId}#${contractDto.status}`,
            GSI4SK: contractDto.contractNo,
            GSI5PK: `CONTRACT#${contractDto.customerId}#${contractDto.paymentStatus}`,
            GSI5SK: contractDto.contractNo,
        };

        const contractRecord: ContractDataType = await this.contractTable.create(contractData);

        return await this.convertToDto(contractRecord);
    }

    async updateRecord(record: ContractDto): Promise<ContractDto> {
        const contractRecord: ContractDataType = await this.convertToDataType(record);
        contractRecord.changeReason = record.changeReason;
        contractRecord.approverMessage = record.approverMessage;

        const updatedContractRecord: ContractDataType = await this.contractTable.update(contractRecord);

        return await this.convertToDto(updatedContractRecord);
    }

    async findRecordById(id: string): Promise<ContractDto | null> {
        const contractRecord = await this.contractTable.get({
            PK: `CONTRACT`,
            SK: `${id}`,
        });

        if (!contractRecord) {
            return null;
        }

        return await this.convertToDto(contractRecord);
    }

    async deleteAllRecords(): Promise<void> {
        //get all the records
        const records = await this.contractTable.find(
            {
                GSI1PK: `CONTRACT`,
            },
            {
                index: 'GSI1',
            }
        );

        for (const record of records) {
            await this.contractTable.remove(record);
        }
    }

    async findRecordByCustomerId(
        limit: number,
        customerId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ContractDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI3', direction, cursorPointer);

        const records = await this.contractTable.find(
            {
                GSI3PK: `CONTRACT#${customerId}`,
            },
            dynamoDbOption
        );

        const pageRecordCursorPointers = pageRecordHandler(
            records,
            limit,
            direction,
            'GSI3PK',
            'GSI3SK',
            'PK',
            'SK',
            JSON.stringify(records.next),
            JSON.stringify(records.prev)
        );

        return new PageDto(
            await this.convertToDtoList(records),
            pageRecordCursorPointers.nextCursorPointer,
            pageRecordCursorPointers.prevCursorPointer
        );
    }

    async findRecordByContractNo(contractNo: string): Promise<ContractDto | null> {
        const record = await this.contractTable.get(
            {
                GSI1PK: `CONTRACT`,
                GSI1SK: `${contractNo}`,
            },
            {
                index: 'GSI1',
            }
        );

        if (!record) {
            return null;
        }

        return await this.convertToDto(record);
    }

    async findPendingPaymentContracts(customerId: string): Promise<ContractDto[] | null> {
        const pendingPaymentContracts = await this.contractTable.find(
            {
                GSI5PK: `CONTRACT#${customerId}#${PaymentStatusEnum.PENDING}`,
            },
            {
                index: 'GSI5',
            }
        );

        const partialPaymentContracts = await this.contractTable.find(
            {
                GSI5PK: `CONTRACT#${customerId}#${PaymentStatusEnum.PARTIAL}`,
            },
            {
                index: 'GSI5',
            }
        );

        const pendingContractsDto = await this.convertToDtoList(pendingPaymentContracts);
        const partialContractsDto = await this.convertToDtoList(partialPaymentContracts);
        const records = pendingContractsDto.concat(partialContractsDto);
        return records;
    }

    async findRecordContainingContractNo(
        limit: number,
        contractNo: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ContractDto>> {
        limit = Number(limit);

        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.contractTable.find(
            {
                GSI1PK: `CONTRACT`,
                GSI1SK: {
                    begins: contractNo,
                },
            },
            dynamoDbOption
        );

        const pageRecordCursorPointers = pageRecordHandler(
            records,
            limit,
            direction,
            'GSI1PK',
            'GSI1SK',
            'PK',
            'SK',
            JSON.stringify(records.next),
            JSON.stringify(records.prev)
        );

        return new PageDto(
            await this.convertToDtoList(records),
            pageRecordCursorPointers.nextCursorPointer,
            pageRecordCursorPointers.prevCursorPointer
        );
    }

    async getDatabaseRecordById(recordId: string): Promise<ContractDataType | undefined> {
        const record: ContractDataType | undefined = await this.contractTable.get({
            PK: 'CONTRACT',
            SK: `${recordId}`,
        });

        return record;
    }

    async findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        customerId: string
    ): Promise<PageDto<ContractDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI4', direction, cursorPointer);

        const records = await this.contractTable.find(
            {
                GSI4PK: `CONTRACT#${customerId}#${status}`,
            },
            dynamoDbOption
        );

        const pageRecordCursorPointers = pageRecordHandler(
            records,
            limit,
            direction,
            'GSI4PK',
            'GSI4SK',
            'PK',
            'SK',
            JSON.stringify(records.next),
            JSON.stringify(records.prev)
        );

        return new PageDto(
            await this.convertToDtoList(records),
            pageRecordCursorPointers.nextCursorPointer,
            pageRecordCursorPointers.prevCursorPointer
        );
    }

    async findRecordsByPagination(
        limit: number,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<ContractDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI1', direction, cursorPointer);

        const records = await this.contractTable.find(
            {
                GSI1PK: `CONTRACT`,
            },
            dynamoDbOption
        );

        const pageRecordCursorPointers = pageRecordHandler(
            records,
            limit,
            direction,
            'GSI1PK',
            'GSI1SK',
            'PK',
            'SK',
            JSON.stringify(records.next),
            JSON.stringify(records.prev)
        );

        return new PageDto(
            await this.convertToDtoList(records),
            pageRecordCursorPointers.nextCursorPointer,
            pageRecordCursorPointers.prevCursorPointer
        );
    }

    async deleteRecord(dto: ContractDto): Promise<ContractDto> {
        const contractRecord: ContractDataType = await this.convertToDataType(dto);

        await this.contractTable.remove(contractRecord);

        this.logger.log(`Contract Record hard deleted: ${JSON.stringify(contractRecord)}`);

        return await this.convertToDto(contractRecord);
    }

    async convertToDto(record: ContractDataType): Promise<ContractDto> {
        const dto = new ContractDto();
        dto.contractId = record.contractId ? record.contractId : '';
        dto.contractNo = record.contractNo ? record.contractNo : '';
        dto.contractName = record.contractName ? record.contractName : '';
        dto.customerId = record.customerId ? record.customerId : '';
        dto.customerName = record.customerName ? record.customerName : '';
        dto.startDate = record.startDate ? record.startDate : '';
        dto.endDate = record.endDate ? record.endDate : '';
        dto.contractAmount = record.contractAmount ? record.contractAmount : 0;
        dto.amountPaid = record.amountPaid ? record.amountPaid : 0;
        dto.productDealId = record.productDealId ? record.productDealId : '';
        dto.productDealName = record.productDealName ? record.productDealName : '';
        dto.deliveryStatus = record.deliveryStatus as DeliveryStatusEnum;
        dto.paymentStatus = record.paymentStatus as PaymentStatusEnum;
        dto.deliveredAmount = record.deliveredAmount ? record.deliveredAmount : 0;
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : {};
        dto.invoicedAmount = record.invoicedAmount ? record.invoicedAmount : 0;
        dto.status = record.status as StatusEnum;
        dto.changeReason = (record as ContractDataType & { changeReason?: string }).changeReason || undefined;
        dto.productDealQty = record.productDealQty as ProductDealQtyDto;
        dto.approverMessage = record.approverMessage ? record.approverMessage : undefined;
        dto.rebatePercentage = record.rebatePercentage ? record.rebatePercentage : undefined;
        dto.rebateType = record.rebateType ? (record.rebateType as any) : undefined;
        dto.rebateAmount = record.rebateAmount ? record.rebateAmount : undefined;
        dto.rebateClaimedAmount = record.rebateClaimedAmount ? record.rebateClaimedAmount : undefined;
        dto.rebateClaimedStatus = record.rebateClaimedStatus ? (record.rebateClaimedStatus as any) : undefined;
        return dto;
    }

    async convertToDtoList(records: ContractDataType[]): Promise<ContractDto[]> {
        const dtoList: ContractDto[] = [];

        for (const record of records) {
            const dto: ContractDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDataType(dto: ContractDto): Promise<ContractDataType> {
        const contractData: ContractDataType = {
            contractId: dto.contractId,
            contractNo: dto.contractNo,
            contractName: dto.contractName,
            customerId: dto.customerId,
            customerName: dto.customerName,
            startDate: dto.startDate,
            endDate: dto.endDate,
            contractAmount: dto.contractAmount,
            amountPaid: dto.amountPaid,
            productDealId: dto.productDealId,
            productDealName: dto.productDealName,
            deliveryStatus: dto.deliveryStatus,
            paymentStatus: dto.paymentStatus,
            deliveredAmount: dto.deliveredAmount,
            activityLogs: dto.activityLogs,
            forApprovalVersion: dto.forApprovalVersion,
            invoicedAmount: dto.invoicedAmount,
            changeReason: dto.changeReason,
            status: dto.status as StatusEnum,
            productDealQty: dto.productDealQty,
            GSI1PK: `CONTRACT`,
            GSI1SK: dto.contractNo,
            GSI2PK: `CONTRACT#${dto.status}`,
            GSI2SK: dto.contractNo,
            GSI3PK: `CONTRACT#${dto.customerId}`,
            GSI3SK: dto.contractNo,
            GSI4PK: `CONTRACT#${dto.customerId}#${dto.status}`,
            GSI4SK: dto.contractNo,
            GSI5PK: `CONTRACT#${dto.customerId}#${dto.paymentStatus}`,
            GSI5SK: dto.contractNo,
            approverMessage: dto.approverMessage,
            rebatePercentage: dto.rebatePercentage,
            rebateType: dto.rebateType,
            rebateAmount: dto.rebateAmount,
            rebateClaimedAmount: dto.rebateClaimedAmount,
            rebateClaimedStatus: dto.rebateClaimedStatus,
        };
        return contractData;
    }
}
