import { CustomerClassificationDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerClassificationDto, ErrorResponseDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteCustomerClassificationCommand } from './delete.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(DeleteCustomerClassificationCommand)
export class DeleteCustomerClassificationHandler implements ICommandHandler<DeleteCustomerClassificationCommand> {
    protected readonly logger = new Logger(DeleteCustomerClassificationHandler.name);

    constructor(
        @Inject('CustomerClassificationDatabaseService')
        private readonly customerClassificationDatabaseService: CustomerClassificationDatabaseServiceAbstract
    ) {}

    async execute(
        command: DeleteCustomerClassificationCommand
    ): Promise<ResponseDto<CustomerClassificationDto | ErrorResponseDto>> {
        this.logger.log(`Processing delete request for customer classification: ${command.recordId}`);

        try {
            // Fetch and validate existing customer classification record
            const existingRecord = await this.fetchCustomerClassificationById(command.recordId);

            // Check user authorization
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateCustomerClassificationStatus(command, existingRecord, hasApprovalPermission);

            // Delete or mark for deletion based on permissions
            const deletedRecord = await this.performDeletion(command, hasApprovalPermission);

            this.logger.log(`Customer classification deleted successfully: ${deletedRecord.customerClassificationId}`);
            return new ResponseDto<CustomerClassificationDto>(deletedRecord, HTTP_STATUS_OK);
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
        command: DeleteCustomerClassificationCommand,
        existingRecord: CustomerClassificationDto,
        hasApprovalPermission: boolean
    ): void {
        // Set the ID
        command.customerClassificationDto.customerClassificationId = command.recordId;

        if (hasApprovalPermission) {
            // User can delete directly - set to FOR_DELETION for hard delete
            command.customerClassificationDto.status = StatusEnum.FOR_DELETION;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Customer classification deleted by ${command.user.username}`;
            command.customerClassificationDto.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
            
            // Limit activity logs to last 10 entries
            command.customerClassificationDto.activityLogs = reduceArrayContents(command.customerClassificationDto.activityLogs, ACTIVITY_LOGS_LIMIT);
        } else {
            // User needs approval - set to FOR_DELETION for soft delete
            command.customerClassificationDto.status = StatusEnum.FOR_DELETION;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Customer classification marked for deletion by ${command.user.username}`;
            command.customerClassificationDto.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
            
            // Limit activity logs to last 10 entries
            command.customerClassificationDto.activityLogs = reduceArrayContents(command.customerClassificationDto.activityLogs, ACTIVITY_LOGS_LIMIT);
        }
    }

    /**
     * Performs the actual deletion based on user permissions
     */
    private async performDeletion(
        command: DeleteCustomerClassificationCommand,
        hasApprovalPermission: boolean
    ): Promise<CustomerClassificationDto> {
        if (hasApprovalPermission) {
            // Hard delete
            return await this.customerClassificationDatabaseService.deleteRecord(command.customerClassificationDto);
        } else {
            // Soft delete (mark for deletion)
            return await this.customerClassificationDatabaseService.updateRecord(command.customerClassificationDto);
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
}
