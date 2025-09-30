import { CustomerTypeDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerTypeDto, ErrorResponseDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateCustomerTypeCommand } from './update.command';

// Constants
const HTTP_STATUS_OK = 200;

@CommandHandler(UpdateCustomerTypeCommand)
export class UpdateCustomerTypeHandler implements ICommandHandler<UpdateCustomerTypeCommand> {
    protected readonly logger = new Logger(UpdateCustomerTypeHandler.name);

    constructor(
        @Inject('CustomerTypeDatabaseService')
        private readonly customerTypeDatabaseService: CustomerTypeDatabaseServiceAbstract
    ) {}

    async execute(command: UpdateCustomerTypeCommand): Promise<ResponseDto<CustomerTypeDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for customer type: ${command.recordId}`);

        try {
            // Fetch and validate existing customer type record
            const existingRecord = await this.fetchCustomerTypeById(command.recordId);

            // Validate that customer type name doesn't already exist (if changed)
            await this.validateCustomerTypeNameUnique(command.customerTypeDto.customerTypeName, command.recordId);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateCustomerTypeStatus(command, existingRecord, hasApprovalPermission);

            // Update record in database
            const updatedRecord = await this.customerTypeDatabaseService.updateRecord(existingRecord);

            this.logger.log(`Customer type updated successfully: ${updatedRecord.customerTypeId}`);
            return new ResponseDto<CustomerTypeDto>(updatedRecord, HTTP_STATUS_OK);
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
     * Validates that the customer type name is unique (excluding current record)
     */
    private async validateCustomerTypeNameUnique(customerTypeName: string, currentRecordId: string): Promise<void> {
        const existingRecord = await this.customerTypeDatabaseService.findRecordByName(customerTypeName);

        if (existingRecord && existingRecord.customerTypeId !== currentRecordId) {
            this.logger.warn(`Customer type name already exists: ${customerTypeName}`);
            throw new BadRequestException('Customer type name already exists');
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
     * Updates customer type status and activity logs based on user permissions
     */
    private updateCustomerTypeStatus(
        command: UpdateCustomerTypeCommand,
        existingRecord: CustomerTypeDto,
        hasApprovalPermission: boolean
    ): void {
        if (hasApprovalPermission) {
            // User can approve directly - update the existing record
            existingRecord.status = StatusEnum.ACTIVE;
            existingRecord.customerTypeName = command.customerTypeDto.customerTypeName;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Customer type updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`;
            existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        } else {
            // User needs approval - store changes in forApprovalVersion, keep existing record unchanged
            existingRecord.status = StatusEnum.FOR_APPROVAL;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Customer type updated by ${command.user.username} for approval`;
            existingRecord.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
            existingRecord.forApprovalVersion = {
                ...existingRecord.forApprovalVersion,
                customerTypeName: command.customerTypeDto.customerTypeName,
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
