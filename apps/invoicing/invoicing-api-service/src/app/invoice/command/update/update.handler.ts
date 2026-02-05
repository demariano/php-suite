import {
    ContractInvoiceEventEnum,
    CustomerBalanceEventDto,
    CustomerBalanceEventEnum,
    ErrorResponseDto,
    InventoryEventDto,
    InventoryEventEnum,
    InvoiceAmountChangedDto,
    InvoiceDto,
    InvoicePaymentEventEnum,
    ResponseDto,
    StatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { detectFieldChanges, formatFieldChanges } from '@field-change-utils-lib';
import { ContractDatabaseServiceAbstract, InvoiceDatabaseServiceAbstract } from '@invoicing-database-service';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
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
        private readonly configService: ConfigService
    ) {}

    async execute(command: UpdateInvoiceCommand): Promise<ResponseDto<InvoiceDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for invoice: ${command.id}`);

        try {
            // Validate that invoice exists
            const existingRecord = await this.validateInvoiceExists(command.id);

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
                    await this.sendInventoryApprovedEvent(updatedRecord);

                    // Send customer balance event - first time invoice is active
                    await this.sendCustomerBalanceEvent(CustomerBalanceEventEnum.INVOICE_CREATED, updatedRecord);
                } else if (originalStatus === StatusEnum.ACTIVE) {
                    // ACTIVE → ACTIVE: Calculate and apply stock deltas
                    await this.applyStockDeltas(
                        originalInvoiceDetails.invoiceDetails || [],
                        updatedRecord.invoiceDetails || [],
                        updatedRecord.invoiceId
                    );

                    // Send customer balance delta event if amount changed
                    await this.sendCustomerBalanceDeltaEvent(
                        originalInvoiceDetails.finalAmount,
                        updatedRecord.finalAmount,
                        updatedRecord
                    );
                }

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
    private async validateInvoiceExists(recordId: string): Promise<InvoiceDto> {
        const existingRecord = await this.invoiceDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Invoice not found: ${recordId}`);
            throw new NotFoundException(`Invoice record not found for id ${recordId}`);
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
     * Applies stock deltas by comparing old and new invoice details
     */
    private async applyStockDeltas(oldDetails: any[], newDetails: any[], invoiceId: string): Promise<void> {
        // Build maps of stock quantities grouped by stockId
        const oldStockMap = this.buildStockMap(oldDetails);
        const newStockMap = this.buildStockMap(newDetails);

        const itemsToDeduct: { stockId: string; qty: number }[] = [];
        const itemsToRestore: { stockId: string; qty: number }[] = [];

        // Check all stock items in new details
        for (const [stockId, newQty] of newStockMap.entries()) {
            const oldQty = oldStockMap.get(stockId) || 0;
            const delta = newQty - oldQty;

            if (delta > 0) {
                // Quantity increased - deduct more
                itemsToDeduct.push({ stockId, qty: delta });
            } else if (delta < 0) {
                // Quantity decreased - restore some
                itemsToRestore.push({ stockId, qty: Math.abs(delta) });
            }
            // If delta === 0, no change needed
        }

        // Check for items that were completely removed
        for (const [stockId, oldQty] of oldStockMap.entries()) {
            if (!newStockMap.has(stockId)) {
                // Item removed - restore all
                itemsToRestore.push({ stockId, qty: oldQty });
            }
        }

        // Send deduction events
        if (itemsToDeduct.length > 0) {
            const deductEvent: InventoryEventDto = {
                inventoryEvent: InventoryEventEnum.INVOICE_APPROVED,
                stockItems: itemsToDeduct,
            };
            await this.sendInventoryEventMessage(deductEvent);
            this.logger.log(`Deducting stock for ${itemsToDeduct.length} items in invoice: ${invoiceId}`);
        }

        // Send restoration events
        if (itemsToRestore.length > 0) {
            const restoreEvent: InventoryEventDto = {
                inventoryEvent: InventoryEventEnum.INVOICE_DELETED,
                stockItems: itemsToRestore,
            };
            await this.sendInventoryEventMessage(restoreEvent);
            this.logger.log(`Restoring stock for ${itemsToRestore.length} items in invoice: ${invoiceId}`);
        }

        if (itemsToDeduct.length === 0 && itemsToRestore.length === 0) {
            this.logger.log(`No stock adjustments needed for invoice: ${invoiceId}`);
        }
    }

    /**
     * Builds a map of stockId to total quantity from invoice details
     * Handles cases where same stockId appears multiple times
     */
    private buildStockMap(details: any[]): Map<string, number> {
        const stockMap = new Map<string, number>();

        for (const detail of details) {
            if (detail.stockId && detail.qty !== undefined) {
                const currentQty = stockMap.get(detail.stockId) || 0;
                stockMap.set(detail.stockId, currentQty + detail.qty);
            }
        }

        return stockMap;
    }

    /**
     * Sends inventory event to SQS queue
     */
    private async sendInventoryEventMessage(inventoryEvent: InventoryEventDto): Promise<void> {
        const inventorySQSUrl = this.configService.get<string>('INVENTORY_EVENT_SQS');
        await this.messageQueueService.sendMessageToSQS(inventorySQSUrl, JSON.stringify(inventoryEvent));
    }

    /**
     * Sends INVOICE_APPROVED event to adjust stock quantities
     */
    private async sendInventoryApprovedEvent(invoice: InvoiceDto): Promise<void> {
        if (!invoice.invoiceDetails || invoice.invoiceDetails.length === 0) {
            return;
        }

        const stockItems = invoice.invoiceDetails.map((detail) => ({
            stockId: detail.stockId as string,
            qty: detail.qty as number,
        }));

        const inventoryEvent: InventoryEventDto = {
            inventoryEvent: InventoryEventEnum.INVOICE_APPROVED,
            stockItems: stockItems,
        };

        await this.sendInventoryEventMessage(inventoryEvent);
        this.logger.log(`INVOICE_APPROVED event sent for invoice: ${invoice.invoiceId}`);
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
     * Sends customer balance event to update customer balance
     */
    private async sendCustomerBalanceEvent(eventType: CustomerBalanceEventEnum, invoice: InvoiceDto): Promise<void> {
        if (!invoice.customerId) {
            this.logger.warn(`No customerId found for invoice ${invoice.invoiceId}, skipping balance event`);
            return;
        }

        const customerBalanceEvent: CustomerBalanceEventDto = {
            eventType,
            customerId: invoice.customerId,
            customerName: invoice.customerName,
            amount: invoice.finalAmount,
            referenceId: invoice.invoiceId,
            referenceNo: invoice.docno,
        };

        try {
            const customerEventSQSUrl = this.configService.get<string>('CUSTOMER_EVENT_SQS');
            await this.messageQueueService.sendMessageToSQS(customerEventSQSUrl, JSON.stringify(customerBalanceEvent));
            this.logger.log(
                `${eventType} event sent for invoice: ${invoice.invoiceId}, customer: ${invoice.customerId}, amount: ${invoice.finalAmount}`
            );
        } catch (error) {
            this.logger.error(`Failed to send ${eventType} event for invoice ${invoice.invoiceId}:`, error);
        }
    }

    /**
     * Sends customer balance delta event when invoice amount changes
     * Calculates the difference and sends appropriate event
     */
    private async sendCustomerBalanceDeltaEvent(
        originalAmount: number,
        newAmount: number,
        invoice: InvoiceDto
    ): Promise<void> {
        if (!invoice.customerId) {
            this.logger.warn(`No customerId found for invoice ${invoice.invoiceId}, skipping balance delta event`);
            return;
        }

        const delta = newAmount - originalAmount;

        if (delta === 0) {
            this.logger.log(`No amount change for invoice ${invoice.invoiceId}, skipping balance delta event`);
            return;
        }

        // If delta > 0: customer owes more → INVOICE_CREATED
        // If delta < 0: customer owes less → INVOICE_DELETED
        const eventType =
            delta > 0 ? CustomerBalanceEventEnum.INVOICE_CREATED : CustomerBalanceEventEnum.INVOICE_DELETED;
        const amount = Math.abs(delta);

        const customerBalanceEvent: CustomerBalanceEventDto = {
            eventType,
            customerId: invoice.customerId,
            customerName: invoice.customerName,
            amount,
            referenceId: invoice.invoiceId,
            referenceNo: invoice.docno,
        };

        try {
            const customerEventSQSUrl = this.configService.get<string>('CUSTOMER_EVENT_SQS');
            await this.messageQueueService.sendMessageToSQS(customerEventSQSUrl, JSON.stringify(customerBalanceEvent));
            this.logger.log(
                `${eventType} delta event sent for invoice: ${invoice.invoiceId}, customer: ${invoice.customerId}, ` +
                    `original: ${originalAmount}, new: ${newAmount}, delta: ${delta}`
            );
        } catch (error) {
            this.logger.error(`Failed to send ${eventType} delta event for invoice ${invoice.invoiceId}:`, error);
        }
    }

    /**
     * Checks for overpayment scenario and handles it by sending appropriate events
     * Overpayment occurs when: totalAmountPaid > newFinalAmount (after invoice amount reduction)
     */
    private async checkAndHandleOverpayment(
        originalAmount: number,
        newAmount: number,
        totalAmountPaid: number,
        invoice: InvoiceDto
    ): Promise<void> {
        // Only check if amount was reduced and there are existing payments
        if (newAmount >= originalAmount || totalAmountPaid === 0) {
            return;
        }

        // Check if overpayment occurred
        if (totalAmountPaid > newAmount) {
            const overpaymentAmount = totalAmountPaid - newAmount;

            this.logger.log(
                `⚠️ OVERPAYMENT detected for invoice ${invoice.invoiceId}: ` +
                    `totalAmountPaid=${totalAmountPaid}, newFinalAmount=${newAmount}, ` +
                    `overpayment=${overpaymentAmount}`
            );

            // Send INVOICE_AMOUNT_CHANGED event to invoicing SQS to update payment status
            await this.sendInvoiceAmountChangedEvent(invoice, originalAmount, newAmount, totalAmountPaid);

            // Send OVERPAYMENT_CREDIT event to customer SQS to add credit
            await this.sendOverpaymentCreditEvent(invoice, overpaymentAmount);
        }
    }

    /**
     * Sends INVOICE_AMOUNT_CHANGED event to invoicing SQS
     * This triggers the invoice payment handler to recalculate payment status
     */
    private async sendInvoiceAmountChangedEvent(
        invoice: InvoiceDto,
        oldFinalAmount: number,
        newFinalAmount: number,
        totalAmountPaid: number
    ): Promise<void> {
        const invoiceAmountChangedDto: InvoiceAmountChangedDto = {
            invoiceId: invoice.invoiceId,
            docno: invoice.docno,
            customerId: invoice.customerId,
            customerName: invoice.customerName,
            oldFinalAmount,
            newFinalAmount,
            totalAmountPaid,
        };

        const eventPayload = {
            eventType: InvoicePaymentEventEnum.INVOICE_AMOUNT_CHANGED,
            invoiceData: invoiceAmountChangedDto,
        };

        try {
            const invoicingEventSQSUrl = this.configService.get<string>('INVOICE_EVENT_SQS');
            await this.messageQueueService.sendMessageToSQS(invoicingEventSQSUrl, JSON.stringify(eventPayload));
            this.logger.log(
                `INVOICE_AMOUNT_CHANGED event sent for invoice: ${invoice.invoiceId}, ` +
                    `old: ${oldFinalAmount}, new: ${newFinalAmount}`
            );
        } catch (error) {
            this.logger.error(`Failed to send INVOICE_AMOUNT_CHANGED event for invoice ${invoice.invoiceId}:`, error);
        }
    }

    /**
     * Sends OVERPAYMENT_CREDIT event to customer SQS
     * This adds the overpayment amount to customer's credit
     */
    private async sendOverpaymentCreditEvent(invoice: InvoiceDto, creditAmount: number): Promise<void> {
        if (!invoice.customerId) {
            this.logger.warn(`No customerId found for invoice ${invoice.invoiceId}, skipping overpayment credit event`);
            return;
        }

        const customerBalanceEvent: CustomerBalanceEventDto = {
            eventType: CustomerBalanceEventEnum.OVERPAYMENT_CREDIT,
            customerId: invoice.customerId,
            customerName: invoice.customerName,
            amount: creditAmount, // Also adjust balance to offset negative from invoice reduction
            creditAmount, // Amount to add to customerCredit
            referenceId: invoice.invoiceId,
            referenceNo: invoice.docno,
        };

        try {
            const customerEventSQSUrl = this.configService.get<string>('CUSTOMER_EVENT_SQS');
            await this.messageQueueService.sendMessageToSQS(customerEventSQSUrl, JSON.stringify(customerBalanceEvent));
            this.logger.log(
                `OVERPAYMENT_CREDIT event sent for invoice: ${invoice.invoiceId}, ` +
                    `customer: ${invoice.customerId}, creditAmount: ${creditAmount}`
            );
        } catch (error) {
            this.logger.error(`Failed to send OVERPAYMENT_CREDIT event for invoice ${invoice.invoiceId}:`, error);
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
}
