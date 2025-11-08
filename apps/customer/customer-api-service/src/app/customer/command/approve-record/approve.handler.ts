import { CustomerDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerDto, ResponseDto, StatusEnum } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApproveCustomerCommand } from './approve.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(ApproveCustomerCommand)
export class ApproveCustomerHandler implements ICommandHandler<ApproveCustomerCommand> {
    protected readonly logger = new Logger(ApproveCustomerHandler.name);

    constructor(
        @Inject('CustomerDatabaseService')
        private readonly customerDatabaseService: CustomerDatabaseServiceAbstract
    ) {}

    async execute(command: ApproveCustomerCommand): Promise<ResponseDto<CustomerDto>> {
        this.logger.log(`Processing approve request for customer: ${command.customerId}`);

        try {
            // Check if customer exists
            const existingCustomer = await this.customerDatabaseService.findRecordById(command.customerId);
            if (!existingCustomer) {
                throw new NotFoundException(`Customer not found for ID: ${command.customerId}`);
            }

            // Check user authorization
            this.validateUserPermissions(command.user);

            // Update customer status based on current status
            const updatedCustomer = await this.updateCustomerStatus(command, existingCustomer);

            this.logger.log(`Customer approved successfully: ${command.customerId}`);
            return new ResponseDto<CustomerDto>(updatedCustomer, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.customerId);
        }
    }

    /**
     * Validates user permissions for approval
     */
    private validateUserPermissions(user: any): void {
        if (!user.roles || user.roles.length === 0) {
            throw new ForbiddenException('Insufficient permissions to approve customer');
        }

        const hasPermission = user.roles.includes('SUPER_ADMIN') || user.roles.includes('ADMIN');
        if (!hasPermission) {
            throw new ForbiddenException('Insufficient permissions to approve customer');
        }
    }

    /**
     * Updates customer status based on current status
     */
    private async updateCustomerStatus(
        command: ApproveCustomerCommand,
        existingCustomer: CustomerDto
    ): Promise<CustomerDto> {
        const updatedCustomer = { ...existingCustomer };

        // Update activity logs
        updatedCustomer.activityLogs = existingCustomer.activityLogs || [];
        updatedCustomer.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Customer approved by ${command.user.username}`
        );

        // Limit activity logs to last 10 entries
        updatedCustomer.activityLogs = reduceArrayContents(updatedCustomer.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Update status based on current status
        if (existingCustomer.status === StatusEnum.NEW_RECORD) {
            updatedCustomer.status = StatusEnum.ACTIVE;
            // Apply forApprovalVersion if it exists
            if (existingCustomer.forApprovalVersion) {
                Object.assign(updatedCustomer, existingCustomer.forApprovalVersion);
                updatedCustomer.forApprovalVersion = undefined;
            }
            // Reset changeReason after applying changes
            updatedCustomer.changeReason = null;
        } else if (existingCustomer.status === StatusEnum.FOR_APPROVAL) {
            updatedCustomer.status = StatusEnum.ACTIVE;
            // Apply forApprovalVersion if it exists
            if (existingCustomer.forApprovalVersion) {
                Object.assign(updatedCustomer, existingCustomer.forApprovalVersion);
                updatedCustomer.forApprovalVersion = undefined;
            }
            // Reset changeReason after applying changes
            updatedCustomer.changeReason = null;
        } else if (existingCustomer.status === StatusEnum.FOR_DELETION) {
            return await this.customerDatabaseService.deleteRecord(updatedCustomer);
        }

        // Update record in database
        return await this.customerDatabaseService.updateRecord(updatedCustomer);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, customerId: string): never {
        this.logger.error(`Error processing approve request for customer ${customerId}:`, error);

        // Re-throw known exceptions
        if (error instanceof ForbiddenException || error instanceof NotFoundException) {
            throw error;
        }

        // Handle unknown errors
        const errorMessage = this.extractErrorMessage(error);
        throw new Error(errorMessage);
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
