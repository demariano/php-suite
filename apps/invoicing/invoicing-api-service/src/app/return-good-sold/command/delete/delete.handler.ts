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
import {
    InvoiceDatabaseServiceAbstract,
    ReturnGoodSoldDatabaseServiceAbstractClass,
} from '@invoicing-database-service';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InvoiceStockDeltaService } from '../../../shared/invoice-stock-delta.service';
import { DeleteReturnGoodSoldCommand } from './delete.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DeleteReturnGoodSoldCommand)
export class DeleteReturnGoodSoldHandler implements ICommandHandler<DeleteReturnGoodSoldCommand> {
    protected readonly logger = new Logger(DeleteReturnGoodSoldHandler.name);

    constructor(
        @Inject('ReturnGoodSoldDatabaseService')
        private readonly returnGoodSoldDatabaseService: ReturnGoodSoldDatabaseServiceAbstractClass,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService,
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract,
        private readonly invoiceStockDeltaService: InvoiceStockDeltaService
    ) {}

    async execute(command: DeleteReturnGoodSoldCommand): Promise<ResponseDto<ReturnGoodSoldDto | ErrorResponseDto>> {
        this.logger.log(`Processing delete request for return good sold: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateReturnGoodSoldExists(command.recordId);

            // Check user authorization and process deletion
            return await this.processDeletion(existingRecord, command.user);
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
     * Processes the deletion based on user authorization
     */
    private async processDeletion(
        existingRecord: ReturnGoodSoldDto,
        user: UserCognito
    ): Promise<ResponseDto<ReturnGoodSoldDto>> {
        const hasAdminPermission = user.roles?.includes(UserRole.ADMIN) || user.roles?.includes(UserRole.SUPER_ADMIN);

        if (hasAdminPermission) {
            return await this.directDelete(existingRecord);
        } else {
            return await this.requestApprovalDelete(existingRecord, user);
        }
    }

    /**
     * Direct delete for admin users
     */
    private async directDelete(existingRecord: ReturnGoodSoldDto): Promise<ResponseDto<ReturnGoodSoldDto>> {
        // delete means the original invoice needs to be reinstated.
        //update the invoice details based on the originalInvoiceDetails in the return good sold record
        const invoiceRecord = await this.invoiceDatabaseService.findRecordById(existingRecord.invoiceId);
        if (invoiceRecord) {
            invoiceRecord.invoiceDetails = existingRecord.originalInvoiceDetails;
            await this.invoiceDatabaseService.updateRecord(invoiceRecord);
            this.logger.log(
                `Invoice ${invoiceRecord.invoiceId} updated successfully based on approved return good sold ${existingRecord.returnGoodSoldId}`
            );
        } else {
            this.logger.warn(
                `Associated invoice not found for return good sold ${existingRecord.returnGoodSoldId}: ${existingRecord.invoiceId}`
            );
        }
        // Hard delete the record
        await this.returnGoodSoldDatabaseService.deleteRecord(existingRecord);

        // Send stock adjustment: modified → original (deletion reverts the RGS changes)
        await this.invoiceStockDeltaService.applyStockDeltas(
            existingRecord.modifiedInvoiceDetails || [],
            existingRecord.originalInvoiceDetails || [],
            `RGS-DELETE-${existingRecord.returnGoodSoldId}`
        );

        const invoicePayloads: InvoicePaymentEventDto[] = [];
        const invoicePaymentDto: InvoicePaymentEventDto = {
            invoiceId: existingRecord.invoiceId,
            customerId: existingRecord.customerId,
            invoicePaymentEvent: InvoicePaymentEventEnum.INVOICE_UPDATED,
        };
        invoicePayloads.push(invoicePaymentDto);
        await this.sendInvoicePaymentEvent(invoicePayloads);

        this.logger.log(`Return Good Sold deleted successfully: ${existingRecord.returnGoodSoldId}`);
        return new ResponseDto<ReturnGoodSoldDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Request approval delete for regular users
     */
    private async requestApprovalDelete(
        existingRecord: ReturnGoodSoldDto,
        user: UserCognito
    ): Promise<ResponseDto<ReturnGoodSoldDto>> {
        // Store current state in forApprovalVersion for potential restoration
        existingRecord.forApprovalVersion = {
            invoiceId: existingRecord.invoiceId,
            customerId: existingRecord.customerId,
            customerName: existingRecord.customerName,
            rgsDocno: existingRecord.rgsDocno,
            invoiceDocno: existingRecord.invoiceDocno,
            dateReturned: existingRecord.dateReturned,
            originalInvoiceDetails: existingRecord.originalInvoiceDetails,
            modifiedInvoiceDetails: existingRecord.modifiedInvoiceDetails,
            changeReason: existingRecord.changeReason,
        };

        existingRecord.status = StatusEnum.FOR_DELETION;
        existingRecord.changeReason = `Delete requested by ${user.username}`;

        // Add activity log
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Return Good Sold deletion requested by ${user.username}, status set to ${StatusEnum.FOR_DELETION}`
        );

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Update record in database
        const updatedRecord = await this.returnGoodSoldDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Return Good Sold deletion requested: ${existingRecord.returnGoodSoldId}`);
        return new ResponseDto<ReturnGoodSoldDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing delete request for ${recordId}:`, error);

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
