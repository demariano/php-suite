import { ErrorResponseDto, InvoiceDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { detectFieldChanges, formatFieldChanges } from '@field-change-utils-lib';
import { InvoiceDatabaseServiceAbstract } from '@invoicing-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateInvoiceCommand } from './update.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(UpdateInvoiceCommand)
export class UpdateInvoiceHandler implements ICommandHandler<UpdateInvoiceCommand> {
    protected readonly logger = new Logger(UpdateInvoiceHandler.name);

    constructor(
        @Inject('InvoiceDatabaseService')
        private readonly invoiceDatabaseService: InvoiceDatabaseServiceAbstract
    ) {}

    async execute(command: UpdateInvoiceCommand): Promise<ResponseDto<InvoiceDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for invoice: ${command.id}`);

        try {
            // Validate that invoice exists
            const existingRecord = await this.validateInvoiceExists(command.id);

            // Validate that invoice docno doesn't already exist (excluding current record)
            await this.validateInvoiceDocnoUnique(command.invoiceDto.docno, command.id);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateInvoiceStatus(command, existingRecord, hasApprovalPermission);

            // Update record in database
            const updatedRecord = await this.invoiceDatabaseService.updateRecord(existingRecord);

            this.logger.log(`Invoice updated successfully: ${updatedRecord.invoiceId}`);
            return new ResponseDto<InvoiceDto>(updatedRecord, HTTP_STATUS_OK);
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
     * Validates that the invoice docno is unique (excluding current record)
     */
    private async validateInvoiceDocnoUnique(docno: string, currentId: string): Promise<void> {
        const existingRecord = await this.invoiceDatabaseService.findRecordByDocno(docno);

        if (existingRecord && existingRecord.invoiceId !== currentId) {
            this.logger.warn(`Invoice docno already exists: ${docno}`);
            throw new BadRequestException('Invoice document number already exists');
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
     * Updates invoice status and activity logs based on user permissions
     */
    private updateInvoiceStatus(
        command: UpdateInvoiceCommand,
        existingRecord: InvoiceDto,
        hasApprovalPermission: boolean
    ): void {
        if (hasApprovalPermission) {
            // User can approve directly - update the existing record
            existingRecord.status = StatusEnum.ACTIVE;
            existingRecord.docno = command.invoiceDto.docno;
            existingRecord.invoiceDate = command.invoiceDto.invoiceDate;
            existingRecord.customerId = command.invoiceDto.customerId;
            existingRecord.customerName = command.invoiceDto.customerName;
            existingRecord.areaId = command.invoiceDto.areaId;
            existingRecord.areaName = command.invoiceDto.areaName;
            existingRecord.territoryManagerId = command.invoiceDto.territoryManagerId;
            existingRecord.territoryManagerName = command.invoiceDto.territoryManagerName;
            existingRecord.salesTypeId = command.invoiceDto.salesTypeId;
            existingRecord.salesTypeName = command.invoiceDto.salesTypeName;
            existingRecord.contractId = command.invoiceDto.contractId;
            existingRecord.contractName = command.invoiceDto.contractName;
            existingRecord.termsId = command.invoiceDto.termsId;
            existingRecord.termsName = command.invoiceDto.termsName;
            existingRecord.productPriceTypeId = command.invoiceDto.productPriceTypeId;
            existingRecord.productPriceTypeName = command.invoiceDto.productPriceTypeName;
            existingRecord.finalAmount = command.invoiceDto.finalAmount;
            existingRecord.invoiceAmount = command.invoiceDto.invoiceAmount;
            existingRecord.taxAmount = command.invoiceDto.taxAmount;
            existingRecord.totalAmountPaid = command.invoiceDto.totalAmountPaid;
            existingRecord.invoiceDetails = command.invoiceDto.invoiceDetails;
            existingRecord.contractSales = command.invoiceDto.contractSales;
            // Clear changeReason for admin users since changes are applied directly
            existingRecord.changeReason = undefined;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Invoice updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`;
            existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
            
            // Limit activity logs to last 10 entries
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        } else {
            // User needs approval - store changes in forApprovalVersion, keep existing record unchanged
            existingRecord.status = StatusEnum.FOR_APPROVAL;
            existingRecord.activityLogs = existingRecord.activityLogs || [];

            // Detect field changes
            const fieldChanges = detectFieldChanges(existingRecord, command.invoiceDto, {});
            const formattedChanges = formatFieldChanges(fieldChanges);

            // Build activity log message
            let activityLogMessage = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Invoice updated by ${command.user.username} for approval`;

            // Append changes to activity log if any changes detected
            if (formattedChanges) {
                activityLogMessage += ` - ${formattedChanges}`;
            }

            existingRecord.activityLogs.push(activityLogMessage);

            // Preserve user's manually entered changeReason and combine with auto-generated changes
            const userChangeReason = command.invoiceDto.changeReason?.trim();
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
                docno: command.invoiceDto.docno,
                invoiceDate: command.invoiceDto.invoiceDate,
                customerId: command.invoiceDto.customerId,
                customerName: command.invoiceDto.customerName,
                areaId: command.invoiceDto.areaId,
                areaName: command.invoiceDto.areaName,
                territoryManagerId: command.invoiceDto.territoryManagerId,
                territoryManagerName: command.invoiceDto.territoryManagerName,
                salesTypeId: command.invoiceDto.salesTypeId,
                salesTypeName: command.invoiceDto.salesTypeName,
                contractId: command.invoiceDto.contractId,
                contractName: command.invoiceDto.contractName,
                termsId: command.invoiceDto.termsId,
                termsName: command.invoiceDto.termsName,
                productPriceTypeId: command.invoiceDto.productPriceTypeId,
                productPriceTypeName: command.invoiceDto.productPriceTypeName,
                finalAmount: command.invoiceDto.finalAmount,
                invoiceAmount: command.invoiceDto.invoiceAmount,
                taxAmount: command.invoiceDto.taxAmount,
                totalAmountPaid: command.invoiceDto.totalAmountPaid,
                invoiceDetails: command.invoiceDto.invoiceDetails,
                contractSales: command.invoiceDto.contractSales,
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
}
