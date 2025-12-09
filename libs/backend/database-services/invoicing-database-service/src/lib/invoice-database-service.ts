import { CreateInvoiceDto, InvoiceDto, PageDto, PaymentStatusEnum, PrintStatusEnum, StatusEnum } from '@dto';
import {
    createDynamoDbOptionWithPKSKIndex,
    DynamoDbLibService,
    InvoiceDataType,
    InvoicingSchema,
    pageRecordHandler,
    TerritoryManagerDataType,
} from '@dynamo-db-lib';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'dynamodb-onetable';
import { InvoiceDatabaseServiceAbstract } from './invoice-database-service-abstract-class';

@Injectable()
export class InvoiceDatabaseService implements InvoiceDatabaseServiceAbstract {
    protected readonly logger = new Logger(InvoiceDatabaseService.name);

    private readonly invoiceTable: Model<InvoiceDataType>;

    constructor(private readonly configService: ConfigService) {
        const DYNAMO_DB_INVOICING_TABLE = configService.get<string>('DYNAMO_DB_INVOICING_TABLE');
        if (!DYNAMO_DB_INVOICING_TABLE) {
            throw new Error('DYNAMO_DB_INVOICING_TABLE is not defined in the configuration');
        }
        const dynamoDbService = new DynamoDbLibService(configService);
        this.invoiceTable = dynamoDbService
            .dynamoDbMainTable(DYNAMO_DB_INVOICING_TABLE, InvoicingSchema)
            .getModel('Invoice');
    }

    async createRecord(dto: CreateInvoiceDto): Promise<InvoiceDto> {
        const invoiceData: InvoiceDataType = {
            status: dto.status,
            docno: dto.docno,
            invoiceDate: dto.invoiceDate,
            customerId: dto.customerId,
            customerName: dto.customerName,
            areaId: dto.areaId,
            areaName: dto.areaName,
            territoryManagerId: dto.territoryManagerId,
            territoryManagerName: dto.territoryManagerName,
            salesTypeId: dto.salesTypeId,
            salesTypeName: dto.salesTypeName,
            finalAmount: dto.finalAmount,
            invoiceAmount: dto.invoiceAmount,
            taxAmount: dto.taxAmount,
            contractId: dto.contractId,
            contractName: dto.contractName,
            termsId: dto.termsId,
            termsName: dto.termsName,
            productPriceTypeId: dto.productPriceTypeId,
            productPriceTypeName: dto.productPriceTypeName,
            printStatus: dto.printStatus as PrintStatusEnum.PENDING,
            paymentStatus: dto.paymentStatus as PaymentStatusEnum.PENDING,
            invoiceDetails: dto.invoiceDetails,
            activityLogs: dto.activityLogs,
            contractSales: dto.contractSales,
            forApprovalVersion: dto.forApprovalVersion,
        };

        const createdRecord: InvoiceDataType = await this.invoiceTable.create(invoiceData);

        return await this.convertToDto(createdRecord);
    }

    async updateRecord(record: InvoiceDto): Promise<InvoiceDto> {
        const invoiceRecord: InvoiceDataType = await this.convertToDataType(record);

        // CRITICAL: Explicitly set changeReason on the record before calling update()
        // This ensures the field is persisted even if convertToDataType is called separately
        invoiceRecord.changeReason = record.changeReason;
        invoiceRecord.approverMessage = record.approverMessage;
        const updatedInvoiceRecord: InvoiceDataType = await this.invoiceTable.update(invoiceRecord);

        return await this.convertToDto(updatedInvoiceRecord);
    }

    async findRecordById(id: string): Promise<InvoiceDto | null> {
        const record = await this.invoiceTable.get({
            PK: `INVOICE`,
            SK: `${id}`,
        });

        if (!record) {
            return null;
        }

        return await this.convertToDto(record);
    }

    async deleteAllRecords(): Promise<void> {
        //get all the records
        const records = await this.invoiceTable.find(
            {
                GSI12PK: `INVOICE`,
            },
            {
                index: 'GSI12',
            }
        );

        for (const record of records) {
            await this.invoiceTable.remove(record);
        }
    }

    async findRecordContainingDocno(
        limit: number,
        docno: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<InvoiceDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI12', direction, cursorPointer);

        const records = await this.invoiceTable.find(
            {
                GSI12PK: `INVOICE`,
                GSI12SK: {
                    begins: docno,
                },
            },
            dynamoDbOption
        );

        const pageRecordCursorPointers = pageRecordHandler(
            records,
            limit,
            direction,
            'GSI12PK',
            'GSI12SK',
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

    async findRecordByDocno(docno: string): Promise<InvoiceDto | null> {
        const record = await this.invoiceTable.get(
            {
                GSI12PK: `INVOICE`,
                GSI12SK: `${docno}`,
            },
            {
                index: 'GSI12',
            }
        );

        if (!record) {
            return null;
        }

        return await this.convertToDto(record);
    }

    async findPendingPaymentInvoices(customerId: string, status: string): Promise<InvoiceDto[] | null> {
        const pendingPaymentInvoices = await this.invoiceTable.find(
            {
                GSI13PK: `INVOICE#${customerId}#${PaymentStatusEnum.PENDING}#${status}`,
            },
            {
                index: 'GSI13',
            }
        );

        const partialPaymentInvoices = await this.invoiceTable.find(
            {
                GSI13PK: `INVOICE#${customerId}#${PaymentStatusEnum.PARTIAL}#${status}`,
            },
            {
                index: 'GSI13',
            }
        );

        const pendingPaymentsDto = await this.convertToDtoList(pendingPaymentInvoices);
        const partialPaymentsDto = await this.convertToDtoList(partialPaymentInvoices);

        const records = pendingPaymentsDto.concat(partialPaymentsDto);

        return records;
    }

    async getDatabaseRecordById(recordId: string): Promise<InvoiceDataType | undefined> {
        const record: TerritoryManagerDataType | undefined = await this.invoiceTable.get({
            PK: 'INVOICE',
            SK: `${recordId}`,
        });

        this.logger.log(`Invoice Record returned: ${JSON.stringify(record)}`);

        return record;
    }

    async findRecordsByStatusPagination(
        limit: number,
        status: string,
        direction: string,
        cursorPointer: string,
        docno: string
    ): Promise<PageDto<InvoiceDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI2', direction, cursorPointer);

        const records = await this.invoiceTable.find(
            {
                GSI2PK: `INVOICE#${status}`,
                ...(docno != null ? { GSI2SK: { begins: docno } } : {}),
            },
            dynamoDbOption
        );

        const pageRecordCursorPointers = pageRecordHandler(
            records,
            limit,
            direction,
            'GSI2PK',
            'GSI2SK',
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
    ): Promise<PageDto<InvoiceDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI11', direction, cursorPointer);

        const records = await this.invoiceTable.find(
            {
                GSI11PK: `INVOICE`,
            },
            dynamoDbOption
        );

        const pageRecordCursorPointers = pageRecordHandler(
            records,
            limit,
            direction,
            'GSI11PK',
            'GSI11SK',
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

    async deleteRecord(dto: InvoiceDto): Promise<InvoiceDto> {
        const invoiceRecordData: InvoiceDataType = await this.convertToDataType(dto);

        await this.invoiceTable.remove(invoiceRecordData);

        this.logger.log(`Invoice Record hard deleted: ${JSON.stringify(invoiceRecordData)}`);

        return await this.convertToDto(invoiceRecordData);
    }

    async convertToDto(record: InvoiceDataType): Promise<InvoiceDto> {
        const dto = new InvoiceDto();
        dto.invoiceId = record.invoiceId ? record.invoiceId : '';
        dto.docno = record.docno ? record.docno : '';
        dto.invoiceDate = record.invoiceDate ? record.invoiceDate : '';
        dto.customerId = record.customerId ? record.customerId : '';
        dto.customerName = record.customerName ? record.customerName : '';
        dto.areaId = record.areaId ? record.areaId : '';
        dto.areaName = record.areaName ? record.areaName : '';
        dto.territoryManagerId = record.territoryManagerId ? record.territoryManagerId : '';
        dto.territoryManagerName = record.territoryManagerName ? record.territoryManagerName : '';
        dto.salesTypeId = record.salesTypeId ? record.salesTypeId : '';
        dto.salesTypeName = record.salesTypeName ? record.salesTypeName : '';
        dto.finalAmount = record.finalAmount ? record.finalAmount : 0;
        dto.invoiceAmount = record.invoiceAmount ? record.invoiceAmount : 0;
        dto.taxAmount = record.taxAmount ? record.taxAmount : 0;
        dto.contractId = record.contractId ? record.contractId : '';
        dto.contractName = record.contractName ? record.contractName : '';
        dto.termsId = record.termsId ? record.termsId : '';
        dto.termsName = record.termsName ? record.termsName : '';
        dto.productPriceTypeId = record.productPriceTypeId ? record.productPriceTypeId : '';
        dto.productPriceTypeName = record.productPriceTypeName ? record.productPriceTypeName : '';
        dto.status = record.status ? (record.status as StatusEnum) : StatusEnum.ACTIVE;
        dto.printStatus = record.printStatus
            ? (record.printStatus as PrintStatusEnum.PENDING)
            : PrintStatusEnum.PENDING;
        dto.paymentStatus = record.paymentStatus
            ? (record.paymentStatus as PaymentStatusEnum.PENDING)
            : PaymentStatusEnum.PENDING;
        dto.invoiceDetails = record.invoiceDetails ? record.invoiceDetails : [];
        dto.activityLogs = record.activityLogs ? record.activityLogs : [];
        dto.forApprovalVersion = record.forApprovalVersion ? record.forApprovalVersion : {};
        dto.changeReason = (record as InvoiceDataType & { changeReason?: string }).changeReason || undefined;
        dto.contractSales = record.contractSales ? record.contractSales : false;
        dto.approverMessage = record.approverMessage ? record.approverMessage : undefined;
        return dto;
    }

    async convertToDtoList(records: InvoiceDataType[]): Promise<InvoiceDto[]> {
        const dtoList: InvoiceDto[] = [];

        for (const record of records) {
            const dto: InvoiceDto = await this.convertToDto(record);

            dtoList.push(dto);
        }

        return dtoList;
    }

    async convertToDataType(dto: InvoiceDto): Promise<InvoiceDataType> {
        const invoiceData: InvoiceDataType = {
            invoiceId: dto.invoiceId,
            status: dto.status,
            docno: dto.docno,
            invoiceDate: dto.invoiceDate,
            customerId: dto.customerId,
            customerName: dto.customerName,
            areaId: dto.areaId,
            areaName: dto.areaName,
            territoryManagerId: dto.territoryManagerId,
            territoryManagerName: dto.territoryManagerName,
            salesTypeId: dto.salesTypeId,
            salesTypeName: dto.salesTypeName,
            finalAmount: dto.finalAmount,
            invoiceAmount: dto.invoiceAmount,
            taxAmount: dto.taxAmount,
            contractId: dto.contractId,
            contractName: dto.contractName,
            termsId: dto.termsId,
            termsName: dto.termsName,
            productPriceTypeId: dto.productPriceTypeId,
            productPriceTypeName: dto.productPriceTypeName,
            printStatus: dto.printStatus as PrintStatusEnum.PENDING,
            paymentStatus: dto.paymentStatus as PaymentStatusEnum.PENDING,
            invoiceDetails: dto.invoiceDetails,
            contractSales: dto.contractSales,
            GSI1PK: `INVOICE`,
            GSI1SK: dto.invoiceId,
            GSI2PK: `INVOICE#${dto.status}`,
            GSI2SK: dto.docno,
            GSI3PK: `INVOICE#${dto.customerId}`,
            GSI3SK: dto.invoiceDate,
            GSI4PK: `INVOICE#${dto.salesTypeId}`,
            GSI4SK: dto.invoiceDate,
            GSI5PK: `INVOICE#${dto.contractId}`,
            GSI5SK: dto.invoiceDate,
            GSI6PK: `INVOICE#${dto.termsId}`,
            GSI6SK: dto.invoiceDate,
            GSI7PK: `INVOICE#${dto.productPriceTypeId}`,
            GSI7SK: dto.invoiceDate,
            GSI8PK: `INVOICE#${dto.areaId}`,
            GSI8SK: dto.invoiceDate,
            GSI9PK: `INVOICE#${dto.territoryManagerId}`,
            GSI9SK: dto.invoiceDate,
            GSI10PK: `INVOICE#${dto.productPriceTypeId}`,
            GSI10SK: dto.invoiceDate,
            GSI11PK: `INVOICE`,
            GSI11SK: dto.invoiceDate,
            GSI12PK: `INVOICE`,
            GSI12SK: dto.docno,
            GSI13PK: `INVOICE#${dto.customerId}#${dto.paymentStatus}#${dto.status}`,
            GSI13SK: dto.docno,
            activityLogs: dto.activityLogs,
            forApprovalVersion: dto.forApprovalVersion,
            changeReason: dto.changeReason,
            approverMessage: dto.approverMessage,
        };
        return invoiceData;
    }
}
