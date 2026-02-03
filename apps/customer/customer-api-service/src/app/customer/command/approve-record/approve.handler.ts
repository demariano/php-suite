import { CustomerDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerDto, CustomerEventDto, CustomerEventEnum, ResponseDto, StatusEnum } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { MessageQueueServiceAbstract } from '@message-queue-lib';
import { ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
        private readonly customerDatabaseService: CustomerDatabaseServiceAbstract,
        @Inject('MessageQueueAwsLibService')
        private readonly messageQueueService: MessageQueueServiceAbstract,
        private readonly configService: ConfigService
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
            // Check if customerName changed before applying forApprovalVersion
            const oldCustomerName = existingCustomer.customerName;
            const newCustomerName = existingCustomer.forApprovalVersion?.customerName;
            const customerNameChanged = newCustomerName && oldCustomerName !== newCustomerName;

            // Apply forApprovalVersion if it exists
            if (existingCustomer.forApprovalVersion) {
                Object.assign(updatedCustomer, existingCustomer.forApprovalVersion);
                updatedCustomer.forApprovalVersion = undefined;
            }
            // Reset changeReason after applying changes
            updatedCustomer.changeReason = null;

            // Update record in database
            const result = await this.customerDatabaseService.updateRecord(updatedCustomer);

            // Publish customer name change event if name changed
            if (customerNameChanged && newCustomerName) {
                await this.publishCustomerNameChangeEvent(existingCustomer.customerId, newCustomerName as string);
            }

            return result;
        } else if (existingCustomer.status === StatusEnum.FOR_DEACTIVATION) {
            // FOR_DEACTIVATION → INACTIVE (soft delete for Master Data)
            updatedCustomer.status = StatusEnum.INACTIVE;
            updatedCustomer.changeReason = null;
            updatedCustomer.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Customer deactivation approved, status set to ${StatusEnum.INACTIVE}`
            );
            updatedCustomer.activityLogs = reduceArrayContents(updatedCustomer.activityLogs, ACTIVITY_LOGS_LIMIT);
            return await this.customerDatabaseService.updateRecord(updatedCustomer);
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

    /**
     * Publishes customer name change event to SQS
     */
    private async publishCustomerNameChangeEvent(customerId: string, newCustomerName: string): Promise<void> {
        try {
            this.logger.log(`Publishing customer name change event for customerId: ${customerId}`);

            const event: CustomerEventDto = {
                eventType: CustomerEventEnum.CUSTOMER_UPDATED,
                customerId: customerId,
                newCustomerName: newCustomerName,
                timestamp: new Date().toISOString(),
            };

            const invoiceEventSQSUrl = this.configService.get<string>('INVOICE_EVENT_SQS');
            const accountingEventSQSUrl = this.configService.get<string>('ACCOUNTING_EVENT_SQS');

            // Publish to Invoice Event SQS
            await this.messageQueueService.sendMessageToSQS(invoiceEventSQSUrl, JSON.stringify(event));
            this.logger.log(`Customer name change event published to INVOICE_EVENT_SQS for customerId: ${customerId}`);

            // Publish to Accounting Event SQS
            if (accountingEventSQSUrl) {
                await this.messageQueueService.sendMessageToSQS(accountingEventSQSUrl, JSON.stringify(event));
                this.logger.log(
                    `Customer name change event published to ACCOUNTING_EVENT_SQS for customerId: ${customerId}`
                );
            }
        } catch (error) {
            this.logger.error(`Failed to publish customer name change event for customerId: ${customerId}`, error);
            // Don't throw - this is a non-critical operation
        }
    }
}
