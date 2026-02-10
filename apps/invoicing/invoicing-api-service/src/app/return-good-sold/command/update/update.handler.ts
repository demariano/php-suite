import { UserCognito } from '@auth-guard-lib';
import {
    ErrorResponseDto,
    InvoicePaymentEventDto,
    InvoicePaymentEventEnum,
    ResponseDto,
    ReturnGoodSoldDto,
    StatusEnum,
    UserRole,
} from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { detectFieldChanges, formatFieldChanges } from '@field-change-utils-lib';
import {
    InvoiceDatabaseServiceAbstract,
    ReturnGoodSoldDatabaseServiceAbstractClass,
} from '@invoicing-database-service';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateReturnGoodSoldCommand } from './update.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(UpdateReturnGoodSoldCommand)
export class UpdateReturnGoodSoldHandler implements ICommandHandler<UpdateReturnGoodSoldCommand> {
    protected readonly logger = new Logger(UpdateReturnGoodSoldHandler.name);

    constructor(
        @Inject('ReturnGoodSoldDatabaseService')
        private readonly returnGoodSoldDatabaseService: ReturnGoodSoldDatabaseServiceAbstractClass,

        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService,
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract
    ) {}

    async execute(command: UpdateReturnGoodSoldCommand): Promise<ResponseDto<ReturnGoodSoldDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for return good sold: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateReturnGoodSoldExists(command.recordId);

            // Check user authorization and process update
            return await this.processUpdate(existingRecord, command.returnGoodSoldDto, command.user);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Validates that the return good sold record exists
     */
    private async validateReturnGoodSoldExists(recordId: string): Promise<ReturnGoodSoldDto> {
        const existingRecord = await this.returnGoodSoldDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Return Good Sold not found: ${recordId}`);
            throw new NotFoundException(`Return Good Sold record not found for id ${recordId}`);
        }

        return existingRecord;
    }

    /**
     * Processes the update based on user authorization
     */
    private async processUpdate(
        existingRecord: ReturnGoodSoldDto,
        updateDto: ReturnGoodSoldDto,
        user: UserCognito
    ): Promise<ResponseDto<ReturnGoodSoldDto>> {
        const hasAdminPermission = user.roles?.includes(UserRole.ADMIN) || user.roles?.includes(UserRole.SUPER_ADMIN);

        if (hasAdminPermission) {
            return await this.directUpdate(existingRecord, updateDto, user);
        } else {
            return await this.requestApprovalUpdate(existingRecord, updateDto, user);
        }
    }

    /**
     * Direct update for admin users
     */
    private async directUpdate(
        existingRecord: ReturnGoodSoldDto,
        updateDto: ReturnGoodSoldDto,
        user: UserCognito
    ): Promise<ResponseDto<ReturnGoodSoldDto>> {
        // Apply changes directly
        existingRecord.invoiceId = updateDto.invoiceId;
        existingRecord.customerId = updateDto.customerId;
        existingRecord.customerName = updateDto.customerName;
        existingRecord.areaId = updateDto.areaId;
        existingRecord.areaName = updateDto.areaName;
        existingRecord.invoiceDocno = updateDto.invoiceDocno;
        // rgsDocno is immutable - do not update it
        existingRecord.dateReturned = updateDto.dateReturned;
        existingRecord.originalInvoiceDetails = updateDto.originalInvoiceDetails;
        existingRecord.modifiedInvoiceDetails = updateDto.modifiedInvoiceDetails;
        // Clear changeReason for admin users since changes are applied directly
        existingRecord.changeReason = undefined;
        existingRecord.status = StatusEnum.ACTIVE;

        // Add activity log
        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Return Good Sold updated by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Clear forApprovalVersion since it's a direct update
        existingRecord.forApprovalVersion = {};

        // Update record in database
        const updatedRecord = await this.returnGoodSoldDatabaseService.updateRecord(existingRecord);

        // //update the invoice details based on the modifiedInvoiceDetails in the return good sold record
        const invoiceRecord = await this.invoiceDatabaseService.findRecordById(updatedRecord.invoiceId);
        if (invoiceRecord) {
            invoiceRecord.invoiceDetails = updatedRecord.modifiedInvoiceDetails;
            await this.invoiceDatabaseService.updateRecord(invoiceRecord);
            this.logger.log(
                `Invoice ${invoiceRecord.invoiceId} updated successfully based on approved return good sold ${updatedRecord.returnGoodSoldId}`
            );
        } else {
            this.logger.warn(`Associated invoice not found for return good sold  ${updatedRecord.returnGoodSoldId}`);
        }

        this.logger.log(`Return Good Sold updated successfully: ${updatedRecord.returnGoodSoldId}`);

        const invoicePayloads: InvoicePaymentEventDto[] = [];
        const invoicePaymentDto: InvoicePaymentEventDto = {
            invoiceId: existingRecord.invoiceId,
            customerId: existingRecord.customerId,
            invoicePaymentEvent: InvoicePaymentEventEnum.INVOICE_UPDATED,
        };
        invoicePayloads.push(invoicePaymentDto);
        await this.sendInvoicePaymentEvent(invoicePayloads);

        return new ResponseDto<ReturnGoodSoldDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Request approval update for regular users
     */
    private async requestApprovalUpdate(
        existingRecord: ReturnGoodSoldDto,
        updateDto: ReturnGoodSoldDto,
        user: UserCognito
    ): Promise<ResponseDto<ReturnGoodSoldDto>> {
        // Store changes in forApprovalVersion
        // Note: rgsDocno is immutable and should NOT be included in forApprovalVersion
        existingRecord.forApprovalVersion = {
            invoiceId: updateDto.invoiceId,
            customerId: updateDto.customerId,
            customerName: updateDto.customerName,
            areaId: updateDto.areaId,
            areaName: updateDto.areaName,
            invoiceDocno: updateDto.invoiceDocno,
            dateReturned: updateDto.dateReturned,
            originalInvoiceDetails: updateDto.originalInvoiceDetails,
            modifiedInvoiceDetails: updateDto.modifiedInvoiceDetails,
        };

        existingRecord.status = StatusEnum.FOR_APPROVAL;
        existingRecord.activityLogs = existingRecord.activityLogs || [];

        // Detect field changes
        const fieldChanges = detectFieldChanges(existingRecord, updateDto, {});
        const formattedChanges = formatFieldChanges(fieldChanges);

        // Build activity log message
        let activityLogMessage = `Date: ${new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
        })}, Return Good Sold updated by ${user.username} for approval`;

        // Append changes to activity log if any changes detected
        if (formattedChanges) {
            activityLogMessage += ` - ${formattedChanges}`;
        }

        existingRecord.activityLogs.push(activityLogMessage);

        // Preserve user's manually entered changeReason and combine with auto-generated changes
        const userChangeReason = updateDto.changeReason?.trim();
        if (userChangeReason && formattedChanges) {
            // User provided changeReason and we have formatted changes - combine them
            existingRecord.changeReason = `${userChangeReason}\n\n${formattedChanges}`;
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

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Update record in database
        const updatedRecord = await this.returnGoodSoldDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Return Good Sold update requested: ${existingRecord.returnGoodSoldId}`);
        return new ResponseDto<ReturnGoodSoldDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing update request for ${recordId}:`, error);

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
