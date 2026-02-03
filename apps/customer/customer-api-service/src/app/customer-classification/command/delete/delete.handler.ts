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

            // Build the updated DTO with proper status and activity logs
            const customerClassificationDto = this.buildCustomerClassificationDto(
                existingRecord,
                command,
                hasApprovalPermission
            );

            // Perform deletion based on permissions and status
            const deletedRecord = await this.performDeletion(customerClassificationDto, hasApprovalPermission);

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
     * Builds the customer classification DTO with updated status and activity logs
     * Uses spread operator to preserve all existing fields and prevent undefined errors
     */
    private buildCustomerClassificationDto(
        existingRecord: CustomerClassificationDto,
        command: DeleteCustomerClassificationCommand,
        hasApprovalPermission: boolean
    ): CustomerClassificationDto {
        let status: StatusEnum;
        let activityLog: string;
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });

        if (hasApprovalPermission) {
            // Admin can deactivate directly
            status = StatusEnum.INACTIVE;
            activityLog = `Date: ${timestamp}, Customer classification marked for deactivation by ${
                command.user.username
            }. Reason: ${command.deletionReason || 'No reason provided'}`;
        } else {
            // Regular user marks for deactivation (requires approval)
            status = StatusEnum.FOR_DEACTIVATION;
            activityLog = `Date: ${timestamp}, Customer classification marked for deactivation by ${
                command.user.username
            }. Reason: ${command.deletionReason || 'No reason provided'}`;
        }

        const activityLogs = reduceArrayContents(
            [...(existingRecord.activityLogs || []), activityLog],
            ACTIVITY_LOGS_LIMIT
        );

        // Use spread operator to preserve all existing fields
        const dto: CustomerClassificationDto = {
            ...existingRecord,
            status,
            deletionReason: command.deletionReason,
            activityLogs,
        };

        return dto;
    }

    /**
     * Performs the actual deletion based on user permissions
     * Master data uses soft delete only - hard delete only for NEW_RECORD cleanup
     */
    private async performDeletion(
        customerClassificationDto: CustomerClassificationDto,
        hasApprovalPermission: boolean
    ): Promise<CustomerClassificationDto> {
        // Clean up NEW_RECORD before processing
        if (customerClassificationDto.status === StatusEnum.NEW_RECORD) {
            await this.customerClassificationDatabaseService.deleteRecord(customerClassificationDto);
        }

        // Always use updateRecord for master data (soft delete)
        return await this.customerClassificationDatabaseService.updateRecord(customerClassificationDto);
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
