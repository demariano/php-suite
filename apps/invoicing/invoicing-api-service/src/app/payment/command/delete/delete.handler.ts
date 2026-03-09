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
import {
    PaymentContractDatabaseServiceAbstractClass,
    PaymentDatabaseServiceAbstractClass,
    PaymentInvoiceDatabaseServiceAbstractClass,
} from '@invoicing-database-service';
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
        private readonly configService: ConfigService,

        @Inject('PaymentInvoiceDatabaseService')
        private readonly paymentInvoiceDatabaseService: PaymentInvoiceDatabaseServiceAbstractClass,

        @Inject('PaymentContractDatabaseService')
        private readonly paymentContractDatabaseService: PaymentContractDatabaseServiceAbstractClass
    ) {}

    async execute(command: DeletePaymentCommand): Promise<ResponseDto<PaymentDto | ErrorResponseDto>> {
        this.logger.log(`Processing delete request for payment: ${command.id}`);

        try {
            // Fetch and validate existing payment record
            const existingRecord = await this.validatePayment(command.id);

            // Check user authorization
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            console.log('hasApprovalPermission', hasApprovalPermission);

            // Update status and activity logs based on permissions
            this.updatePaymentStatus(command, existingRecord, hasApprovalPermission);

            // Delete or mark for deletion based on permissions
            const deletedRecord = await this.performDeletion(command, hasApprovalPermission);

            this.logger.log(`Payment deleted successfully: ${deletedRecord.paymentId}`);
            return new ResponseDto<PaymentDto>(deletedRecord, HTTP_STATUS_OK);
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
        hasApprovalPermission: boolean
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
    private async performDeletion(command: DeletePaymentCommand, hasApprovalPermission: boolean): Promise<PaymentDto> {
        console.log('Performing deletion. hasApprovalPermission:', hasApprovalPermission);
        if (hasApprovalPermission) {
            // Hard delete
            const paymentInvoiceRecords = await this.paymentInvoiceDatabaseService.findRecordByPaymentId(
                command.paymentDto.paymentId
            );
            if (paymentInvoiceRecords && paymentInvoiceRecords.length > 0) {
                for (const record of paymentInvoiceRecords) {
                    await this.paymentInvoiceDatabaseService.deleteRecord(record);
                }
            }

            // Send PAYMENT_DELETED events after hard delete of invoice details
            const paymentInvoicePayloads: InvoicePaymentEventDto[] = [];
            if (paymentInvoiceRecords && paymentInvoiceRecords.length > 0) {
                console.log('here');
                for (const detail of paymentInvoiceRecords) {
                    const invoicePaymentDto: InvoicePaymentEventDto = {
                        invoiceId: detail.invoiceId,
                        receiptNo: command.paymentDto.receiptNo,
                        paymentDate: command.paymentDto.paymentDate,
                        paymentAmount: detail.amountApplied,
                        contractPayment: command.paymentDto.contractPayment,
                        paymentId: command.paymentDto.paymentId,
                        customerId: command.paymentDto.customerId,
                        customerCreditPayment: detail.customerCreditPayment,
                        invoicePaymentEvent: InvoicePaymentEventEnum.PAYMENT_DELETED,
                    };

                    paymentInvoicePayloads.push(invoicePaymentDto);
                }

                console.log('paymentInvoicePayloadsfor deletion:', paymentInvoicePayloads);

                await this.sendInvoicePaymentEvent(paymentInvoicePayloads);

                this.logger.log(
                    `Sent PAYMENT_DELETED events for ${paymentInvoiceRecords.length} invoices in payment ${command.paymentDto.paymentId}`
                );
            }

            if (command.paymentDto.contractPayment) {
                // Delete payment-contract records and send per-contract PAYMENT_DELETED events
                const paymentContractRecords = await this.paymentContractDatabaseService.findRecordByPaymentId(
                    command.paymentDto.paymentId
                );
                for (const pc of paymentContractRecords) {
                    await this.paymentContractDatabaseService.deleteRecord(pc);
                    await this.sendSingleContractPaymentEvent(
                        ContractPaymentEventEnum.PAYMENT_DELETED,
                        pc.contractId,
                        pc.amountApplied,
                        command.paymentDto
                    );
                }
            }
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
    private async sendInvoicePaymentEvent(paymentData: InvoicePaymentEventDto[]): Promise<void> {
        const invoicingEventSQSUrl = this.configService.get<string>('INVOICE_EVENT_SQS');

        const eventPayload = {
            eventType: InvoicePaymentEventEnum.CUSTOMER_BALANCE_UPDATE, // Using CUSTOMER_BALANCE_UPDATE as a generic event type for invoice payment changes
            paymentData,
        };

        await this.messageQueueService.sendMessageToSQS(invoicingEventSQSUrl, JSON.stringify(eventPayload));
    }

    /**
     * Sends a single contract payment event to SQS queue
     */
    private async sendSingleContractPaymentEvent(
        eventType: ContractPaymentEventEnum,
        contractId: string,
        amountApplied: number,
        payment: PaymentDto
    ): Promise<void> {
        const contractPaymentDto: ContractPaymentDto = {
            contractId,
            receiptNo: payment.receiptNo,
            paymentDate: payment.paymentDate,
            paymentAmount: amountApplied,
            contractPayment: payment.contractPayment,
            paymentId: payment.paymentId,
        };

        const invoicingEventSQSUrl = this.configService.get<string>('INVOICE_EVENT_SQS');

        const eventPayload = {
            eventType,
            paymentData: contractPaymentDto,
        };

        await this.messageQueueService.sendMessageToSQS(invoicingEventSQSUrl, JSON.stringify(eventPayload));

        this.logger.log(`Sent ${eventType} event for contract ${contractId}, payment ${payment.paymentId}`);
    }
}
