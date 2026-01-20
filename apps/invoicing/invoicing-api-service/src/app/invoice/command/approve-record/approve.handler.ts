import { UserCognito } from '@auth-guard-lib';
import {
    ErrorResponseDto,
    InventoryEventDto,
    InventoryEventEnum,
    InvoiceDetailsDto,
    InvoiceDto,
    ResponseDto,
    StatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { StockDatabaseServiceAbstract } from '@inventory-database-service';
import { InvoiceDatabaseServiceAbstract } from '@invoicing-database-service';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
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
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        @Inject('StockDatabaseService')
        private readonly stockDatabaseService: StockDatabaseServiceAbstract,
        private readonly configService: ConfigService
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
        existingRecord.forApprovalVersion = {};
        // Reset changeReason to null AFTER applying forApprovalVersion
        existingRecord.changeReason = null;

        // Update record in database
        const updatedRecord = await this.invoiceDatabaseService.updateRecord(existingRecord);

        // Handle stock adjustments based on original status
        if (originalStatus === StatusEnum.ACTIVE) {
            // ACTIVE → FOR_APPROVAL → ACTIVE: Calculate and apply stock deltas
            await this.applyStockDeltas(
                originalInvoiceDetails,
                updatedRecord.invoiceDetails || [],
                updatedRecord.invoiceId
            );
        } else {
            // NEW_RECORD or DRAFT → FOR_APPROVAL → ACTIVE: Deduct all stock (first time)
            const stockItems = updatedRecord.invoiceDetails?.map((detail) => ({
                stockId: detail.stockId as string,
                qty: detail.qty as number,
            }));

            const inventoryEvent: InventoryEventDto = {
                inventoryEvent: InventoryEventEnum.INVOICE_APPROVED,
                stockItems: stockItems,
            };
            await this.sendInventoryEventMessage(inventoryEvent);
        }

        this.logger.log(`Invoice approved successfully: ${existingRecord.invoiceId}`);
        return new ResponseDto<InvoiceDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deletion of an invoice
     */
    private async approveDeletion(existingRecord: InvoiceDto): Promise<ResponseDto<InvoiceDto>> {
        await this.invoiceDatabaseService.deleteRecord(existingRecord);

        // Check original status from forApprovalVersion (stored by delete handler)
        // Only restore stock if invoice was originally ACTIVE (not NEW_RECORD or DRAFT)
        const originalStatus = existingRecord.forApprovalVersion?.originalStatus as StatusEnum | undefined;

        if (originalStatus === StatusEnum.ACTIVE) {
            //get stock items for inventory event
            const stockItems = existingRecord.invoiceDetails?.map((detail) => {
                return {
                    stockId: detail.stockId as string,
                    qty: detail.qty as number,
                };
            });

            //send inventory event to restore stock quantities
            const inventoryEvent: InventoryEventDto = {
                inventoryEvent: InventoryEventEnum.INVOICE_DELETED,
                stockItems: stockItems,
            };
            await this.sendInventoryEventMessage(inventoryEvent);
        }

        this.logger.log(`Invoice deletion approved: ${existingRecord.invoiceId}`);
        return new ResponseDto<InvoiceDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Applies stock deltas by comparing old and new invoice details
     */
    private async applyStockDeltas(
        oldDetails: any[],
        newDetails: any[],
        invoiceId: string
    ): Promise<void> {
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

    private async sendInventoryEventMessage(inventoryEvent: InventoryEventDto): Promise<void> {
        const inventorySQSUrl = this.configService.get<string>('INVENTORY_EVENT_SQS');
        await this.messageQueueService.sendMessageToSQS(inventorySQSUrl, JSON.stringify(inventoryEvent));
    }
}
