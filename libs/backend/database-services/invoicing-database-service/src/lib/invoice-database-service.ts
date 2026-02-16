import {
    CreateInvoiceDto,
    InvoiceDto,
    InvoicePaymentDto,
    PageDto,
    PaymentStatusEnum,
    PrintStatusEnum,
    StatusEnum,
} from '@dto';
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
            overPaymentAmount: dto.overPaymentAmount,
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

    async findRecordsByContractId(contractId: string): Promise<InvoiceDto[] | null> {
        const contractInvoices = await this.invoiceTable.find(
            {
                GSI5PK: `INVOICE#${contractId}`,
            },
            {
                index: 'GSI5',
            }
        );

        return await this.convertToDtoList(contractInvoices);
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

    async getInvoiceCount(): Promise<number> {
        let totalCount = 0;
        let cursorPointer: string | undefined = undefined;
        const limit = 1000; // Large limit to minimize pagination calls

        do {
            // For first call, don't pass direction/cursor. For subsequent calls, use 'next' direction
            const dynamoDbOption = cursorPointer
                ? createDynamoDbOptionWithPKSKIndex(limit, 'GSI12', 'next', cursorPointer)
                : {
                      limit: limit + 1,
                      follow: true,
                      index: 'GSI12',
                  };

            // Only fetch invoiceId field to minimize data transfer - we only need to count records
            const records = await this.invoiceTable.find(
                {
                    GSI12PK: `INVOICE`,
                },
                {
                    ...dynamoDbOption,
                    fields: ['invoiceId'], // Only return minimal field needed for counting
                }
            );

            totalCount += records.length;
            cursorPointer = records.next ? JSON.stringify(records.next) : undefined;
        } while (cursorPointer);

        return totalCount;
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

    async findPendingPaymentInvoices(
        customerId: string,
        status: string,
        contractId?: string,
        nonContractOnly?: boolean
    ): Promise<InvoiceDto[] | null> {
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

        // Filter on raw database records BEFORE DTO conversion to avoid conversion side effects
        let filteredPendingInvoices = pendingPaymentInvoices;
        let filteredPartialInvoices = partialPaymentInvoices;

        // Log filter parameters for debugging
        this.logger.log(
            `Filtering invoices - contractId: ${
                contractId || 'none'
            }, nonContractOnly: ${nonContractOnly}, type: ${typeof nonContractOnly}`
        );

        // Filter by contractId if provided (for CONTRACT_PER_INVOICE payments)
        // Only filter by contractId if it's a non-empty string
        if (contractId && typeof contractId === 'string' && contractId.trim() !== '') {
            filteredPendingInvoices = pendingPaymentInvoices.filter((invoice: InvoiceDataType) => {
                const invoiceContractId = invoice.contractId;
                return (
                    invoiceContractId === contractId ||
                    (invoiceContractId && invoiceContractId.toString().trim() === contractId.trim())
                );
            });
            filteredPartialInvoices = partialPaymentInvoices.filter((invoice: InvoiceDataType) => {
                const invoiceContractId = invoice.contractId;
                return (
                    invoiceContractId === contractId ||
                    (invoiceContractId && invoiceContractId.toString().trim() === contractId.trim())
                );
            });
        }
        // Filter for non-contract invoices if nonContractOnly is true (for non-contract payments)
        // Only include invoices that do NOT have a contractId (null, undefined, or empty string)
        // Also check contractSales field - if true, invoice is associated with a contract
        else if (nonContractOnly === true) {
            this.logger.log(
                `Filtering for non-contract invoices. Pending: ${pendingPaymentInvoices.length}, Partial: ${partialPaymentInvoices.length}`
            );

            // Helper function to check if invoice has a contract
            const hasContract = (invoice: InvoiceDataType): boolean => {
                // Check contractSales field - if true, invoice is definitely associated with a contract
                if (invoice.contractSales === true) {
                    this.logger.debug(
                        `Invoice ${invoice.invoiceId} has contractSales=true, excluding from non-contract results`
                    );
                    return true;
                }

                // Check contractId field
                const invoiceContractId = invoice.contractId;

                // If contractId is null or undefined, no contract
                if (invoiceContractId === null || invoiceContractId === undefined) {
                    return false;
                }

                // If contractId is a string, check if it's non-empty after trimming
                if (typeof invoiceContractId === 'string') {
                    const trimmedContractId = invoiceContractId.trim();
                    // If contractId is non-empty, invoice has a contract
                    if (trimmedContractId !== '') {
                        this.logger.debug(
                            `Invoice ${invoice.invoiceId} has contractId="${trimmedContractId}", excluding from non-contract results`
                        );
                        return true;
                    }
                }

                // If contractId exists and is not null/undefined/empty string, it has a contract
                if (invoiceContractId) {
                    this.logger.debug(
                        `Invoice ${invoice.invoiceId} has contractId="${invoiceContractId}", excluding from non-contract results`
                    );
                    return true;
                }

                // No contract found
                return false;
            };

            // Filter out any invoice that has a contract (keep only invoices without contracts)
            filteredPendingInvoices = pendingPaymentInvoices.filter(
                (invoice: InvoiceDataType) => !hasContract(invoice)
            );
            filteredPartialInvoices = partialPaymentInvoices.filter(
                (invoice: InvoiceDataType) => !hasContract(invoice)
            );

            this.logger.log(
                `After filtering: Pending: ${filteredPendingInvoices.length}, Partial: ${filteredPartialInvoices.length}`
            );
        }

        // Convert filtered records to DTOs
        const pendingPaymentsDto = await this.convertToDtoList(filteredPendingInvoices);
        const partialPaymentsDto = await this.convertToDtoList(filteredPartialInvoices);

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
        dto.payments = record.payments ? record.payments : [];
        dto.totalAmountPaid = record.totalAmountPaid ? record.totalAmountPaid : 0;
        dto.overPaymentAmount = record.overPaymentAmount ? record.overPaymentAmount : 0;
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
            payments: dto.payments,
            totalAmountPaid: dto.totalAmountPaid,
            overPaymentAmount: dto.overPaymentAmount,
        };
        return invoiceData;
    }

    /**
     * Adds a payment to an invoice's payments array
     */
    async addPaymentToInvoice(invoiceId: string, payment: InvoicePaymentDto): Promise<InvoiceDto> {
        const invoice = await this.findRecordById(invoiceId);
        if (!invoice) {
            throw new Error(`Invoice not found: ${invoiceId}`);
        }

        // Initialize payments array if it doesn't exist
        if (!invoice.payments) {
            invoice.payments = [];
        }

        // Add the new payment
        invoice.payments.push(payment);

        // Update the record
        return await this.updateRecord(invoice);
    }

    /**
     * Removes a payment from an invoice's payments array
     */
    async removePaymentFromInvoice(invoiceId: string, paymentId: string): Promise<InvoiceDto> {
        const invoice = await this.findRecordById(invoiceId);
        if (!invoice) {
            throw new Error(`Invoice not found: ${invoiceId}`);
        }

        // Remove the payment from the array
        if (invoice.payments && invoice.payments.length > 0) {
            invoice.payments = invoice.payments.filter((p) => p.paymentId !== paymentId);
        }

        // Update the record
        return await this.updateRecord(invoice);
    }

    /**
     * Updates a payment in an invoice's payments array
     */
    async updatePaymentInInvoice(
        invoiceId: string,
        paymentId: string,
        updatedPayment: InvoicePaymentDto
    ): Promise<InvoiceDto> {
        const invoice = await this.findRecordById(invoiceId);
        if (!invoice) {
            throw new Error(`Invoice not found: ${invoiceId}`);
        }

        // Find and update the payment in the array
        if (invoice.payments && invoice.payments.length > 0) {
            const paymentIndex = invoice.payments.findIndex((p) => p.paymentId === paymentId);
            if (paymentIndex !== -1) {
                invoice.payments[paymentIndex] = updatedPayment;
            } else {
                throw new Error(`Payment not found in invoice: ${paymentId}`);
            }
        } else {
            throw new Error(`No payments found in invoice: ${invoiceId}`);
        }

        // Update the record
        return await this.updateRecord(invoice);
    }

    /**
     * Find all invoices by customerId with pagination
     * Used for syncing customer name changes across all invoices
     */
    async findRecordsByCustomerIdPagination(
        limit: number,
        customerId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<InvoiceDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI3', direction, cursorPointer);

        const records = await this.invoiceTable.find(
            {
                GSI3PK: `INVOICE#${customerId}`,
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

    /**
     * Find invoices by areaId with pagination
     * Used for syncing area name changes across all invoices
     */
    async findRecordsByAreaIdPagination(
        limit: number,
        areaId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<InvoiceDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI8', direction, cursorPointer);

        const records = await this.invoiceTable.find(
            {
                GSI8PK: `INVOICE#${areaId}`,
            },
            dynamoDbOption
        );

        const pageRecordCursorPointers = pageRecordHandler(
            records,
            limit,
            direction,
            'GSI8PK',
            'GSI8SK',
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

    /**
     * Find invoices by territory manager ID with pagination (for territory manager sync)
     * Uses GSI9: INVOICE#${territoryManagerId}
     */
    async findRecordsByTerritoryManagerIdPagination(
        limit: number,
        territoryManagerId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<InvoiceDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI9', direction, cursorPointer);

        const records = await this.invoiceTable.find(
            {
                GSI9PK: `INVOICE#${territoryManagerId}`,
            },
            dynamoDbOption
        );

        const pageRecordCursorPointers = pageRecordHandler(
            records,
            limit,
            direction,
            'GSI9PK',
            'GSI9SK',
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

    /**
     * Find invoices by sales type ID with pagination (for sales type sync)
     * Uses GSI4: INVOICE#${salesTypeId}
     */
    async findRecordsBySalesTypeIdPagination(
        limit: number,
        salesTypeId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<InvoiceDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI4', direction, cursorPointer);

        const records = await this.invoiceTable.find(
            {
                GSI4PK: `INVOICE#${salesTypeId}`,
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

    /**
     * Find invoices by contractId with pagination (for contract name sync)
     * Uses GSI5: INVOICE#${contractId}
     */
    async findRecordsByContractIdPagination(
        limit: number,
        contractId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<InvoiceDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI5', direction, cursorPointer);

        const records = await this.invoiceTable.find(
            {
                GSI5PK: `INVOICE#${contractId}`,
            },
            dynamoDbOption
        );

        const pageRecordCursorPointers = pageRecordHandler(
            records,
            limit,
            direction,
            'GSI5PK',
            'GSI5SK',
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

    /**
     * Find invoices by termsId with pagination (for terms name sync)
     * Uses GSI6: INVOICE#${termsId}
     */
    async findRecordsByTermsIdPagination(
        limit: number,
        termsId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<InvoiceDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI6', direction, cursorPointer);

        const records = await this.invoiceTable.find(
            {
                GSI6PK: `INVOICE#${termsId}`,
            },
            dynamoDbOption
        );

        const pageRecordCursorPointers = pageRecordHandler(
            records,
            limit,
            direction,
            'GSI6PK',
            'GSI6SK',
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

    /**
     * Finds invoice records by productPriceTypeId with pagination
     * Uses GSI7: INVOICE#${productPriceTypeId}
     */
    async findRecordsByProductPriceTypeIdPagination(
        limit: number,
        productPriceTypeId: string,
        direction: string,
        cursorPointer: string
    ): Promise<PageDto<InvoiceDto>> {
        limit = Number(limit);
        const dynamoDbOption = createDynamoDbOptionWithPKSKIndex(limit, 'GSI7', direction, cursorPointer);

        const records = await this.invoiceTable.find(
            {
                GSI7PK: `INVOICE#${productPriceTypeId}`,
            },
            dynamoDbOption
        );

        const pageRecordCursorPointers = pageRecordHandler(
            records,
            limit,
            direction,
            'GSI7PK',
            'GSI7SK',
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

    /**
     * Batch update invoices (used by sync handlers)
     * Updates 25 records at a time (DynamoDB BatchWrite limit)
     */
    async batchUpdateRecords(invoices: InvoiceDto[]): Promise<void> {
        const BATCH_SIZE = 25; // DynamoDB BatchWriteItem limit

        for (let i = 0; i < invoices.length; i += BATCH_SIZE) {
            const batch = invoices.slice(i, i + BATCH_SIZE);

            try {
                // Convert DTOs to DataTypes
                const batchData = await Promise.all(batch.map((invoice) => this.convertToDataType(invoice)));

                // Use Promise.all to update all records in parallel (25 at a time)
                await Promise.all(batchData.map((invoice) => this.invoiceTable.update(invoice)));

                this.logger.log(`Batch updated ${batch.length} invoices (indices ${i} to ${i + batch.length - 1})`);
            } catch (error) {
                this.logger.error(`Failed to batch update invoices at index ${i}:`, error);

                // Fallback: Update one by one
                for (const invoice of batch) {
                    try {
                        await this.updateRecord(invoice);
                    } catch (itemError) {
                        this.logger.error(`Failed to update invoice ${invoice.invoiceId}:`, itemError);
                        // Continue with other records
                    }
                }
            }
        }
    }

    async getInvoicesByDateRange(startDate: string, endDate: string, fields: string[]): Promise<InvoiceDto[]> {
        const allInvoices: InvoiceDto[] = [];
        let cursorPointer: string | undefined = undefined;
        const limit = 1000;

        do {
            const dynamoDbOption = cursorPointer
                ? createDynamoDbOptionWithPKSKIndex(limit, 'GSI11', 'next', cursorPointer)
                : {
                      limit: limit + 1,
                      follow: true,
                      index: 'GSI11',
                  };

            const records = await this.invoiceTable.find(
                {
                    GSI11PK: `INVOICE`,
                    GSI11SK: {
                        between: [startDate, endDate],
                    },
                },
                {
                    ...dynamoDbOption,
                    fields: fields,
                }
            );

            const dtos = await this.convertToDtoList(records);
            allInvoices.push(...dtos);
            cursorPointer = records.next ? JSON.stringify(records.next) : undefined;
        } while (cursorPointer);

        return allInvoices;
    }

    /**
     * Find all invoices for a specific customer within a date range
     * Uses GSI3: PK = INVOICE#${customerId}, SK = invoiceDate (supports between query)
     */
    async getInvoicesByCustomerAndDateRange(
        customerId: string,
        startDate: string,
        endDate: string,
        fields?: string[]
    ): Promise<InvoiceDto[]> {
        const allInvoices: InvoiceDto[] = [];
        let cursorPointer: string | undefined = undefined;
        const limit = 1000;

        do {
            const dynamoDbOption = cursorPointer
                ? createDynamoDbOptionWithPKSKIndex(limit, 'GSI3', 'next', cursorPointer)
                : {
                      limit: limit + 1,
                      follow: true,
                      index: 'GSI3',
                  };

            const findOptions: Record<string, unknown> = {
                ...dynamoDbOption,
                where: '${status} = {ACTIVE}',
                substitutions: {
                    ACTIVE: StatusEnum.ACTIVE,
                },
            };

            if (fields && fields.length > 0) {
                findOptions['fields'] = fields;
            }

            const records = await this.invoiceTable.find(
                {
                    GSI3PK: `INVOICE#${customerId}`,
                    GSI3SK: {
                        between: [startDate, endDate],
                    },
                },
                findOptions
            );

            const dtos = await this.convertToDtoList(records);
            allInvoices.push(...dtos);
            cursorPointer = records.next ? JSON.stringify(records.next) : undefined;
        } while (cursorPointer);

        return allInvoices;
    }

    /**
     * Find all invoices for a specific area within a date range
     * Uses GSI8: PK = INVOICE#${areaId}, SK = invoiceDate (supports between query)
     */
    async getInvoicesByAreaAndDateRange(
        areaId: string,
        startDate: string,
        endDate: string,
        fields?: string[]
    ): Promise<InvoiceDto[]> {
        const allInvoices: InvoiceDto[] = [];
        let cursorPointer: string | undefined = undefined;
        const limit = 1000;

        do {
            const dynamoDbOption = cursorPointer
                ? createDynamoDbOptionWithPKSKIndex(limit, 'GSI8', 'next', cursorPointer)
                : {
                      limit: limit + 1,
                      follow: true,
                      index: 'GSI8',
                  };

            const findOptions: Record<string, unknown> = {
                ...dynamoDbOption,
                where: '${status} = {ACTIVE}',
                substitutions: {
                    ACTIVE: StatusEnum.ACTIVE,
                },
            };

            if (fields && fields.length > 0) {
                findOptions['fields'] = fields;
            }

            const records = await this.invoiceTable.find(
                {
                    GSI8PK: `INVOICE#${areaId}`,
                    GSI8SK: {
                        between: [startDate, endDate],
                    },
                },
                findOptions
            );

            const dtos = await this.convertToDtoList(records);
            allInvoices.push(...dtos);
            cursorPointer = records.next ? JSON.stringify(records.next) : undefined;
        } while (cursorPointer);

        return allInvoices;
    }

    /**
     * Find all invoices for a specific sales type within a date range
     * Uses GSI4: PK = INVOICE#${salesTypeId}, SK = invoiceDate (supports between query)
     */
    async getInvoicesBySalesTypeAndDateRange(
        salesTypeId: string,
        startDate: string,
        endDate: string,
        fields?: string[]
    ): Promise<InvoiceDto[]> {
        const allInvoices: InvoiceDto[] = [];
        let cursorPointer: string | undefined = undefined;
        const limit = 1000;

        do {
            const dynamoDbOption = cursorPointer
                ? createDynamoDbOptionWithPKSKIndex(limit, 'GSI4', 'next', cursorPointer)
                : {
                      limit: limit + 1,
                      follow: true,
                      index: 'GSI4',
                  };

            const findOptions: Record<string, unknown> = {
                ...dynamoDbOption,
                where: '${status} = {ACTIVE}',
                substitutions: {
                    ACTIVE: StatusEnum.ACTIVE,
                },
            };

            if (fields && fields.length > 0) {
                findOptions['fields'] = fields;
            }

            const records = await this.invoiceTable.find(
                {
                    GSI4PK: `INVOICE#${salesTypeId}`,
                    GSI4SK: {
                        between: [startDate, endDate],
                    },
                },
                findOptions
            );

            const dtos = await this.convertToDtoList(records);
            allInvoices.push(...dtos);
            cursorPointer = records.next ? JSON.stringify(records.next) : undefined;
        } while (cursorPointer);

        return allInvoices;
    }

    /**
     * Find all pending/partial payment invoices, optionally filtered by date range
     * Returns full InvoiceDto[] (not just count) for report generation
     */
    async getPendingPaymentInvoices(startDate?: string, endDate?: string): Promise<InvoiceDto[]> {
        const allInvoices: InvoiceDto[] = [];
        let cursorPointer: string | undefined = undefined;
        const limit = 1000;

        do {
            const dynamoDbOption = cursorPointer
                ? createDynamoDbOptionWithPKSKIndex(limit, 'GSI11', 'next', cursorPointer)
                : {
                      limit: limit + 1,
                      follow: true,
                      index: 'GSI11',
                  };

            const findCondition: Record<string, unknown> = {
                GSI11PK: `INVOICE`,
            };

            if (startDate && endDate) {
                findCondition['GSI11SK'] = { between: [startDate, endDate] };
            }

            const records = await this.invoiceTable.find(findCondition, {
                ...dynamoDbOption,
                where: '(${paymentStatus} = {PENDING} OR ${paymentStatus} = {PARTIAL}) AND ${status} = {ACTIVE}',
                substitutions: {
                    PENDING: PaymentStatusEnum.PENDING,
                    PARTIAL: PaymentStatusEnum.PARTIAL,
                    ACTIVE: StatusEnum.ACTIVE,
                },
            });

            const dtos = await this.convertToDtoList(records);
            allInvoices.push(...dtos);
            cursorPointer = records.next ? JSON.stringify(records.next) : undefined;
        } while (cursorPointer);

        return allInvoices;
    }

    async getPendingPaymentInvoiceCount(startDate?: string, endDate?: string): Promise<number> {
        let totalCount = 0;
        let cursorPointer: string | undefined = undefined;
        const limit = 1000;

        // Count PENDING invoices, optionally filtered by date range
        do {
            const dynamoDbOption = cursorPointer
                ? createDynamoDbOptionWithPKSKIndex(limit, 'GSI11', 'next', cursorPointer)
                : {
                      limit: limit + 1,
                      follow: true,
                      index: 'GSI11',
                  };

            const findCondition: Record<string, unknown> = {
                GSI11PK: `INVOICE`,
            };

            // If date range provided, filter by invoiceDate (GSI11SK)
            if (startDate && endDate) {
                findCondition['GSI11SK'] = { between: [startDate, endDate] };
            }

            const records = await this.invoiceTable.find(findCondition, {
                ...dynamoDbOption,
                fields: ['invoiceId'],
                where: '${paymentStatus} = {PENDING} AND ${status} = {ACTIVE}',
                substitutions: {
                    PENDING: PaymentStatusEnum.PENDING,
                    ACTIVE: StatusEnum.ACTIVE,
                },
            });

            totalCount += records.length;
            cursorPointer = records.next ? JSON.stringify(records.next) : undefined;
        } while (cursorPointer);

        return totalCount;
    }
}
