import {
    ContractPaymentDto,
    ContractPaymentEventEnum,
    CustomerBalanceEventDto,
    CustomerBalanceEventEnum,
    ErrorResponseDto,
    InvoicePaymentDto,
    InvoicePaymentEventEnum,
    PaymentDto,
    ResponseDto,
    StatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { PaymentDatabaseServiceAbstractClass } from '@invoicing-database-service';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeletePaymentCommand } from './delete.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(DeletePaymentCommand)
export class DeletePaymentHandler implements ICommandHandler<DeletePaymentCommand> {
    protected readonly logger = new Logger(DeletePaymentHandler.name);

    constructor(
        @Inject('PaymentDatabaseService')
        private readonly paymentDatabaseService: PaymentDatabaseServiceAbstractClass,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService
    ) {}

    async execute(command: DeletePaymentCommand): Promise<ResponseDto<PaymentDto | ErrorResponseDto>> {
        this.logger.log(`Processing delete request for payment: ${command.id}`);

        try {
            // Fetch and validate existing payment record
            const existingRecord = await this.validatePaymentExists(command.id);

            // Store original status before modification
            const originalStatus = existingRecord.status;

            // Check user authorization
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updatePaymentStatus(command, existingRecord, hasApprovalPermission, originalStatus);

            // Delete or mark for deletion based on permissions
            const deletedRecord = await this.performDeletion(command, hasApprovalPermission, originalStatus);

            this.logger.log(`Payment deleted successfully: ${deletedRecord.paymentId}`);
            return new ResponseDto<PaymentDto>(deletedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.id);
        }
    }

    /**
     * Validates that the payment exists
     */
    private async validatePaymentExists(recordId: string): Promise<PaymentDto> {
        const existingRecord = await this.paymentDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Payment not found: ${recordId}`);
            throw new NotFoundException(`Payment record not found for id ${recordId}`);
        }

        return existingRecord;
    }

    /**
     * Checks if user has permission to delete directly
     */
    private hasApprovalPermission(userRoles?: string[]): boolean {
        console.log('userRoles', userRoles);
        if (!userRoles || userRoles.length === 0) {
            return false;
        }

        return userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);
    }

    /**
     * Updates payment status and activity logs based on user permissions
     */
    private updatePaymentStatus(
        command: DeletePaymentCommand,
        existingRecord: PaymentDto,
        hasApprovalPermission: boolean,
        originalStatus: StatusEnum
    ): void {
        // Set the ID
        command.paymentDto.paymentId = command.id;

        // Copy paymentInvoiceDetails from existing record for event sending
        command.paymentDto.paymentInvoiceDetails = existingRecord.paymentInvoiceDetails;
        command.paymentDto.receiptNo = existingRecord.receiptNo;
        command.paymentDto.paymentDate = existingRecord.paymentDate;
        command.paymentDto.paymentAmount = existingRecord.paymentAmount;
        command.paymentDto.contractPayment = existingRecord.contractPayment;
        command.paymentDto.contractId = existingRecord.contractId;
        command.paymentDto.customerId = existingRecord.customerId;
        command.paymentDto.customerName = existingRecord.customerName;

        if (hasApprovalPermission) {
            // User can delete directly - set to FOR_DELETION for hard delete
            command.paymentDto.status = StatusEnum.FOR_DELETION;
            command.paymentDto.activityLogs = existingRecord.activityLogs || [];
            command.paymentDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Payment deleted by ${command.user.username}, status set to ${StatusEnum.FOR_DELETION}`
            );

            // Limit activity logs to last 10 entries
            command.paymentDto.activityLogs = reduceArrayContents(command.paymentDto.activityLogs, ACTIVITY_LOGS_LIMIT);
        } else {
            // User needs approval - set to FOR_DELETION for soft delete
            // Store original status in forApprovalVersion for later reference (matching invoice pattern)
            command.paymentDto.status = StatusEnum.FOR_DELETION;
            command.paymentDto.forApprovalVersion = command.paymentDto.forApprovalVersion || {};
            command.paymentDto.forApprovalVersion.originalStatus = originalStatus;
            command.paymentDto.activityLogs = existingRecord.activityLogs || [];
            command.paymentDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Payment deletion requested by ${command.user.username} for approval`
            );

            // Limit activity logs to last 10 entries
            command.paymentDto.activityLogs = reduceArrayContents(command.paymentDto.activityLogs, ACTIVITY_LOGS_LIMIT);
        }
    }

    /**
     * Performs the actual deletion based on user permissions
     */
    private async performDeletion(
        command: DeletePaymentCommand,
        hasApprovalPermission: boolean,
        originalStatus: StatusEnum
    ): Promise<PaymentDto> {
        if (hasApprovalPermission) {
            // Only send events if payment was ACTIVE (approved)
            // NEW_RECORD payments never had events sent, so no reversal needed
            if (originalStatus === StatusEnum.ACTIVE) {
                // Send PAYMENT_DELETED events BEFORE hard delete
                if (command.paymentDto.paymentInvoiceDetails && command.paymentDto.paymentInvoiceDetails.length > 0) {
                    for (const detail of command.paymentDto.paymentInvoiceDetails) {
                        const invoicePaymentDto: InvoicePaymentDto = {
                            invoiceId: detail.invoiceId,
                            receiptNo: command.paymentDto.receiptNo,
                            paymentDate: command.paymentDto.paymentDate,
                            paymentAmount: detail.amountApplied,
                            contractPayment: command.paymentDto.contractPayment,
                            paymentId: command.paymentDto.paymentId,
                        };

                        await this.sendInvoicePaymentEvent(InvoicePaymentEventEnum.PAYMENT_DELETED, invoicePaymentDto);
                    }

                    this.logger.log(
                        `Sent PAYMENT_DELETED events for ${command.paymentDto.paymentInvoiceDetails.length} invoices in payment ${command.paymentDto.paymentId}`
                    );
                }

                // Send contract payment deletion event if this is a contract payment
                if (command.paymentDto.contractPayment && command.paymentDto.contractId) {
                    await this.sendContractPaymentEvent(ContractPaymentEventEnum.PAYMENT_DELETED, command.paymentDto);
                }

                // Send customer balance event for non-contract payments
                // Contract payments don't affect customer balance directly
                if (!command.paymentDto.contractPayment && command.paymentDto.customerId) {
                    await this.sendCustomerBalanceEvent(CustomerBalanceEventEnum.PAYMENT_DELETED, command.paymentDto);
                }
            } else {
                this.logger.log(
                    `Skipping deletion events for payment ${command.paymentDto.paymentId} - original status was ${originalStatus}, not ACTIVE`
                );
            }

            // Hard delete
            return await this.paymentDatabaseService.deleteRecord(command.paymentDto);
        } else {
            // Soft delete (mark for deletion)
            return await this.paymentDatabaseService.updateRecord(command.paymentDto);
        }
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
     * Sends invoice payment event to SQS queue
     */
    private async sendInvoicePaymentEvent(
        eventType: InvoicePaymentEventEnum,
        paymentData: InvoicePaymentDto
    ): Promise<void> {
        const invoicingEventSQSUrl = this.configService.get<string>('INVOICE_EVENT_SQS');

        const eventPayload = {
            eventType,
            paymentData,
        };

        await this.messageQueueService.sendMessageToSQS(invoicingEventSQSUrl, JSON.stringify(eventPayload));
    }

    /**
     * Sends customer balance event to update customer balance
     */
    private async sendCustomerBalanceEvent(eventType: CustomerBalanceEventEnum, payment: PaymentDto): Promise<void> {
        if (!payment.customerId) {
            this.logger.warn(`No customerId found for payment ${payment.paymentId}, skipping balance event`);
            return;
        }

        const customerBalanceEvent: CustomerBalanceEventDto = {
            eventType,
            customerId: payment.customerId,
            customerName: payment.customerName,
            amount: payment.paymentAmount,
            referenceId: payment.paymentId,
            referenceNo: payment.receiptNo,
        };

        try {
            const customerEventSQSUrl = this.configService.get<string>('CUSTOMER_EVENT_SQS');
            await this.messageQueueService.sendMessageToSQS(customerEventSQSUrl, JSON.stringify(customerBalanceEvent));
            this.logger.log(
                `${eventType} event sent for payment: ${payment.paymentId}, customer: ${payment.customerId}, amount: ${payment.paymentAmount}`
            );
        } catch (error) {
            this.logger.error(`Failed to send ${eventType} event for payment ${payment.paymentId}:`, error);
        }
    }

    /**
     * Sends contract payment event to SQS queue
     */
    private async sendContractPaymentEvent(eventType: ContractPaymentEventEnum, payment: PaymentDto): Promise<void> {
        const contractPaymentDto: ContractPaymentDto = {
            contractId: payment.contractId,
            receiptNo: payment.receiptNo,
            paymentDate: payment.paymentDate,
            paymentAmount: payment.paymentAmount,
            contractPayment: payment.contractPayment,
            paymentId: payment.paymentId,
        };

        const invoicingEventSQSUrl = this.configService.get<string>('INVOICE_EVENT_SQS');

        const eventPayload = {
            eventType,
            paymentData: contractPaymentDto,
        };

        await this.messageQueueService.sendMessageToSQS(invoicingEventSQSUrl, JSON.stringify(eventPayload));

        this.logger.log(`Sent ${eventType} event for contract ${payment.contractId}, payment ${payment.paymentId}`);
    }
}
