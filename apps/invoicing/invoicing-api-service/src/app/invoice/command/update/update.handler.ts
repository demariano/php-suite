import {
    ContractInvoiceEventEnum,
    ErrorResponseDto,
    InvoiceDto,
    InvoicePaymentEventDto,
    InvoicePaymentEventEnum,
    ResponseDto,
    StatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { detectFieldChanges, formatFieldChanges } from '@field-change-utils-lib';
import {
    ContractDatabaseServiceAbstract,
    InvoiceDatabaseServiceAbstract,
    PaymentInvoiceDatabaseServiceAbstractClass,
} from '@invoicing-database-service';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InvoiceStockDeltaService } from '../../../shared/invoice-stock-delta.service';
import { UpdateInvoiceCommand } from './update.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(UpdateInvoiceCommand)
export class UpdateInvoiceHandler implements ICommandHandler<UpdateInvoiceCommand> {
    protected readonly logger = new Logger(UpdateInvoiceHandler.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract,
        @Inject('ContractDatabaseService')
        private readonly contractDatabaseService: ContractDatabaseServiceAbstract,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService,
        @Inject('PaymentInvoiceDatabaseService')
        private readonly paymentInvoiceDatabaseService: PaymentInvoiceDatabaseServiceAbstractClass,
        private readonly invoiceStockDeltaService: InvoiceStockDeltaService
    ) {}

    async execute(command: UpdateInvoiceCommand): Promise<ResponseDto<InvoiceDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for invoice: ${command.id}`);

        try {
            // Validate that invoice exists
            const existingRecord = await this.validateInvoice(command.id);

            // Validate that invoice docno doesn't already exist (excluding current record)
            await this.validateInvoiceDocnoUnique(command.invoiceDto.docno, command.id);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateInvoiceStatus(command, existingRecord, hasApprovalPermission);

            // Store original invoice details before update for delta calculation
            const originalInvoiceDetails = await this.getOriginalInvoiceDetails(command.id);
            const originalStatus = originalInvoiceDetails?.status;

            // Validate contract amount limit if invoice is for a contract (non-DRAFT only)
            if (existingRecord.contractId && existingRecord.status !== StatusEnum.DRAFT) {
                await this.validateContractAmountLimit(
                    existingRecord.contractId,
                    existingRecord.finalAmount,
                    originalInvoiceDetails?.finalAmount // Subtract old amount for updates
                );
            }

            // Update record in database
            const updatedRecord = await this.invoiceDatabaseService.updateRecord(existingRecord);

            // Handle stock adjustments and customer balance for admin updates
            if (hasApprovalPermission && updatedRecord.status === StatusEnum.ACTIVE) {
                if (originalStatus === StatusEnum.DRAFT) {
                    // DRAFT → ACTIVE: First time stock deduction, deduct all
                    await this.invoiceStockDeltaService.sendFullDeduction(
                        updatedRecord.invoiceDetails || [],
                        `INV-ACTIVATE-${updatedRecord.invoiceId}`
                    );
                } else if (originalStatus === StatusEnum.ACTIVE) {
                    // ACTIVE → ACTIVE: Calculate and apply stock deltas
                    await this.invoiceStockDeltaService.applyStockDeltas(
                        originalInvoiceDetails.invoiceDetails || [],
                        updatedRecord.invoiceDetails || [],
                        `INV-UPDATE-${updatedRecord.invoiceId}`
                    );
                }

                const invoicePayloads: InvoicePaymentEventDto[] = [];
                const invoicePaymentDto: InvoicePaymentEventDto = {
                    invoiceId: existingRecord.invoiceId,
                    customerId: existingRecord.customerId,
                    invoicePaymentEvent: InvoicePaymentEventEnum.INVOICE_UPDATED,
                };
                invoicePayloads.push(invoicePaymentDto);

                await this.sendInvoicePaymentEvent(invoicePayloads);

                // If invoice has a contractId, trigger recalculation of contract invoiced amount
                if (updatedRecord.contractId) {
                    await this.sendContractInvoiceEvent(
                        ContractInvoiceEventEnum.RECALCULATE_INVOICED_AMOUNT,
                        updatedRecord.contractId
                    );
                }
            } else if (!hasApprovalPermission && updatedRecord.status === StatusEnum.FOR_APPROVAL) {
                // Non-admin update: ACTIVE → FOR_APPROVAL
                // Invoice is no longer ACTIVE, so we need to recalculate contract invoiced amount
                if (originalInvoiceDetails?.contractId) {
                    await this.sendContractInvoiceEvent(
                        ContractInvoiceEventEnum.RECALCULATE_INVOICED_AMOUNT,
                        originalInvoiceDetails.contractId
                    );
                }
            }

            this.logger.log(`Invoice updated successfully: ${updatedRecord.invoiceId}`);
            return new ResponseDto<InvoiceDto>(updatedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.id);
        }
    }

    /**
     * Gets the original invoice details before any modifications
     */
    private async getOriginalInvoiceDetails(recordId: string): Promise<InvoiceDto> {
        return await this.invoiceDatabaseService.findRecordById(recordId);
    }

    /**
     * Validates that the invoice exists
     */
    private async validateInvoice(recordId: string): Promise<InvoiceDto> {
        const existingRecord = await this.invoiceDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Invoice not found: ${recordId}`);
            throw new NotFoundException(`Invoice record not found for id ${recordId}`);
        }

        //check if there are payments linked to the invoice, if yes, prevent deletion and return error message
        const linkedPayments = await this.paymentInvoiceDatabaseService.findRecordByInvoiceId(recordId);
        //check if linkedPayments has a customer credit payment, if yes, prevent deletion and return error message
        if (linkedPayments && linkedPayments.length > 0) {
            const hasCustomerCreditPayment = linkedPayments.some((payment) =>
                payment.customerCreditPayment ? payment.customerCreditPayment : false
            );

            if (hasCustomerCreditPayment) {
                this.logger.warn(`Invoice has linked customer credit payments: ${recordId}`);
                throw new BadRequestException(`Invoice cannot be deleted as it has linked customer credit payments`);
            }
        }

        return existingRecord;
    }

    /**
     * Validates that the invoice docno is unique (excluding current record)
     */
    private async validateInvoiceDocnoUnique(docno: string, currentId: string): Promise<void> {
        const existingRecord = await this.invoiceDatabaseService.findRecordByDocno(docno);

        if (existingRecord && existingRecord.invoiceId !== currentId) {
            this.logger.warn(`Invoice docno already exists: ${docno}`);
            throw new BadRequestException('Invoice document number already exists');
        }
    }

    /**
     * Checks if user has permission to approve updates directly
     */
    private hasApprovalPermission(userRoles?: string[]): boolean {
        if (!userRoles || userRoles.length === 0) {
            return false;
        }

        return userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);
    }

    /**
     * Updates invoice status and activity logs based on user permissions
     */
    private updateInvoiceStatus(
        command: UpdateInvoiceCommand,
        existingRecord: InvoiceDto,
        hasApprovalPermission: boolean
    ): void {
        // Capture original status BEFORE any modifications for forApprovalVersion storage
        const capturedOriginalStatus = existingRecord.status;
        const capturedOriginalFinalAmount = existingRecord.finalAmount;

        // Handle DRAFT invoice updates - allow direct updates without approval
        if (existingRecord.status === StatusEnum.DRAFT) {
            existingRecord.docno = command.invoiceDto.docno;
            existingRecord.invoiceDate = command.invoiceDto.invoiceDate;
            existingRecord.customerId = command.invoiceDto.customerId;
            existingRecord.customerName = command.invoiceDto.customerName;
            existingRecord.areaId = command.invoiceDto.areaId;
            existingRecord.areaName = command.invoiceDto.areaName;
            existingRecord.territoryManagerId = command.invoiceDto.territoryManagerId;
            existingRecord.territoryManagerName = command.invoiceDto.territoryManagerName;
            existingRecord.salesTypeId = command.invoiceDto.salesTypeId;
            existingRecord.salesTypeName = command.invoiceDto.salesTypeName;
            existingRecord.contractId = command.invoiceDto.contractId;
            existingRecord.contractName = command.invoiceDto.contractName;
            existingRecord.termsId = command.invoiceDto.termsId;
            existingRecord.termsName = command.invoiceDto.termsName;
            existingRecord.productPriceTypeId = command.invoiceDto.productPriceTypeId;
            existingRecord.productPriceTypeName = command.invoiceDto.productPriceTypeName;
            existingRecord.finalAmount = command.invoiceDto.finalAmount;
            existingRecord.invoiceAmount = command.invoiceDto.invoiceAmount;
            existingRecord.taxAmount = command.invoiceDto.taxAmount;
            existingRecord.totalAmountPaid = command.invoiceDto.totalAmountPaid;
            existingRecord.invoiceDetails = command.invoiceDto.invoiceDetails;
            existingRecord.contractSales = command.invoiceDto.contractSales;

            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Draft invoice updated by ${command.user.username}`;
            existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
            return;
        }

        if (hasApprovalPermission) {
            // User can approve directly - update the existing record
            existingRecord.status = StatusEnum.ACTIVE;
            existingRecord.docno = command.invoiceDto.docno;
            existingRecord.invoiceDate = command.invoiceDto.invoiceDate;
            existingRecord.customerId = command.invoiceDto.customerId;
            existingRecord.customerName = command.invoiceDto.customerName;
            existingRecord.areaId = command.invoiceDto.areaId;
            existingRecord.areaName = command.invoiceDto.areaName;
            existingRecord.territoryManagerId = command.invoiceDto.territoryManagerId;
            existingRecord.territoryManagerName = command.invoiceDto.territoryManagerName;
            existingRecord.salesTypeId = command.invoiceDto.salesTypeId;
            existingRecord.salesTypeName = command.invoiceDto.salesTypeName;
            existingRecord.contractId = command.invoiceDto.contractId;
            existingRecord.contractName = command.invoiceDto.contractName;
            existingRecord.termsId = command.invoiceDto.termsId;
            existingRecord.termsName = command.invoiceDto.termsName;
            existingRecord.productPriceTypeId = command.invoiceDto.productPriceTypeId;
            existingRecord.productPriceTypeName = command.invoiceDto.productPriceTypeName;
            existingRecord.finalAmount = command.invoiceDto.finalAmount;
            existingRecord.invoiceAmount = command.invoiceDto.invoiceAmount;
            existingRecord.taxAmount = command.invoiceDto.taxAmount;
            existingRecord.totalAmountPaid = command.invoiceDto.totalAmountPaid;
            existingRecord.invoiceDetails = command.invoiceDto.invoiceDetails;
            existingRecord.contractSales = command.invoiceDto.contractSales;
            // Clear changeReason for admin users since changes are applied directly
            existingRecord.changeReason = undefined;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Invoice updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`;
            existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

            // Limit activity logs to last 10 entries
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        } else {
            // User needs approval - store changes in forApprovalVersion, keep existing record unchanged
            existingRecord.status = StatusEnum.FOR_APPROVAL;
            existingRecord.activityLogs = existingRecord.activityLogs || [];

            // Detect field changes
            const fieldChanges = detectFieldChanges(existingRecord, command.invoiceDto, {});
            const formattedChanges = formatFieldChanges(fieldChanges);

            // Build activity log message
            let activityLogMessage = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Invoice updated by ${command.user.username} for approval`;

            // Append changes to activity log if any changes detected
            if (formattedChanges) {
                activityLogMessage += ` - ${formattedChanges}`;
            }

            existingRecord.activityLogs.push(activityLogMessage);

            // Preserve user's manually entered changeReason and combine with auto-generated changes
            const userChangeReason = command.invoiceDto.changeReason?.trim();
            if (userChangeReason && formattedChanges) {
                // User provided changeReason and we have formatted changes - combine them
                // formatFieldChanges already starts with \n, so we just concatenate
                existingRecord.changeReason = `${userChangeReason}${formattedChanges}`;
            } else if (userChangeReason) {
                // User provided changeReason but no formatted changes - use user's input
                existingRecord.changeReason = userChangeReason;
            } else if (formattedChanges) {
                // No user input but we have formatted changes - use formatted changes
                existingRecord.changeReason = formattedChanges;
            } else {
                // No user input and no formatted changes
                existingRecord.changeReason = undefined;
            }

            existingRecord.forApprovalVersion = {
                ...existingRecord.forApprovalVersion,
                originalStatus: capturedOriginalStatus, // Store original status for approval delta calculation
                originalFinalAmount: capturedOriginalFinalAmount, // Store original amount for balance delta calculation
                originalInvoiceDetails: existingRecord.invoiceDetails, // Store original invoice details for stock delta
                docno: command.invoiceDto.docno,
                invoiceDate: command.invoiceDto.invoiceDate,
                customerId: command.invoiceDto.customerId,
                customerName: command.invoiceDto.customerName,
                areaId: command.invoiceDto.areaId,
                areaName: command.invoiceDto.areaName,
                territoryManagerId: command.invoiceDto.territoryManagerId,
                territoryManagerName: command.invoiceDto.territoryManagerName,
                salesTypeId: command.invoiceDto.salesTypeId,
                salesTypeName: command.invoiceDto.salesTypeName,
                contractId: command.invoiceDto.contractId,
                contractName: command.invoiceDto.contractName,
                termsId: command.invoiceDto.termsId,
                termsName: command.invoiceDto.termsName,
                productPriceTypeId: command.invoiceDto.productPriceTypeId,
                productPriceTypeName: command.invoiceDto.productPriceTypeName,
                finalAmount: command.invoiceDto.finalAmount,
                invoiceAmount: command.invoiceDto.invoiceAmount,
                taxAmount: command.invoiceDto.taxAmount,
                totalAmountPaid: command.invoiceDto.totalAmountPaid,
                invoiceDetails: command.invoiceDto.invoiceDetails,
                contractSales: command.invoiceDto.contractSales,
            };

            // Limit activity logs to last 10 entries
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing update request for ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException || error instanceof NotFoundException) {
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
     * Validates that updating this invoice won't exceed the contract amount limit
     */
    private async validateContractAmountLimit(
        contractId: string,
        newInvoiceAmount: number,
        existingInvoiceAmount: number | null
    ): Promise<void> {
        // Fetch the contract
        const contract = await this.contractDatabaseService.findRecordById(contractId);

        if (!contract) {
            throw new BadRequestException(`Contract not found: ${contractId}`);
        }

        // Calculate current invoiced amount (excluding this invoice if it's an update)
        let currentInvoicedAmount = contract.invoicedAmount || 0;

        // If this is an update, subtract the old invoice amount first
        if (existingInvoiceAmount !== null) {
            currentInvoicedAmount -= existingInvoiceAmount;
        }

        // Calculate what the new total would be
        const projectedInvoicedAmount = currentInvoicedAmount + newInvoiceAmount;

        // Check if it would exceed the contract amount
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
