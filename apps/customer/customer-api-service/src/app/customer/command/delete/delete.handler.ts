import { CustomerDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteCustomerCommand } from './delete.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(DeleteCustomerCommand)
export class DeleteCustomerHandler implements ICommandHandler<DeleteCustomerCommand> {
    protected readonly logger = new Logger(DeleteCustomerHandler.name);

    constructor(
        @Inject('CustomerDatabaseService')
        private readonly customerDatabaseService: CustomerDatabaseServiceAbstract
    ) {}

    async execute(command: DeleteCustomerCommand): Promise<ResponseDto<CustomerDto>> {
        this.logger.log(`Processing delete request for customer: ${command.customerId}`);

        try {
            // Check if customer exists
            const existingCustomer = await this.customerDatabaseService.findRecordById(command.customerId);
            if (!existingCustomer) {
                throw new NotFoundException(`Customer not found for ID: ${command.customerId}`);
            }

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);
            console.log('hasApprovalPermission', hasApprovalPermission);

            // Update status and activity logs based on permissions
            this.updateCustomerStatus(command, hasApprovalPermission, existingCustomer);

            // Update record in database (SOFT DELETE - always update, never hard delete)
            const updatedRecord = await this.customerDatabaseService.updateRecord(command.customerDto);
            return new ResponseDto<CustomerDto>(updatedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.customerId);
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
     * Updates customer status and activity logs based on user permissions
     * MASTER DATA SOFT DELETE PATTERN:
     * - ADMIN/SUPER_ADMIN: Immediate soft delete (status → INACTIVE)
     * - USER: Request approval (status → FOR_DEACTIVATION)
     */
    private updateCustomerStatus(
        command: DeleteCustomerCommand,
        hasApprovalPermission: boolean,
        existingCustomer: CustomerDto
    ): void {
        command.customerDto.activityLogs = existingCustomer.activityLogs || [];

        const deletionReason = command.customerDto.deletionReason?.trim();
        command.customerDto.deletionReason = deletionReason || undefined;

        if (hasApprovalPermission) {
            // ADMIN/SUPER_ADMIN: Immediate soft delete - set to INACTIVE
            command.customerDto.status = StatusEnum.INACTIVE;
            command.customerDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Customer deactivated by ${command.user.username}, status set to ${StatusEnum.INACTIVE}`
            );
        } else {
            // USER: Needs approval - set to FOR_DEACTIVATION
            command.customerDto.status = StatusEnum.FOR_DEACTIVATION;
            command.customerDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Customer deactivation requested by ${command.user.username} for approval, status set to ${
                    StatusEnum.FOR_DEACTIVATION
                }`
            );
        }

        // Limit activity logs to last 10 entries
        command.customerDto.activityLogs = reduceArrayContents(command.customerDto.activityLogs, ACTIVITY_LOGS_LIMIT);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, customerId: string): never {
        this.logger.error(`Error processing delete request for customer ${customerId}:`, error);

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
