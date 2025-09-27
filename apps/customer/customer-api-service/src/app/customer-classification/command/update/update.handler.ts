import { CustomerClassificationDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerClassificationDto, ErrorResponseDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateCustomerClassificationCommand } from './update.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(UpdateCustomerClassificationCommand)
export class UpdateCustomerClassificationHandler implements ICommandHandler<UpdateCustomerClassificationCommand> {
    protected readonly logger = new Logger(UpdateCustomerClassificationHandler.name);

    constructor(
        @Inject('CustomerClassificationDatabaseService')
        private readonly customerClassificationDatabaseService: CustomerClassificationDatabaseServiceAbstract
    ) {}

    async execute(
        command: UpdateCustomerClassificationCommand
    ): Promise<ResponseDto<CustomerClassificationDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for customer classification: ${command.recordId}`);

        try {
            // Fetch and validate existing customer classification record
            const existingRecord = await this.fetchCustomerClassificationById(command.recordId);

            // Validate that customer classification name doesn't already exist (if changed)
            await this.validateCustomerClassificationNameUnique(
                command.customerClassificationDto.customerClassificationName,
                command.recordId
            );

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateCustomerClassificationStatus(command, existingRecord, hasApprovalPermission);

            // Update record in database
            const updatedRecord = await this.customerClassificationDatabaseService.updateRecord(existingRecord);

            this.logger.log(`Customer classification updated successfully: ${updatedRecord.customerClassificationId}`);
            return new ResponseDto<CustomerClassificationDto>(updatedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Fetches and validates a customer classification record by ID
     */
    private async fetchCustomerClassificationById(recordId: string): Promise<CustomerClassificationDto> {
        const customerClassificationRecord = await this.customerClassificationDatabaseService.findRecordById(recordId);

        if (!customerClassificationRecord) {
            this.logger.warn(`Customer classification not found for ID: ${recordId}`);
            throw new NotFoundException(`Customer classification not found for ID: ${recordId}`);
        }

        return customerClassificationRecord;
    }

    /**
     * Validates that the customer classification name is unique (excluding current record)
     */
    private async validateCustomerClassificationNameUnique(
        customerClassificationName: string,
        currentRecordId: string
    ): Promise<void> {
        const existingRecord = await this.customerClassificationDatabaseService.findRecordByName(
            customerClassificationName
        );

        if (existingRecord && existingRecord.customerClassificationId !== currentRecordId) {
            this.logger.warn(`Customer classification name already exists: ${customerClassificationName}`);
            throw new BadRequestException('Customer classification name already exists');
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
     * Updates customer classification status and activity logs based on user permissions
     */
    private updateCustomerClassificationStatus(
        command: UpdateCustomerClassificationCommand,
        existingRecord: CustomerClassificationDto,
        hasApprovalPermission: boolean
    ): void {
        if (hasApprovalPermission) {
            // User can approve directly - update the existing record
            existingRecord.status = StatusEnum.ACTIVE;
            existingRecord.customerClassificationName = command.customerClassificationDto.customerClassificationName;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Customer classification updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`;
            existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

            // Limit activity logs to last 10 entries
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        } else {
            // User needs approval - store changes in forApprovalVersion, keep existing record unchanged
            existingRecord.status = StatusEnum.FOR_APPROVAL;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Customer classification updated by ${command.user.username} for approval`;
            existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

            // Limit activity logs to last 10 entries
            existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
            existingRecord.forApprovalVersion = {
                ...existingRecord.forApprovalVersion,
                customerClassificationName: command.customerClassificationDto.customerClassificationName,
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
