import { ErrorResponseDto, ResponseDto, StatusEnum, StockDeliveryDto, UserRole } from '@dto';
import { detectFieldChanges, formatFieldChanges } from '@field-change-utils-lib';
import { reduceArrayContents } from '@dynamo-db-lib';
import { StockDeliveryDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateStockDeliveryCommand } from './update.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(UpdateStockDeliveryCommand)
export class UpdateStockDeliveryHandler implements ICommandHandler<UpdateStockDeliveryCommand> {
    protected readonly logger = new Logger(UpdateStockDeliveryHandler.name);

    constructor(
        @Inject('StockDeliveryDatabaseService')
        private readonly stockDeliveryDatabaseService: StockDeliveryDatabaseServiceAbstract
    ) {}

    async execute(command: UpdateStockDeliveryCommand): Promise<ResponseDto<StockDeliveryDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for stock delivery: ${command.id}`);

        try {
            // Validate that stock delivery exists
            const existingRecord = await this.validateStockDeliveryExists(command.id);

            // Validate that stock delivery docno doesn't already exist (excluding current record)
            await this.validateStockDeliveryDocnoUnique(command.stockDeliveryDto.docno, command.id);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateStockDeliveryStatus(command, existingRecord, hasApprovalPermission);

            // Update record in database
            const updatedRecord = await this.stockDeliveryDatabaseService.updateRecord(existingRecord);

            this.logger.log(`Stock delivery updated successfully: ${updatedRecord.stockDeliveryId}`);
            return new ResponseDto<StockDeliveryDto>(updatedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.id);
        }
    }

    /**
     * Validates that the stock delivery exists
     */
    private async validateStockDeliveryExists(recordId: string): Promise<StockDeliveryDto> {
        const existingRecord = await this.stockDeliveryDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Stock delivery not found: ${recordId}`);
            throw new NotFoundException(`Stock delivery record not found for id ${recordId}`);
        }

        return existingRecord;
    }

    /**
     * Validates that the stock delivery docno is unique (excluding current record)
     */
    private async validateStockDeliveryDocnoUnique(docno: string, currentId: string): Promise<void> {
        const existingRecords = await this.stockDeliveryDatabaseService.findRecordContainingDocno(docno);

        if (existingRecords && existingRecords.length > 0) {
            const exactMatch = existingRecords.find(
                (record) => record.docno === docno && record.stockDeliveryId !== currentId
            );
            if (exactMatch) {
                this.logger.warn(`Stock delivery docno already exists: ${docno}`);
                throw new BadRequestException('Stock delivery document number already exists');
            }
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
     * Updates stock delivery status and activity logs based on user permissions
     */
    private updateStockDeliveryStatus(
        command: UpdateStockDeliveryCommand,
        existingRecord: StockDeliveryDto,
        hasApprovalPermission: boolean
    ): void {
        if (hasApprovalPermission) {
            // User can approve directly - update the existing record
            existingRecord.status = StatusEnum.ACTIVE;
            existingRecord.docno = command.stockDeliveryDto.docno;
            existingRecord.supplierId = command.stockDeliveryDto.supplierId;
            existingRecord.supplierName = command.stockDeliveryDto.supplierName;
            existingRecord.dateReceived = command.stockDeliveryDto.dateReceived;
            existingRecord.deliveryDetails = command.stockDeliveryDto.deliveryDetails;
            // Clear changeReason for admin users since changes are applied directly
            existingRecord.changeReason = undefined;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Stock delivery updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`;
            existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

            // Limit activity logs to last 10 entries
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        } else {
            // User needs approval - store changes in forApprovalVersion, keep existing record unchanged
            existingRecord.status = StatusEnum.FOR_APPROVAL;
            existingRecord.activityLogs = existingRecord.activityLogs || [];

            // Detect field changes
            const fieldChanges = detectFieldChanges(existingRecord, command.stockDeliveryDto);
            const formattedChanges = formatFieldChanges(fieldChanges);

            // Build activity log message
            let activityLogMessage = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Stock delivery updated by ${command.user.username} for approval`;

            // Append changes to activity log if any changes detected
            if (formattedChanges) {
                activityLogMessage += ` - ${formattedChanges}`;
            }

            existingRecord.activityLogs.push(activityLogMessage);

            // Limit activity logs to last 10 entries
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

            // Preserve user's manually entered changeReason and combine with auto-generated changes
            const userChangeReason = command.stockDeliveryDto.changeReason?.trim();
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

            // Store new values in forApprovalVersion (keep original values in main fields)
            existingRecord.forApprovalVersion = {
                ...existingRecord.forApprovalVersion,
                docno: command.stockDeliveryDto.docno,
                supplierId: command.stockDeliveryDto.supplierId,
                supplierName: command.stockDeliveryDto.supplierName,
                dateReceived: command.stockDeliveryDto.dateReceived,
                deliveryDetails: command.stockDeliveryDto.deliveryDetails,
            };
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
