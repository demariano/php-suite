import {
    CreateReturnGoodSoldDto,
    ErrorResponseDto,
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
    ReturnGoodSoldDatabaseServiceAbstractClass,
} from '@invoicing-database-service';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InvoiceStockDeltaService } from '../../../shared/invoice-stock-delta.service';
import { CreateReturnGoodSoldCommand } from './create.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_CREATED = 201;
const RGS_DOC_NUMBER_PREFIX = 'RGS'; // RGS prefix for auto-generated document numbers

@CommandHandler(CreateReturnGoodSoldCommand)
export class CreateReturnGoodSoldHandler implements ICommandHandler<CreateReturnGoodSoldCommand> {
    protected readonly logger = new Logger(CreateReturnGoodSoldHandler.name);

    constructor(
        @Inject('ReturnGoodSoldDatabaseService')
        private readonly returnGoodSoldDatabaseService: ReturnGoodSoldDatabaseServiceAbstractClass,
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract,
        @Inject('PaymentInvoiceDatabaseService')
        private readonly paymentInvoiceDatabaseService: PaymentInvoiceDatabaseServiceAbstractClass,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService,
        private readonly invoiceStockDeltaService: InvoiceStockDeltaService
    ) {}

    async execute(
        command: CreateReturnGoodSoldCommand
    ): Promise<ResponseDto<CreateReturnGoodSoldDto | ErrorResponseDto>> {
        this.logger.log(`Processing create request for return good sold`);

        try {
            // Generate RGS document number based on area RGS count
            if (!command.returnGoodSoldDto.areaId) {
                throw new BadRequestException('Area ID is required to generate RGS document number');
            }

            if (!command.returnGoodSoldDto.areaPrefixId) {
                throw new BadRequestException('Area prefix ID is required to generate RGS document number');
            }

            //check if there are payments linked to the invoice, if yes, prevent deletion and return error message
            const linkedPayments = await this.paymentInvoiceDatabaseService.findRecordByInvoiceId(
                command.returnGoodSoldDto.invoiceId
            );
            //check if linkedPayments has a customer credit payment, if yes, prevent deletion and return error message
            if (linkedPayments && linkedPayments.length > 0) {
                const hasCustomerCreditPayment = linkedPayments.some((payment) =>
                    payment.customerCreditPayment ? payment.customerCreditPayment : false
                );

                if (hasCustomerCreditPayment) {
                    this.logger.warn(
                        `Invoice has linked customer credit payments: ${command.returnGoodSoldDto.invoiceId}`
                    );
                    throw new BadRequestException(
                        `Invoice cannot be deleted as it has linked customer credit payments`
                    );
                }
            }

            const rgsCount = await this.returnGoodSoldDatabaseService.getReturnGoodSoldCountByAreaId(
                command.returnGoodSoldDto.areaId
            );
            const nextRgsNumber = rgsCount + 1;
            command.returnGoodSoldDto.rgsDocno = `${command.returnGoodSoldDto.areaPrefixId}-${RGS_DOC_NUMBER_PREFIX}-${nextRgsNumber}`;

            this.logger.log(
                `Generated RGS document number: ${command.returnGoodSoldDto.rgsDocno} for area: ${command.returnGoodSoldDto.areaId} (count: ${rgsCount}, prefix: ${command.returnGoodSoldDto.areaPrefixId})`
            );

            // Validate that rgsDocno doesn't already exist
            await this.validateRgsDocnoUnique(command.returnGoodSoldDto.rgsDocno);

            // Update status and activity logs based on permissions
            await this.updateReturnGoodSoldStatus(command);

            // Create record in database
            const createdRecord = await this.returnGoodSoldDatabaseService.createRecord(command.returnGoodSoldDto);

            this.logger.log(`Return Good Sold created successfully: ${createdRecord.returnGoodSoldId}`);

            return new ResponseDto<CreateReturnGoodSoldDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.returnGoodSoldDto.rgsDocno || 'unknown');
        }
    }

    /**
     * Validates that the rgsDocno is unique
     */
    private async validateRgsDocnoUnique(rgsDocno: string): Promise<void> {
        const existingRecord = await this.returnGoodSoldDatabaseService.findRecordByRgsDocno(rgsDocno);

        if (existingRecord) {
            this.logger.warn(`Return Good Sold rgsDocno already exists: ${rgsDocno}`);
            throw new BadRequestException('Return Good Sold document number already exists');
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
     * Updates return good sold status and activity logs based on user permissions
     */
    private async updateReturnGoodSoldStatus(command: CreateReturnGoodSoldCommand): Promise<void> {
        // Check user authorization and determine status
        const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            command.returnGoodSoldDto.status = StatusEnum.ACTIVE;
            command.returnGoodSoldDto.activityLogs = [];
            command.returnGoodSoldDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Return Good Sold created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );
            // Limit activity logs to last 10 entries
            command.returnGoodSoldDto.activityLogs = reduceArrayContents(
                command.returnGoodSoldDto.activityLogs,
                ACTIVITY_LOGS_LIMIT
            );

            // //update the invoice details based on the modifiedInvoiceDetails in the return good sold record
            const invoiceRecord = await this.invoiceDatabaseService.findRecordById(command.returnGoodSoldDto.invoiceId);
            if (invoiceRecord) {
                invoiceRecord.invoiceDetails = command.returnGoodSoldDto.modifiedInvoiceDetails;

                // Recompute invoice totals from modified line items
                this.recomputeInvoiceTotals(invoiceRecord);

                await this.invoiceDatabaseService.updateRecord(invoiceRecord);
                this.logger.log(
                    `Invoice ${invoiceRecord.invoiceId} updated successfully based on approved return good sold `
                );

                // Send stock adjustment event: restore original items, deduct modified items
                await this.invoiceStockDeltaService.applyStockDeltas(
                    command.returnGoodSoldDto.originalInvoiceDetails || [],
                    command.returnGoodSoldDto.modifiedInvoiceDetails || [],
                    `RGS-CREATE-${invoiceRecord.invoiceId}`
                );
            } else {
                this.logger.warn(
                    `Associated invoice not found for return good sold  ${command.returnGoodSoldDto.invoiceId}`
                );
            }

            const invoicePayloads: InvoicePaymentEventDto[] = [];
            const invoicePaymentDto: InvoicePaymentEventDto = {
                invoiceId: invoiceRecord.invoiceId,
                customerId: invoiceRecord.customerId,
                invoicePaymentEvent: InvoicePaymentEventEnum.INVOICE_UPDATED,
            };
            invoicePayloads.push(invoicePaymentDto);
            await this.sendInvoicePaymentEvent(invoicePayloads);
        } else {
            // User needs approval - set to NEW_RECORD
            command.returnGoodSoldDto.status = StatusEnum.NEW_RECORD;
            command.returnGoodSoldDto.activityLogs = [];
            command.returnGoodSoldDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Return Good Sold created by ${command.user.username} for approval`
            );
            // Limit activity logs to last 10 entries
            command.returnGoodSoldDto.activityLogs = reduceArrayContents(
                command.returnGoodSoldDto.activityLogs,
                ACTIVITY_LOGS_LIMIT
            );
            command.returnGoodSoldDto.forApprovalVersion = {};
            command.returnGoodSoldDto.forApprovalVersion.invoiceId = command.returnGoodSoldDto.invoiceId;
            command.returnGoodSoldDto.forApprovalVersion.customerId = command.returnGoodSoldDto.customerId;
            command.returnGoodSoldDto.forApprovalVersion.customerName = command.returnGoodSoldDto.customerName;
            command.returnGoodSoldDto.forApprovalVersion.areaId = command.returnGoodSoldDto.areaId;
            command.returnGoodSoldDto.forApprovalVersion.areaName = command.returnGoodSoldDto.areaName;
            command.returnGoodSoldDto.forApprovalVersion.areaPrefixId = command.returnGoodSoldDto.areaPrefixId;
            command.returnGoodSoldDto.forApprovalVersion.invoiceDocno = command.returnGoodSoldDto.invoiceDocno;
            command.returnGoodSoldDto.forApprovalVersion.rgsDocno = command.returnGoodSoldDto.rgsDocno;
            command.returnGoodSoldDto.forApprovalVersion.dateReturned = command.returnGoodSoldDto.dateReturned;
            command.returnGoodSoldDto.forApprovalVersion.changeReason = command.returnGoodSoldDto.changeReason;
            command.returnGoodSoldDto.forApprovalVersion.originalInvoiceDetails =
                command.returnGoodSoldDto.originalInvoiceDetails;
            command.returnGoodSoldDto.forApprovalVersion.modifiedInvoiceDetails =
                command.returnGoodSoldDto.modifiedInvoiceDetails;
        }
    }

    /**
     * Recomputes invoiceAmount, taxAmount, and finalAmount from the invoice's line items
     */
    private recomputeInvoiceTotals(invoiceRecord: any): void {
        const details = invoiceRecord.invoiceDetails || [];
        const invoiceAmount =
            Math.round(details.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) * 100) / 100;
        const effectiveTaxRate = invoiceRecord.taxable ? (invoiceRecord.taxRate ?? 0) / 100 : 0;
        const taxAmount = Math.round(invoiceAmount * effectiveTaxRate * 100) / 100;
        const finalAmount = Math.round((invoiceAmount + taxAmount) * 100) / 100;

        invoiceRecord.invoiceAmount = invoiceAmount;
        invoiceRecord.taxAmount = taxAmount;
        invoiceRecord.finalAmount = finalAmount;

        this.logger.log(
            `Recomputed invoice totals - invoiceAmount: ${invoiceAmount}, taxAmount: ${taxAmount}, finalAmount: ${finalAmount}`
        );
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, rgsDocno: string): never {
        this.logger.error(`Error processing create request for ${rgsDocno}:`, error);

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
