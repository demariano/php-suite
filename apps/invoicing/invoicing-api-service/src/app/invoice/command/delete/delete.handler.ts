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
import {
    InvoiceDatabaseServiceAbstract,
    PaymentInvoiceDatabaseServiceAbstractClass,
} from '@invoicing-database-service';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InvoiceStockDeltaService } from '../../../shared/invoice-stock-delta.service';
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
        private readonly configService: ConfigService,
        @Inject('PaymentInvoiceDatabaseService')
        private readonly paymentInvoiceDatabaseService: PaymentInvoiceDatabaseServiceAbstractClass,
        private readonly invoiceStockDeltaService: InvoiceStockDeltaService
    ) {}

    async execute(command: DeleteInvoiceCommand): Promise<ResponseDto<InvoiceDto | ErrorResponseDto>> {
        this.logger.log(`Processing delete request for invoice: ${command.id}`);

        try {
            // Fetch and validate existing invoice record
            const existingRecord = await this.validateInvoice(command.id);

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

            // If invoice was ACTIVE and has contractId, trigger recalculation since invoice is no longer ACTIVE
            if (originalStatus === StatusEnum.ACTIVE && existingRecord.contractId) {
                command.invoiceDto.forApprovalVersion.shouldRecalculateContract = true;
            }
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
        const contractId = existingRecord.contractId; // Store before deletion

        if (hasApprovalPermission) {
            const invoicePayloads: InvoicePaymentEventDto[] = [];

            // Hard delete - restore stock only if invoice was ACTIVE/APPROVED
            result = await this.invoiceDatabaseService.deleteRecord(command.invoiceDto);

            // Only restore stock if invoice was approved (not DRAFT or NEW_RECORD)
            if (originalStatus === StatusEnum.ACTIVE) {
                await this.invoiceStockDeltaService.sendFullRestoration(
                    existingRecord.invoiceDetails,
                    existingRecord.invoiceId
                );

                const invoicePaymentDto: InvoicePaymentEventDto = {
                    invoiceId: existingRecord.invoiceId,
                    customerId: existingRecord.customerId,
                    invoicePaymentEvent: InvoicePaymentEventEnum.INVOICE_DELETED,
                };
                invoicePayloads.push(invoicePaymentDto);
                await this.sendInvoicePaymentEvent(invoicePayloads);
            }

            // If invoice had a contractId and was ACTIVE, trigger recalculation of contract invoiced amount
            if (contractId && originalStatus === StatusEnum.ACTIVE) {
                await this.sendContractInvoiceEvent(ContractInvoiceEventEnum.RECALCULATE_INVOICED_AMOUNT, contractId);
            }
        } else if (originalStatus === StatusEnum.DRAFT) {
            // DRAFT deletion - no stock restoration needed (drafts don't reserve stock)
            result = await this.invoiceDatabaseService.deleteRecord(command.invoiceDto);
        } else {
            // Soft delete (mark for deletion) - will restore stock when approved
            result = await this.invoiceDatabaseService.updateRecord(command.invoiceDto);

            // GAP #5 optimization: Contract event removed from FOR_DELETION marking
            // Recalculation will happen on approval (in approve.handler.ts when deletion is approved)
            // This avoids redundant recalculation when invoice is marked FOR_DELETION
        }

        return result;
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

    private async sendInvoicePaymentEvent(paymentData: InvoicePaymentEventDto[]): Promise<void> {
        const invoicingEventSQSUrl = this.configService.get<string>('INVOICE_EVENT_SQS');

        const eventPayload = {
            eventType: InvoicePaymentEventEnum.CUSTOMER_BALANCE_UPDATE, // Using CUSTOMER_BALANCE_UPDATE as a generic event type for invoice payment changes
            paymentData,
        };

        await this.messageQueueService.sendMessageToSQS(invoicingEventSQSUrl, JSON.stringify(eventPayload));
    }
}
