import { UserCognito } from '@auth-guard-lib';
import {
    ContractInvoiceEventEnum,
    ErrorResponseDto,
    InvoiceDetailsDto,
    InvoiceDto,
    InvoicePaymentEventDto,
    InvoicePaymentEventEnum,
    ResponseDto,
    StatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { StockDatabaseServiceAbstract } from '@inventory-database-service';
import { ContractDatabaseServiceAbstract, InvoiceDatabaseServiceAbstract } from '@invoicing-database-service';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InvoiceStockDeltaService } from '../../../shared/invoice-stock-delta.service';
import { ApproveInvoiceCommand } from './approve.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(ApproveInvoiceCommand)
export class ApproveInvoiceHandler implements ICommandHandler<ApproveInvoiceCommand> {
    protected readonly logger = new Logger(ApproveInvoiceHandler.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract,
        @Inject('ContractDatabaseService')
        private readonly contractDatabaseService: ContractDatabaseServiceAbstract,

        @Inject('StockDatabaseService')
        private readonly stockDatabaseService: StockDatabaseServiceAbstract,
        private readonly configService: ConfigService,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly invoiceStockDeltaService: InvoiceStockDeltaService
    ) {}

    async execute(command: ApproveInvoiceCommand): Promise<ResponseDto<InvoiceDto | ErrorResponseDto>> {
        this.logger.log(`Processing approval request for invoice: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateInvoiceExists(command.recordId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process approval based on current status
            return await this.processApproval(existingRecord, command.user);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Validates that the invoice record exists
     */
    private async validateInvoiceExists(recordId: string): Promise<InvoiceDto> {
        const existingRecord = await this.invoiceDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Invoice not found: ${recordId}`);
            throw new NotFoundException(`Invoice record not found for id ${recordId}`);
        }

        return existingRecord;
    }

    /**
     * Validates that the user has authorization to approve
     */
    private validateUserAuthorization(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new ForbiddenException('User roles not found');
        }

        const hasApprovalPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasApprovalPermission) {
            throw new ForbiddenException('Current user is not authorized to approve invoice change request');
        }
    }

    /**
     * Processes the approval based on the current status of the record
     */
    private async processApproval(existingRecord: InvoiceDto, user: UserCognito): Promise<ResponseDto<InvoiceDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveInvoice(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.approveDeletion(existingRecord);
            default:
                throw new BadRequestException(`Cannot approve invoice with status: ${existingRecord.status}`);
        }
    }

    /**
     * Approves an invoice for approval
     */
    private async approveInvoice(existingRecord: InvoiceDto, user: UserCognito): Promise<ResponseDto<InvoiceDto>> {
        // Validate stock availability before approving
        await this.validateStockAvailability(existingRecord);

        // Validate contract amount limit if invoice has contract in forApprovalVersion
        if (existingRecord.forApprovalVersion?.contractId) {
            const contractId = existingRecord.forApprovalVersion.contractId as string;
            const newAmount = existingRecord.forApprovalVersion.finalAmount as number;
            // Check if this is an update (FOR_APPROVAL) or new record (NEW_RECORD)
            const isUpdate = existingRecord.status === StatusEnum.FOR_APPROVAL;
            const existingAmount = isUpdate ? existingRecord.finalAmount : null;

            await this.validateContractAmountLimit(contractId, newAmount, existingAmount);
        }

        // Store original invoice details and status before applying forApprovalVersion
        const originalInvoiceDetails = existingRecord.invoiceDetails || [];
        const originalStatus = existingRecord.forApprovalVersion?.originalStatus as StatusEnum | undefined;

        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Invoice approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        const forApprovalVersion = existingRecord.forApprovalVersion;
        existingRecord.docno = forApprovalVersion.docno as string;
        existingRecord.invoiceDate = forApprovalVersion.invoiceDate as string;
        existingRecord.customerId = forApprovalVersion.customerId as string;
        existingRecord.customerName = forApprovalVersion.customerName as string;
        existingRecord.areaId = forApprovalVersion.areaId as string;
        existingRecord.areaName = forApprovalVersion.areaName as string;
        existingRecord.territoryManagerId = forApprovalVersion.territoryManagerId as string;
        existingRecord.territoryManagerName = forApprovalVersion.territoryManagerName as string;
        existingRecord.salesTypeId = forApprovalVersion.salesTypeId as string;
        existingRecord.salesTypeName = forApprovalVersion.salesTypeName as string;
        existingRecord.contractId = forApprovalVersion.contractId as string;
        existingRecord.contractName = forApprovalVersion.contractName as string;
        existingRecord.termsId = forApprovalVersion.termsId as string;
        existingRecord.termsName = forApprovalVersion.termsName as string;
        existingRecord.productPriceTypeId = forApprovalVersion.productPriceTypeId as string;
        existingRecord.productPriceTypeName = forApprovalVersion.productPriceTypeName as string;
        existingRecord.finalAmount = forApprovalVersion.finalAmount as number;
        existingRecord.invoiceAmount = forApprovalVersion.invoiceAmount as number;
        existingRecord.taxAmount = forApprovalVersion.taxAmount as number;
        existingRecord.totalAmountPaid = forApprovalVersion.totalAmountPaid as number;
        existingRecord.invoiceDetails = forApprovalVersion.invoiceDetails as InvoiceDetailsDto[];
        existingRecord.contractSales = forApprovalVersion.contractSales as boolean;
        existingRecord.taxRate = forApprovalVersion.taxRate as number;
        existingRecord.taxable = forApprovalVersion.taxable as boolean;
        existingRecord.forApprovalVersion = {};
        // Reset changeReason to null AFTER applying forApprovalVersion
        existingRecord.changeReason = null;

        // Recompute totals from invoice details to ensure consistency
        this.recomputeInvoiceTotals(existingRecord);

        // Update record in database
        const updatedRecord = await this.invoiceDatabaseService.updateRecord(existingRecord);

        // Handle stock adjustments based on original status
        const invoicePayloads: InvoicePaymentEventDto[] = [];
        if (originalStatus === StatusEnum.ACTIVE) {
            // ACTIVE → FOR_APPROVAL → ACTIVE: Calculate and apply stock deltas
            await this.invoiceStockDeltaService.applyStockDeltas(
                originalInvoiceDetails,
                updatedRecord.invoiceDetails || [],
                `INV-APPROVE-UPDATE-${updatedRecord.invoiceId}`
            );

            const invoicePaymentDto: InvoicePaymentEventDto = {
                invoiceId: existingRecord.invoiceId,
                customerId: existingRecord.customerId,
                invoicePaymentEvent: InvoicePaymentEventEnum.PAYMENT_UPDATED,
            };
            invoicePayloads.push(invoicePaymentDto);
        } else {
            // NEW_RECORD or DRAFT → FOR_APPROVAL → ACTIVE: Deduct all stock (first time)
            await this.invoiceStockDeltaService.sendFullDeduction(
                updatedRecord.invoiceDetails || [],
                `INV-APPROVE-NEW-${updatedRecord.invoiceId}`
            );

            const invoicePaymentDto: InvoicePaymentEventDto = {
                invoiceId: existingRecord.invoiceId,
                customerId: existingRecord.customerId,
                invoicePaymentEvent: InvoicePaymentEventEnum.INVOICE_CREATED,
            };
            invoicePayloads.push(invoicePaymentDto);
        }

        await this.sendInvoicePaymentEvent(invoicePayloads);
        this.logger.log(`Invoice approved successfully: ${existingRecord.invoiceId}`);

        // If invoice has a contractId, trigger recalculation of contract invoiced amount
        if (updatedRecord.contractId) {
            await this.sendContractInvoiceEvent(
                ContractInvoiceEventEnum.RECALCULATE_INVOICED_AMOUNT,
                updatedRecord.contractId
            );
        }

        return new ResponseDto<InvoiceDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deletion of an invoice
     */
    private async approveDeletion(existingRecord: InvoiceDto): Promise<ResponseDto<InvoiceDto>> {
        const contractId = existingRecord.contractId; // Store before deletion
        await this.invoiceDatabaseService.deleteRecord(existingRecord);

        // Check original status from forApprovalVersion (stored by delete handler)
        // Only restore stock if invoice was originally ACTIVE (not NEW_RECORD or DRAFT)
        const originalStatus = existingRecord.forApprovalVersion?.originalStatus as StatusEnum | undefined;

        if (originalStatus === StatusEnum.ACTIVE) {
            // Restore stock for deleted invoice
            await this.invoiceStockDeltaService.sendFullRestoration(
                existingRecord.invoiceDetails || [],
                `INV-DELETE-APPROVE-${existingRecord.invoiceId}`
            );
        }

        this.logger.log(`Invoice deletion approved: ${existingRecord.invoiceId}`);

        const invoicePayloads: InvoicePaymentEventDto[] = [];
        const invoicePaymentDto: InvoicePaymentEventDto = {
            invoiceId: existingRecord.invoiceId,
            customerId: existingRecord.customerId,
            invoicePaymentEvent: InvoicePaymentEventEnum.INVOICE_DELETED,
        };
        invoicePayloads.push(invoicePaymentDto);

        await this.sendInvoicePaymentEvent(invoicePayloads);

        // If deleted invoice had contractId, trigger recalculation after deletion
        if (contractId) {
            await this.sendContractInvoiceEvent(ContractInvoiceEventEnum.RECALCULATE_INVOICED_AMOUNT, contractId);
        }

        return new ResponseDto<InvoiceDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Validates stock availability for all invoice items
     */
    private async validateStockAvailability(invoice: InvoiceDto): Promise<void> {
        if (!invoice.invoiceDetails || invoice.invoiceDetails.length === 0) {
            return; // No items to validate
        }

        const invalidItems: string[] = [];

        for (const detail of invoice.invoiceDetails) {
            if (!detail.stockId) {
                continue; // Skip items without stockId
            }

            // Fetch current stock record
            const stockRecord = await this.stockDatabaseService.findRecordById(detail.stockId);

            if (!stockRecord) {
                invalidItems.push(`${detail.productName}: Stock record not found`);
                continue;
            }

            // Check if sufficient stock is available
            const totalRequested = detail.qty || 0;
            const currentAvailable = stockRecord.totalQuantity || 0;

            if (currentAvailable < totalRequested) {
                invalidItems.push(
                    `${detail.productName}: requested ${totalRequested}, only ${currentAvailable} available`
                );
            }
        }

        if (invalidItems.length > 0) {
            const errorMessage = `Cannot approve invoice - insufficient stock:\n${invalidItems.join('\n')}`;
            this.logger.warn(`Stock validation failed for invoice ${invoice.invoiceId}: ${invalidItems.join(', ')}`);
            throw new BadRequestException(errorMessage);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing approval request for ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException || error instanceof ForbiddenException) {
            throw error;
        }

        // Handle unknown errors
        const errorMessage = this.extractErrorMessage(error);
        throw new BadRequestException(errorMessage);
    }

    /**
     * Extracts error message from various error types
     */
    private extractErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }

        if (typeof error === 'object' && error !== null && 'response' in error) {
            const responseError = error as { response?: { body?: { errorMessage?: string } } };
            return responseError.response?.body?.errorMessage || 'Unknown error occurred';
        }

        return 'An unexpected error occurred';
    }

    /**
     * Validates contract amount limit
     */
    private async validateContractAmountLimit(
        contractId: string,
        newInvoiceAmount: number,
        existingInvoiceAmount: number | null
    ): Promise<void> {
        const contract = await this.contractDatabaseService.findRecordById(contractId);

        if (!contract) {
            throw new BadRequestException(`Contract not found: ${contractId}`);
        }

        // Calculate current invoiced amount
        let currentInvoicedAmount = contract.invoicedAmount || 0;

        // If this is an update, subtract the old invoice amount first
        if (existingInvoiceAmount !== null) {
            currentInvoicedAmount -= existingInvoiceAmount;
        }

        // Calculate projected amount
        const projectedInvoicedAmount = currentInvoicedAmount + newInvoiceAmount;

        // Check if it exceeds
        if (projectedInvoicedAmount > contract.contractAmount) {
            const remaining = contract.contractAmount - currentInvoicedAmount;
            throw new BadRequestException(
                `Invoice amount (${newInvoiceAmount.toFixed(2)}) exceeds remaining contract balance. ` +
                    `Contract: ${contract.contractAmount.toFixed(2)}, ` +
                    `Already invoiced: ${currentInvoicedAmount.toFixed(2)}, ` +
                    `Remaining: ${remaining.toFixed(2)}`
            );
        }

        this.logger.log(
            `Contract validation passed - Contract: ${contract.contractAmount}, ` +
                `Current: ${currentInvoicedAmount}, New invoice: ${newInvoiceAmount}, ` +
                `Projected: ${projectedInvoicedAmount}`
        );
    }

    /**
     * Recomputes invoiceAmount, taxAmount, and finalAmount from invoiceDetails
     * to ensure the stored totals are always consistent with line items
     */
    private recomputeInvoiceTotals(invoice: InvoiceDto): void {
        const details = invoice.invoiceDetails || [];
        if (details.length === 0) return;

        const invoiceAmount = Math.round(details.reduce((sum, d) => sum + (d.amount || 0), 0) * 100) / 100;
        const effectiveTaxRate = invoice.taxable ? (invoice.taxRate ?? 0) / 100 : 0;
        const taxAmount = Math.round(invoiceAmount * effectiveTaxRate * 100) / 100;
        const finalAmount = Math.round((invoiceAmount + taxAmount) * 100) / 100;

        invoice.invoiceAmount = invoiceAmount;
        invoice.taxAmount = taxAmount;
        invoice.finalAmount = finalAmount;
    }

    /**
     * Sends contract invoice event to recalculate invoiced amount
     */
    private async sendContractInvoiceEvent(event: ContractInvoiceEventEnum, contractId: string): Promise<void> {
        try {
            this.logger.log(`Sending contract invoice event ${event} for contract ${contractId}`);
            const invoiceEventSQSUrl = this.configService.get<string>('INVOICE_EVENT_SQS');
            await this.messageQueueService.sendMessageToSQS(
                invoiceEventSQSUrl,
                JSON.stringify({
                    event,
                    data: contractId,
                })
            );
        } catch (error) {
            this.logger.error(`Failed to send contract invoice event ${event} for contract ${contractId}:`, error);
        }
    }

    /**
     * Sends invoice payment event to SQS queue
     */
    private async sendInvoicePaymentEvent(paymentData: InvoicePaymentEventDto[]): Promise<void> {
        const invoicingEventSQSUrl = this.configService.get<string>('INVOICE_EVENT_SQS');

        const eventPayload = {
            eventType: InvoicePaymentEventEnum.CUSTOMER_BALANCE_UPDATE, // Using CUSTOMER_BALANCE_UPDATE as a generic event type for invoice payment changes
            paymentData,
        };

        await this.messageQueueService.sendMessageToSQS(invoicingEventSQSUrl, JSON.stringify(eventPayload));
    }
}
