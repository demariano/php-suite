import { CustomerTypeDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerTypeDto, ErrorResponseDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteCustomerTypeCommand } from './delete.command';

// Constants
const HTTP_STATUS_OK = 200;

@CommandHandler(DeleteCustomerTypeCommand)
export class DeleteCustomerTypeHandler implements ICommandHandler<DeleteCustomerTypeCommand> {
    protected readonly logger = new Logger(DeleteCustomerTypeHandler.name);

    constructor(
        @Inject('CustomerTypeDatabaseService')
        private readonly customerTypeDatabaseService: CustomerTypeDatabaseServiceAbstract
    ) {}

    async execute(command: DeleteCustomerTypeCommand): Promise<ResponseDto<CustomerTypeDto | ErrorResponseDto>> {
        this.logger.log(`Processing delete request for customer type: ${command.recordId}`);

        try {
            // Fetch and validate existing customer type record
            const existingRecord = await this.fetchCustomerTypeById(command.recordId);

            // Check user authorization
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Build the customer type DTO with updated status and activity logs
            const updatedCustomerType = this.buildCustomerTypeDto(existingRecord, command, hasApprovalPermission);

            // Perform soft delete (always update, never hard delete)
            const deletedRecord = await this.performDeletion(updatedCustomerType);

            this.logger.log(`Customer type deleted successfully: ${deletedRecord.customerTypeId}`);
            return new ResponseDto<CustomerTypeDto>(deletedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Fetches and validates a customer type record by ID
     */
    private async fetchCustomerTypeById(recordId: string): Promise<CustomerTypeDto> {
        const customerTypeRecord = await this.customerTypeDatabaseService.findRecordById(recordId);

        if (!customerTypeRecord) {
            this.logger.warn(`Customer type not found for ID: ${recordId}`);
            throw new NotFoundException(`Customer type not found for ID: ${recordId}`);
        }

        return customerTypeRecord;
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
     * Builds the customer type DTO with updated status and activity logs
     * Uses spread operator pattern to preserve existing data
     * MASTER DATA SOFT DELETE PATTERN:
     * - ADMIN/SUPER_ADMIN: Immediate soft delete (status → INACTIVE)
     * - USER: Request approval (status → FOR_DEACTIVATION)
     */
    private buildCustomerTypeDto(
        existingRecord: CustomerTypeDto,
        command: DeleteCustomerTypeCommand,
        hasApprovalPermission: boolean
    ): CustomerTypeDto {
        // Use spread operator to preserve all existing fields
        const updatedCustomerType: CustomerTypeDto = {
            ...existingRecord,
            activityLogs: existingRecord.activityLogs || [],
        };

        // Set deletionReason if provided
        const deletionReason = command.deletionReason?.trim();
        updatedCustomerType.deletionReason = deletionReason || undefined;

        if (hasApprovalPermission) {
            // ADMIN/SUPER_ADMIN: Immediate soft delete - set to INACTIVE
            updatedCustomerType.status = StatusEnum.INACTIVE;
            updatedCustomerType.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Customer type deactivated by ${command.user.username}${
                    deletionReason ? `, reason: ${deletionReason}` : ''
                }`
            );
        } else {
            // USER: Mark for deactivation - requires approval
            updatedCustomerType.status = StatusEnum.FOR_DEACTIVATION;
            updatedCustomerType.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Customer type marked for deactivation by ${command.user.username}${
                    deletionReason ? `, reason: ${deletionReason}` : ''
                }`
            );
        }

        return updatedCustomerType;
    }

    /**
     * Performs the soft deletion by updating the record
     * MASTER DATA PATTERN: Always use updateRecord (never deleteRecord/hard delete)
     */
    private async performDeletion(customerType: CustomerTypeDto): Promise<CustomerTypeDto> {
        return await this.customerTypeDatabaseService.updateRecord(customerType);
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
