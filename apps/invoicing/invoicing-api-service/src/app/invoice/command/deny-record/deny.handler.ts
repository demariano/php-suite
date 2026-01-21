import {
    ContractInvoiceEventEnum,
    ErrorResponseDto,
    InventoryEventDto,
    InventoryEventEnum,
    InvoiceDto,
    ResponseDto,
    StatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { InvoiceDatabaseServiceAbstract } from '@invoicing-database-service';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DenyInvoiceCommand } from './deny.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DenyInvoiceCommand)
export class DenyInvoiceHandler implements ICommandHandler<DenyInvoiceCommand> {
    protected readonly logger = new Logger(DenyInvoiceHandler.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService
    ) {}

    async execute(command: DenyInvoiceCommand): Promise<ResponseDto<InvoiceDto | ErrorResponseDto>> {
        this.logger.log(`Processing denial request for invoice: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateInvoiceExists(command.recordId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process denial based on current status
            return await this.processDenial(existingRecord, command);
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
     * Validates that the user has authorization to deny
     */
    private validateUserAuthorization(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new ForbiddenException('User roles not found');
        }

        const hasDenyPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasDenyPermission) {
            throw new ForbiddenException('Current user is not authorized to deny invoice change request');
        }
    }

    /**
     * Processes the denial based on the current status of the record
     */
    private async processDenial(
        existingRecord: InvoiceDto,
        command: DenyInvoiceCommand
    ): Promise<ResponseDto<InvoiceDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denyInvoice(existingRecord, command);
            case StatusEnum.FOR_DELETION:
                return await this.denyDeletion(existingRecord, command);
            case StatusEnum.NEW_RECORD:
                return await this.deleteRecord(existingRecord);
            default:
                throw new BadRequestException(`Cannot deny invoice with status: ${existingRecord.status}`);
        }
    }

    /**
     * Denies an invoice for approval
     */
    private async denyInvoice(
        existingRecord: InvoiceDto,
        command: DenyInvoiceCommand
    ): Promise<ResponseDto<InvoiceDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Invoice denied by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        //add a new activity log for the using the approver message
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Invoice denied by ${command.user.username}, approver message: ${command.approverMessage}`
        );

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.approverMessage = null;
        // Clear forApprovalVersion first, then reset changeReason
        existingRecord.forApprovalVersion = {};
        existingRecord.changeReason = null;

        // Update record in database
        const updatedRecord = await this.invoiceDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Invoice denied successfully: ${existingRecord.invoiceId}`);
        return new ResponseDto<InvoiceDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Denies deletion of an invoice
     */
    private async denyDeletion(
        existingRecord: InvoiceDto,
        command: DenyInvoiceCommand
    ): Promise<ResponseDto<InvoiceDto>> {
        // Reset changeReason before reverting status
        existingRecord.changeReason = null;

        // Revert status to ACTIVE
        existingRecord.status = StatusEnum.ACTIVE;

        // Add denial activity log
        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Invoice deletion denied by ${command.user.username}, approver message: ${
                command.approverMessage
            }, status reverted to ${StatusEnum.ACTIVE}`
        );

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Update record in database
        const updatedRecord = await this.invoiceDatabaseService.updateRecord(existingRecord);

        // Send contract event to recalculate since invoice reverted to ACTIVE (GAP #3 fix)
        if (updatedRecord.contractId) {
            await this.sendContractInvoiceEvent(
                ContractInvoiceEventEnum.RECALCULATE_INVOICED_AMOUNT,
                updatedRecord.contractId
            );
            this.logger.log(
                `Contract event sent for denied deletion: ${updatedRecord.invoiceId}, contract: ${updatedRecord.contractId}`
            );
        }

        this.logger.log(`Invoice deletion denied: ${existingRecord.invoiceId}`);
        return new ResponseDto<InvoiceDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Deletes an invoice when it is a new record and it was denied
     * NEW_RECORD invoices don't reserve stock, so no restoration needed
     */
    private async deleteRecord(existingRecord: InvoiceDto): Promise<ResponseDto<InvoiceDto>> {
        this.logger.log(`Invoice deleted: ${existingRecord.invoiceId}`);
        await this.invoiceDatabaseService.deleteRecord(existingRecord);

        // NEW_RECORD invoices don't reserve/deduct stock (Option 1 architecture)
        // No stock restoration needed

        return new ResponseDto<InvoiceDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Restores stock quantities by publishing inventory event
     */
    private async restoreStockQuantities(invoice: InvoiceDto): Promise<void> {
        if (!invoice.invoiceDetails || invoice.invoiceDetails.length === 0) {
            this.logger.log('No invoice details to restore stock for');
            return;
        }

        const stockItems = invoice.invoiceDetails
            .filter((detail) => detail.stockId && detail.qty)
            .map((detail) => ({
                stockId: detail.stockId as string,
                qty: detail.qty as number,
            }));

        if (stockItems.length === 0) {
            this.logger.log('No stock items found in invoice details');
            return;
        }

        const inventoryEvent: InventoryEventDto = {
            inventoryEvent: InventoryEventEnum.INVOICE_DELETED,
            stockItems: stockItems,
        };

        await this.sendInventoryEventMessage(inventoryEvent);
        this.logger.log(`Published inventory event to restore ${stockItems.length} stock items`);
    }

    /**
     * Sends inventory event to SQS queue
     */
    private async sendInventoryEventMessage(inventoryEvent: InventoryEventDto): Promise<void> {
        const inventorySQSUrl = this.configService.get<string>('INVENTORY_EVENT_SQS');
        await this.messageQueueService.sendMessageToSQS(inventorySQSUrl, JSON.stringify(inventoryEvent));
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing denial request for ${recordId}:`, error);

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
     * Sends contract invoice event to SQS for processing
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
}
