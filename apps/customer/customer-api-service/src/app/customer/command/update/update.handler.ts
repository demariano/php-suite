import { CustomerDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { detectFieldChanges, formatFieldChanges } from '@field-change-utils-lib';
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
            // When FOR_APPROVAL: keeps original values in main fields, stores new values in forApprovalVersion
            // When ACTIVE: applies new values directly to main fields
            this.updateCustomerStatus(command, hasApprovalPermission, existingCustomer);

            // Update record in database
            // When FOR_APPROVAL: existingCustomer has original values + forApprovalVersion with new values
            // When ACTIVE: command.customerDto has new values applied directly
            const recordToUpdate = hasApprovalPermission ? command.customerDto : existingCustomer;
            const updatedRecord = await this.customerDatabaseService.updateRecord(recordToUpdate);

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
     * When FOR_APPROVAL: keeps original values in main fields, stores new values in forApprovalVersion
     * When ACTIVE: applies new values directly to main fields
     */
    private updateCustomerStatus(
        command: UpdateCustomerCommand,
        hasApprovalPermission: boolean,
        existingCustomer: CustomerDto
    ): void {
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE and apply new values to main fields
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

            // Clear changeReason for admin users since changes are applied directly
            command.customerDto.changeReason = undefined;
        } else {
            // User needs approval - store changes in forApprovalVersion, keep existing record unchanged
            existingCustomer.status = StatusEnum.FOR_APPROVAL;
            existingCustomer.activityLogs = existingCustomer.activityLogs || [];

            // Detect field changes
            const fieldChanges = detectFieldChanges(existingCustomer, command.customerDto, {
                arrayIdFields: {
                    customerTerms: 'termsId',
                    customerProductDeals: 'productDealId',
                },
            });
            const formattedChanges = formatFieldChanges(fieldChanges);

            // Build activity log message
            let activityLogMessage = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Customer updated by ${command.user.username} for approval`;

            // Append changes to activity log if any changes detected
            if (formattedChanges) {
                activityLogMessage += ` - ${formattedChanges}`;
            }

            existingCustomer.activityLogs.push(activityLogMessage);

            // Limit activity logs to last 10 entries
            existingCustomer.activityLogs = reduceArrayContents(existingCustomer.activityLogs, ACTIVITY_LOGS_LIMIT);

            // Preserve user's manually entered changeReason and combine with auto-generated changes
            const userChangeReason = command.customerDto.changeReason?.trim();
            if (userChangeReason && formattedChanges) {
                // User provided changeReason and we have formatted changes - combine them
                // formatFieldChanges already starts with \n, so we just concatenate
                existingCustomer.changeReason = `${userChangeReason}${formattedChanges}`;
            } else if (userChangeReason) {
                // User provided changeReason but no formatted changes - use user's input
                existingCustomer.changeReason = userChangeReason;
            } else if (formattedChanges) {
                // No user input but we have formatted changes - use formatted changes
                existingCustomer.changeReason = formattedChanges;
            } else {
                // No user input and no formatted changes
                existingCustomer.changeReason = undefined;
            }

            // Store new values in forApprovalVersion (keep original values in main fields)
            existingCustomer.forApprovalVersion = {
                ...existingCustomer.forApprovalVersion,
                customerName: command.customerDto.customerName,
                email: command.customerDto.email,
                address1: command.customerDto.address1,
                address2: command.customerDto.address2,
                balance: command.customerDto.balance,
                contactNo: command.customerDto.contactNo,
                contactPerson: command.customerDto.contactPerson,
                townId: command.customerDto.townId,
                townName: command.customerDto.townName,
                creditLimit: command.customerDto.creditLimit,
                customerCredit: command.customerDto.customerCredit,
                tinNumber: command.customerDto.tinNumber,
                areaId: command.customerDto.areaId,
                areaName: command.customerDto.areaName,
                customerClassificationId: command.customerDto.customerClassificationId,
                customerClassificationName: command.customerDto.customerClassificationName,
                customerTypeId: command.customerDto.customerTypeId,
                customerTypeName: command.customerDto.customerTypeName,
                customerTerms: command.customerDto.customerTerms,
                customerProductDeals: command.customerDto.customerProductDeals,
            };
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
