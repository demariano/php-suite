import { CustomerDatabaseServiceAbstract } from '@customer-database-service';
import {
    ContractPaymentDto,
    ContractPaymentEventEnum,
    CreatePaymentDto,
    ErrorResponseDto,
    InvoicePaymentDto,
    InvoicePaymentEventEnum,
    PaymentDto,
    ResponseDto,
    StatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import {
    CollectionReceiptRangeDatabaseServiceAbstract,
    PaymentDatabaseServiceAbstractClass,
} from '@invoicing-database-service';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreatePaymentCommand } from './create.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_CREATED = 201;

@CommandHandler(CreatePaymentCommand)
export class CreatePaymentHandler implements ICommandHandler<CreatePaymentCommand> {
    protected readonly logger = new Logger(CreatePaymentHandler.name);

    constructor(
        @Inject('PaymentDatabaseService')
        private readonly paymentDatabaseService: PaymentDatabaseServiceAbstractClass,
        @Inject('CollectionReceiptRangeDatabaseService')
        private readonly collectionReceiptRangeDatabaseService: CollectionReceiptRangeDatabaseServiceAbstract,
        @Inject('CustomerDatabaseService')
        private readonly customerDatabaseService: CustomerDatabaseServiceAbstract,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService
    ) {}

    async execute(command: CreatePaymentCommand): Promise<ResponseDto<CreatePaymentDto | ErrorResponseDto>> {
        this.logger.log(`Processing create request for payment: ${command.paymentDto.receiptNo}`);

        try {
            // Validate that receipt number doesn't already exist
            await this.validateReceiptNoUnique(command.paymentDto.receiptNo);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updatePaymentStatus(command, hasApprovalPermission);

            // Create record in database
            const createdRecord = await this.paymentDatabaseService.createRecord(command.paymentDto);

            this.logger.log(`Payment created successfully: ${createdRecord.paymentId}`);

            // Send invoice payment events for ACTIVE payments
            if (createdRecord.status === StatusEnum.ACTIVE && createdRecord.paymentInvoiceDetails) {
                await this.sendInvoicePaymentEvents(createdRecord);
            }

            // Send contract payment event for ACTIVE contract payments
            if (
                createdRecord.status === StatusEnum.ACTIVE &&
                createdRecord.contractPayment &&
                createdRecord.contractId
            ) {
                await this.sendContractPaymentEvent(createdRecord);
            }

            // Mark receipt number as used if receipt number is provided
            if (createdRecord.receiptNo && createdRecord.customerId) {
                try {
                    // Fetch customer to get areaId
                    const customer = await this.customerDatabaseService.findRecordById(createdRecord.customerId);

                    if (customer && customer.areaId) {
                        const receiptNumber = parseInt(createdRecord.receiptNo, 10);
                        if (!isNaN(receiptNumber)) {
                            await this.collectionReceiptRangeDatabaseService.markReceiptNumberAsUsed(
                                customer.areaId,
                                receiptNumber
                            );
                            this.logger.log(
                                `Receipt number ${receiptNumber} marked as used for area ${customer.areaId}`
                            );
                        }
                    } else {
                        this.logger.warn(
                            `Customer ${createdRecord.customerId} does not have an areaId, skipping receipt number update`
                        );
                    }
                } catch (error) {
                    // Log error but don't fail payment creation since payment is already saved
                    this.logger.error(
                        `Failed to mark receipt number as used for payment ${createdRecord.paymentId}:`,
                        error
                    );
                }
            }

            return new ResponseDto<CreatePaymentDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.paymentDto.receiptNo);
        }
    }

    /**
     * Validates that the receipt number is unique
     */
    private async validateReceiptNoUnique(receiptNo: string): Promise<void> {
        const existingRecord = await this.paymentDatabaseService.findRecordByReceiptNo(receiptNo);

        if (existingRecord) {
            this.logger.warn(`Receipt number already exists: ${receiptNo}`);
            throw new BadRequestException('Receipt number already exists');
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
     * Updates payment status and activity logs based on user permissions
     */
    private updatePaymentStatus(command: CreatePaymentCommand, hasApprovalPermission: boolean): void {
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            command.paymentDto.status = StatusEnum.ACTIVE;
            command.paymentDto.activityLogs = [];
            command.paymentDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Payment created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );

            // Limit activity logs to last 10 entries
            command.paymentDto.activityLogs = reduceArrayContents(command.paymentDto.activityLogs, ACTIVITY_LOGS_LIMIT);
        } else {
            // User needs approval - set to NEW_RECORD
            command.paymentDto.status = StatusEnum.NEW_RECORD;
            command.paymentDto.activityLogs = [];
            command.paymentDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Payment created by ${command.user.username} for approval`
            );

            // Limit activity logs to last 10 entries
            command.paymentDto.activityLogs = reduceArrayContents(command.paymentDto.activityLogs, ACTIVITY_LOGS_LIMIT);

            // Set the forApprovalVersion
            command.paymentDto.forApprovalVersion = {};
            command.paymentDto.forApprovalVersion.paymentDate = command.paymentDto.paymentDate;
            command.paymentDto.forApprovalVersion.paymentAmount = command.paymentDto.paymentAmount;
            command.paymentDto.forApprovalVersion.customerId = command.paymentDto.customerId;
            command.paymentDto.forApprovalVersion.customerName = command.paymentDto.customerName;
            command.paymentDto.forApprovalVersion.receiptNo = command.paymentDto.receiptNo;
            command.paymentDto.forApprovalVersion.contractPayment = command.paymentDto.contractPayment;
            command.paymentDto.forApprovalVersion.contractId = command.paymentDto.contractId;
            command.paymentDto.forApprovalVersion.contractName = command.paymentDto.contractName;
            command.paymentDto.forApprovalVersion.contractNo = command.paymentDto.contractNo;
            command.paymentDto.forApprovalVersion.chequeClearStatus = command.paymentDto.chequeClearStatus;
            command.paymentDto.forApprovalVersion.paymentDetails = command.paymentDto.paymentDetails;
            command.paymentDto.forApprovalVersion.paymentInvoiceDetails = command.paymentDto.paymentInvoiceDetails;

            // Clear main record fields for NEW_RECORD - data is only in forApprovalVersion
            command.paymentDto.paymentInvoiceDetails = [];
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, receiptNo: string): never {
        this.logger.error(`Error processing create request for ${receiptNo}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
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
     * Sends invoice payment events for all invoices in the payment
     */
    private async sendInvoicePaymentEvents(payment: PaymentDto): Promise<void> {
        if (!payment.paymentInvoiceDetails || payment.paymentInvoiceDetails.length === 0) {
            return;
        }

        for (const detail of payment.paymentInvoiceDetails) {
            const invoicePaymentDto: InvoicePaymentDto = {
                invoiceId: detail.invoiceId,
                receiptNo: payment.receiptNo,
                paymentDate: payment.paymentDate,
                paymentAmount: detail.amountApplied,
                contractPayment: payment.contractPayment,
                paymentId: payment.paymentId,
            };

            await this.sendInvoicePaymentEvent(InvoicePaymentEventEnum.PAYMENT_ADDED, invoicePaymentDto);
        }

        this.logger.log(
            `Sent PAYMENT_ADDED events for ${payment.paymentInvoiceDetails.length} invoices in payment ${payment.paymentId}`
        );
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
     * Sends contract payment event for contract payments
     */
    private async sendContractPaymentEvent(payment: PaymentDto): Promise<void> {
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
            eventType: ContractPaymentEventEnum.PAYMENT_ADDED,
            paymentData: contractPaymentDto,
        };

        await this.messageQueueService.sendMessageToSQS(invoicingEventSQSUrl, JSON.stringify(eventPayload));

        this.logger.log(`Sent PAYMENT_ADDED event for contract ${payment.contractId}, payment ${payment.paymentId}`);
    }
}
