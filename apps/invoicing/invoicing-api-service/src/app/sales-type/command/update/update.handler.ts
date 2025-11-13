import { ErrorResponseDto, ResponseDto, SalesTypeDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { detectFieldChanges, formatFieldChanges } from '@field-change-utils-lib';
import { SalesTypeDatabaseServiceAbstract } from '@invoicing-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateSalesTypeCommand } from './update.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(UpdateSalesTypeCommand)
export class UpdateSalesTypeHandler implements ICommandHandler<UpdateSalesTypeCommand> {
    protected readonly logger = new Logger(UpdateSalesTypeHandler.name);

    constructor(
        @Inject('SalesTypeDatabaseService')
        private readonly salesTypeDatabaseService: SalesTypeDatabaseServiceAbstract
    ) {}

    async execute(command: UpdateSalesTypeCommand): Promise<ResponseDto<SalesTypeDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for sales type: ${command.salesTypeId}`);

        try {
            // Fetch existing record
            const existingRecord = await this.fetchExistingSalesType(command.salesTypeId);

            // Validate that sales type name doesn't already exist (if changed)
            await this.validateSalesTypeNameUnique(command.salesTypeDto.salesTypeName, command.salesTypeId);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateSalesTypeStatus(command, existingRecord, hasApprovalPermission);

            // Update record in database
            const updatedRecord = await this.salesTypeDatabaseService.updateRecord(existingRecord);

            this.logger.log(`Sales type updated successfully: ${updatedRecord.salesTypeId}`);
            return new ResponseDto<SalesTypeDto>(updatedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.salesTypeId);
        }
    }

    /**
     * Fetches and validates an existing sales type record
     */
    private async fetchExistingSalesType(salesTypeId: string): Promise<SalesTypeDto> {
        const existingRecord = await this.salesTypeDatabaseService.findRecordById(salesTypeId);

        if (!existingRecord) {
            this.logger.warn(`Sales type not found for ID: ${salesTypeId}`);
            throw new NotFoundException(`Sales type not found for ID: ${salesTypeId}`);
        }

        return existingRecord;
    }

    /**
     * Validates that the sales type name is unique (if changed)
     */
    private async validateSalesTypeNameUnique(salesTypeName: string, salesTypeId: string): Promise<void> {
        const existingRecord = await this.salesTypeDatabaseService.findRecordByName(salesTypeName);

        if (existingRecord && existingRecord.salesTypeId !== salesTypeId) {
            this.logger.warn(`Sales type name already exists: ${salesTypeName}`);
            throw new BadRequestException('Sales type name already exists');
        }
    }

    /**
     * Checks if user has permission to approve updates directly
     */
    private hasApprovalPermission(userRoles?: string[]): boolean {
        console.log('userRoles', userRoles);
        if (!userRoles || userRoles.length === 0) {
            return false;
        }

        return userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);
    }

    /**
     * Updates sales type status and activity logs based on user permissions
     */
    private updateSalesTypeStatus(
        command: UpdateSalesTypeCommand,
        existingRecord: SalesTypeDto,
        hasApprovalPermission: boolean
    ): void {
        console.log('hasApprovalPermission', hasApprovalPermission);
        if (hasApprovalPermission) {
            // User can approve directly - update the existing record
            existingRecord.status = StatusEnum.ACTIVE;
            existingRecord.salesTypeName = command.salesTypeDto.salesTypeName;
            existingRecord.allowDiscount = command.salesTypeDto.allowDiscount;
            existingRecord.contractSales = command.salesTypeDto.contractSales;
            existingRecord.defaultDiscount = command.salesTypeDto.defaultDiscount;
            existingRecord.defaultTax = command.salesTypeDto.defaultTax;
            existingRecord.incomeGenerating = command.salesTypeDto.incomeGenerating;
            existingRecord.taxable = command.salesTypeDto.taxable;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Sales type updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`;
            existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

            // Limit activity logs to last 10 entries
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

            // Clear changeReason for admin users since changes are applied directly
            existingRecord.changeReason = undefined;
        } else {
            // User needs approval - store changes in forApprovalVersion, keep existing record unchanged
            existingRecord.status = StatusEnum.FOR_APPROVAL;
            existingRecord.activityLogs = existingRecord.activityLogs || [];

            // Detect field changes
            const fieldChanges = detectFieldChanges(existingRecord, command.salesTypeDto, {});
            const formattedChanges = formatFieldChanges(fieldChanges);

            // Build activity log message
            let activityLogMessage = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Sales type updated by ${command.user.username} for approval`;

            // Append changes to activity log if any changes detected
            if (formattedChanges) {
                activityLogMessage += ` - ${formattedChanges}`;
            }

            existingRecord.activityLogs.push(activityLogMessage);

            // Limit activity logs to last 10 entries
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

            // Preserve user's manually entered changeReason and combine with auto-generated changes
            const userChangeReason = command.salesTypeDto.changeReason?.trim();
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

            // Store new values in forApprovalVersion (keep original values in main fields)
            existingRecord.forApprovalVersion = {
                ...existingRecord.forApprovalVersion,
                salesTypeName: command.salesTypeDto.salesTypeName,
                allowDiscount: command.salesTypeDto.allowDiscount,
                contractSales: command.salesTypeDto.contractSales,
                defaultDiscount: command.salesTypeDto.defaultDiscount,
                defaultTax: command.salesTypeDto.defaultTax,
                incomeGenerating: command.salesTypeDto.incomeGenerating,
                taxable: command.salesTypeDto.taxable,
            };
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, salesTypeId: string): never {
        this.logger.error(`Error processing update request for ${salesTypeId}:`, error);

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
