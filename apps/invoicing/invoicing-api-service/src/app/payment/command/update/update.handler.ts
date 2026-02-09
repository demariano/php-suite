import { CustomerDatabaseServiceAbstract } from '@customer-database-service';
import {
    ContractPaymentDto,
    ContractPaymentEventEnum,
    ErrorResponseDto,
    InvoicePaymentEventDto,
    InvoicePaymentEventEnum,
    PaymentDto,
    ResponseDto,
    StatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { detectFieldChanges, formatFieldChanges } from '@field-change-utils-lib';
import {
    PaymentDatabaseServiceAbstractClass,
    PaymentInvoiceDatabaseServiceAbstractClass,
} from '@invoicing-database-service';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdatePaymentCommand } from './update.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(UpdatePaymentCommand)
export class UpdatePaymentHandler implements ICommandHandler<UpdatePaymentCommand> {
    protected readonly logger = new Logger(UpdatePaymentHandler.name);

    constructor(
        @Inject('PaymentDatabaseService')
        private readonly paymentDatabaseService: PaymentDatabaseServiceAbstractClass,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService,
        @Inject('PaymentInvoiceDatabaseService')
        private readonly paymentInvoiceDatabaseService: PaymentInvoiceDatabaseServiceAbstractClass,
        @Inject('CustomerDatabaseService')
        private readonly customerDatabaseService: CustomerDatabaseServiceAbstract
    ) {}

    async execute(command: UpdatePaymentCommand): Promise<ResponseDto<PaymentDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for payment: ${command.id}`);

        try {
            // Validate that payment exists
            const existingRecord = await this.validatePayment(command.id);

            // Store original values before any modifications
            const originalStatus = existingRecord.status;
            const originalPaymentAmount = existingRecord.paymentAmount;

            // Receipt number validation removed - receipt numbers are immutable after creation

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updatePaymentStatus(
                command,
                existingRecord,
                hasApprovalPermission,
                originalStatus,
                originalPaymentAmount
            );

            // Update record in database
            const updatedRecord = await this.paymentDatabaseService.updateRecord(existingRecord);
            if (updatedRecord.status == StatusEnum.ACTIVE) {
                // If payment is active, ensure payment-invoice details are also updated in their table
                // First, delete existing payment-invoice details for this payment
                const existingPaymentInvoices = await this.paymentInvoiceDatabaseService.findRecordByPaymentId(
                    updatedRecord.paymentId
                );

                const paymentInvoicePayloads: InvoicePaymentEventDto[] = [];

                for (const pi of existingPaymentInvoices) {
                    await this.paymentInvoiceDatabaseService.deleteRecord(pi);
                    const invoicePaymentDto: InvoicePaymentEventDto = {
                        invoiceId: pi.invoiceId,
                        receiptNo: updatedRecord.receiptNo,
                        paymentDate: updatedRecord.paymentDate,
                        paymentAmount: pi.amountApplied,
                        contractPayment: updatedRecord.contractPayment,
                        paymentId: updatedRecord.paymentId,
                        customerId: updatedRecord.customerId,
                        customerCreditPayment: pi.customerCreditPayment,
                        invoicePaymentEvent: InvoicePaymentEventEnum.PAYMENT_DELETED,
                    };
                    paymentInvoicePayloads.push(invoicePaymentDto);
                }
                // Then, recreate payment-invoice details from updated record
                for (const piDto of updatedRecord.paymentInvoiceDetails) {
                    await this.paymentInvoiceDatabaseService.createRecord({
                        paymentId: updatedRecord.paymentId,
                        invoiceId: piDto.invoiceId,
                        docno: piDto.docno,
                        amountApplied: piDto.amountApplied,
                        dateCreated: new Date().toISOString(),
                        customerCreditPayment: piDto.customerCreditPayment,
                    });
                    const invoicePaymentDto: InvoicePaymentEventDto = {
                        invoiceId: piDto.invoiceId,
                        receiptNo: updatedRecord.receiptNo,
                        paymentDate: updatedRecord.paymentDate,
                        paymentAmount: piDto.amountApplied,
                        contractPayment: updatedRecord.contractPayment,
                        paymentId: updatedRecord.paymentId,
                        customerId: updatedRecord.customerId,
                        customerCreditPayment: piDto.customerCreditPayment,
                        invoicePaymentEvent: InvoicePaymentEventEnum.PAYMENT_ADDED,
                    };
                    paymentInvoicePayloads.push(invoicePaymentDto);
                }

                await this.sendInvoicePaymentEvent(paymentInvoicePayloads);
            }

            // Send contract payment update event for admin updates on contract payments
            if (hasApprovalPermission && updatedRecord.contractPayment && updatedRecord.contractId) {
                await this.sendContractPaymentEvent(ContractPaymentEventEnum.PAYMENT_UPDATED, updatedRecord);
            }

            this.logger.log(`Payment updated successfully: ${updatedRecord.paymentId}`);
            return new ResponseDto<PaymentDto>(updatedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.id);
        }
    }

    /**
     * Validates that the payment exists
     */
    private async validatePayment(recordId: string): Promise<PaymentDto> {
        const existingRecord = await this.paymentDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Payment not found: ${recordId}`);
            throw new NotFoundException(`Payment record not found for id ${recordId}`);
        }

        //check if payment is custome credit , if yes deny the update
        if (existingRecord.customerCreditPayment) {
            this.logger.warn(`Attempt to update customer credit payment: ${recordId}`);
            throw new BadRequestException(`Customer credit payments cannot be updated.`);
        }

        return existingRecord;
    }

    // validateReceiptNoUnique method removed - receipt numbers are immutable after creation

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
     * Updates payment status and activity logs based on user permissions
     */
    private updatePaymentStatus(
        command: UpdatePaymentCommand,
        existingRecord: PaymentDto,
        hasApprovalPermission: boolean,
        originalStatus: StatusEnum,
        originalPaymentAmount: number
    ): void {
        if (hasApprovalPermission) {
            // Store old invoice details BEFORE update for delta calculation
            const oldPaymentInvoiceDetails = existingRecord.paymentInvoiceDetails || [];

            // User can approve directly - update the existing record
            existingRecord.status = StatusEnum.ACTIVE;
            existingRecord.paymentDate = command.paymentDto.paymentDate;
            existingRecord.paymentAmount = command.paymentDto.paymentAmount;
            existingRecord.customerId = command.paymentDto.customerId;
            existingRecord.customerName = command.paymentDto.customerName;
            // Receipt number not updated - immutable after creation
            existingRecord.contractPayment = command.paymentDto.contractPayment;
            existingRecord.contractId = command.paymentDto.contractId;
            existingRecord.contractName = command.paymentDto.contractName;
            existingRecord.contractNo = command.paymentDto.contractNo;
            existingRecord.chequeClearStatus = command.paymentDto.chequeClearStatus;
            existingRecord.paymentDetails = command.paymentDto.paymentDetails;
            existingRecord.paymentInvoiceDetails = command.paymentDto.paymentInvoiceDetails;
            // Clear changeReason for admin users since changes are applied directly
            existingRecord.changeReason = undefined;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Payment updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`;
            existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

            // Limit activity logs to last 10 entries
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

            // Store for delta event sending after database update
            (existingRecord as any).__oldPaymentInvoiceDetails = oldPaymentInvoiceDetails;
        } else {
            // User needs approval - store changes in forApprovalVersion, keep existing record unchanged
            existingRecord.status = StatusEnum.FOR_APPROVAL;
            existingRecord.activityLogs = existingRecord.activityLogs || [];

            // Detect field changes
            const fieldChanges = detectFieldChanges(existingRecord, command.paymentDto, {});
            const formattedChanges = formatFieldChanges(fieldChanges);

            // Build activity log message
            let activityLogMessage = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Payment updated by ${command.user.username} for approval`;

            // Append changes to activity log if any changes detected
            if (formattedChanges) {
                activityLogMessage += ` - ${formattedChanges}`;
            }

            existingRecord.activityLogs.push(activityLogMessage);

            // Preserve user's manually entered changeReason and combine with auto-generated changes
            const userChangeReason = command.paymentDto.changeReason?.trim();
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
                originalStatus: originalStatus, // Store original status for approval delta calculation
                originalPaymentAmount: originalPaymentAmount, // Store original amount for balance delta calculation
                paymentDate: command.paymentDto.paymentDate,
                paymentAmount: command.paymentDto.paymentAmount,
                customerId: command.paymentDto.customerId,
                customerName: command.paymentDto.customerName,
                // receiptNo: removed - immutable after creation
                contractPayment: command.paymentDto.contractPayment,
                contractId: command.paymentDto.contractId,
                contractName: command.paymentDto.contractName,
                contractNo: command.paymentDto.contractNo,
                chequeClearStatus: command.paymentDto.chequeClearStatus,
                paymentDetails: command.paymentDto.paymentDetails,
                paymentInvoiceDetails: command.paymentDto.paymentInvoiceDetails,
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
