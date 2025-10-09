import { CustomerDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateCustomerCommand } from './update.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(UpdateCustomerCommand)
export class UpdateCustomerHandler implements ICommandHandler<UpdateCustomerCommand> {
    protected readonly logger = new Logger(UpdateCustomerHandler.name);

    constructor(
        @Inject('CustomerDatabaseService')
        private readonly customerDatabaseService: CustomerDatabaseServiceAbstract
    ) {}

    async execute(command: UpdateCustomerCommand): Promise<ResponseDto<CustomerDto>> {
        this.logger.log(`Processing update request for customer: ${command.customerId}`);

        try {
            // Check if customer exists
            const existingCustomer = await this.customerDatabaseService.findRecordById(command.customerId);
            if (!existingCustomer) {
                throw new NotFoundException(`Customer not found for ID: ${command.customerId}`);
            }

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateCustomerStatus(command, hasApprovalPermission, existingCustomer);

            // Update record in database
            const updatedRecord = await this.customerDatabaseService.updateRecord(command.customerDto);

            this.logger.log(`Customer updated successfully: ${command.customerId}`);
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
     */
    private updateCustomerStatus(
        command: UpdateCustomerCommand,
        hasApprovalPermission: boolean,
        existingCustomer: CustomerDto
    ): void {
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            command.customerDto.status = StatusEnum.ACTIVE;
            command.customerDto.activityLogs = existingCustomer.activityLogs || [];
            command.customerDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Customer updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );

            // Limit activity logs to last 10 entries
            command.customerDto.activityLogs = reduceArrayContents(
                command.customerDto.activityLogs,
                ACTIVITY_LOGS_LIMIT
            );
        } else {
            // User needs approval - set to FOR_APPROVAL
            command.customerDto.status = StatusEnum.FOR_APPROVAL;
            command.customerDto.activityLogs = existingCustomer.activityLogs || [];
            command.customerDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Customer updated by ${command.user.username} for approval`
            );

            // Limit activity logs to last 10 entries
            command.customerDto.activityLogs = reduceArrayContents(
                command.customerDto.activityLogs,
                ACTIVITY_LOGS_LIMIT
            );

            // Set the forApprovalVersion
            command.customerDto.forApprovalVersion = {};
            command.customerDto.forApprovalVersion.customerName = command.customerDto.customerName;
            command.customerDto.forApprovalVersion.email = command.customerDto.email;
            command.customerDto.forApprovalVersion.address1 = command.customerDto.address1;
            command.customerDto.forApprovalVersion.address2 = command.customerDto.address2;
            command.customerDto.forApprovalVersion.balance = command.customerDto.balance;
            command.customerDto.forApprovalVersion.contactNo = command.customerDto.contactNo;
            command.customerDto.forApprovalVersion.contactPerson = command.customerDto.contactPerson;
            command.customerDto.forApprovalVersion.townId = command.customerDto.townId;
            command.customerDto.forApprovalVersion.townName = command.customerDto.townName;
            command.customerDto.forApprovalVersion.creditLimit = command.customerDto.creditLimit;
            command.customerDto.forApprovalVersion.customerCredit = command.customerDto.customerCredit;
            command.customerDto.forApprovalVersion.tinNumber = command.customerDto.tinNumber;
            command.customerDto.forApprovalVersion.areaId = command.customerDto.areaId;
            command.customerDto.forApprovalVersion.areaName = command.customerDto.areaName;
            command.customerDto.forApprovalVersion.customerClassificationId =
                command.customerDto.customerClassificationId;
            command.customerDto.forApprovalVersion.customerClassificationName =
                command.customerDto.customerClassificationName;
            command.customerDto.forApprovalVersion.customerTypeId = command.customerDto.customerTypeId;
            command.customerDto.forApprovalVersion.customerTypeName = command.customerDto.customerTypeName;
            command.customerDto.forApprovalVersion.customerTerms = command.customerDto.customerTerms;
            command.customerDto.forApprovalVersion.customerDeals = command.customerDto.customerDeals;
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, customerId: string): never {
        this.logger.error(`Error processing update request for customer ${customerId}:`, error);

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
