import {
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
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteInvoiceCommand } from './delete.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(DeleteInvoiceCommand)
export class DeleteInvoiceHandler implements ICommandHandler<DeleteInvoiceCommand> {
    protected readonly logger = new Logger(DeleteInvoiceHandler.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService
    ) {}

    async execute(command: DeleteInvoiceCommand): Promise<ResponseDto<InvoiceDto | ErrorResponseDto>> {
        this.logger.log(`Processing delete request for invoice: ${command.id}`);

        try {
            // Fetch and validate existing invoice record
            const existingRecord = await this.validateInvoiceExists(command.id);

            // Store original status before modification
            const originalStatus = existingRecord.status;

            // Check user authorization
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateInvoiceStatus(command, existingRecord, hasApprovalPermission, originalStatus);

            // Delete or mark for deletion based on permissions and original status
            const deletedRecord = await this.performDeletion(
                command,
                existingRecord,
                hasApprovalPermission,
                originalStatus
            );

            this.logger.log(`Invoice deleted successfully: ${deletedRecord.invoiceId}`);
            return new ResponseDto<InvoiceDto>(deletedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.id);
        }
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
     * Checks if user has permission to delete directly
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
        command: DeleteInvoiceCommand,
        existingRecord: InvoiceDto,
        hasApprovalPermission: boolean,
        originalStatus: StatusEnum
    ): void {
        // Set the ID
        command.invoiceDto.invoiceId = command.id;

        if (hasApprovalPermission) {
            // User can delete directly - set to FOR_DELETION for hard delete
            command.invoiceDto.status = StatusEnum.FOR_DELETION;
            command.invoiceDto.activityLogs = existingRecord.activityLogs || [];
            command.invoiceDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Invoice deleted by ${command.user.username}, status set to ${StatusEnum.FOR_DELETION}`
            );
            // Limit activity logs to last 10 entries
            command.invoiceDto.activityLogs = reduceArrayContents(command.invoiceDto.activityLogs, ACTIVITY_LOGS_LIMIT);
        } else {
            // User needs approval - set to FOR_DELETION for soft delete
            // Store original status in forApprovalVersion for later reference
            command.invoiceDto.status = StatusEnum.FOR_DELETION;
            command.invoiceDto.forApprovalVersion = command.invoiceDto.forApprovalVersion || {};
            command.invoiceDto.forApprovalVersion.originalStatus = originalStatus;
            command.invoiceDto.activityLogs = existingRecord.activityLogs || [];
            command.invoiceDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Invoice deletion requested by ${command.user.username} for approval`
            );
            // Limit activity logs to last 10 entries
            command.invoiceDto.activityLogs = reduceArrayContents(command.invoiceDto.activityLogs, ACTIVITY_LOGS_LIMIT);
        }
    }

    /**
     * Performs the actual deletion based on user permissions
     */
    private async performDeletion(
        command: DeleteInvoiceCommand,
        existingRecord: InvoiceDto,
        hasApprovalPermission: boolean,
        originalStatus: StatusEnum
    ): Promise<InvoiceDto> {
        let result: InvoiceDto;

        if (hasApprovalPermission) {
            // Hard delete - restore stock only if invoice was ACTIVE/APPROVED
            result = await this.invoiceDatabaseService.deleteRecord(command.invoiceDto);

            // Only restore stock if invoice was approved (not DRAFT or NEW_RECORD)
            if (originalStatus === StatusEnum.ACTIVE) {
                await this.restoreStockQuantities(existingRecord);
            }
        } else if (originalStatus === StatusEnum.DRAFT) {
            // DRAFT deletion - no stock restoration needed (drafts don't reserve stock)
            result = await this.invoiceDatabaseService.deleteRecord(command.invoiceDto);
        } else {
            // Soft delete (mark for deletion) - will restore stock when approved
            result = await this.invoiceDatabaseService.updateRecord(command.invoiceDto);
        }

        return result;
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
        console.log('Sending inventory event message:', inventoryEvent);
        const inventorySQSUrl = this.configService.get<string>('INVENTORY_EVENT_SQS');
        await this.messageQueueService.sendMessageToSQS(inventorySQSUrl, JSON.stringify(inventoryEvent));
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing delete request for ${recordId}:`, error);

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
}
