import { CustomerDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerDto, ErrorResponseDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateCustomerCommand } from './create.command';

// Constants
const HTTP_STATUS_CREATED = 201;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(CreateCustomerCommand)
export class CreateCustomerHandler implements ICommandHandler<CreateCustomerCommand> {
    protected readonly logger = new Logger(CreateCustomerHandler.name);

    constructor(
        @Inject('CustomerDatabaseService')
        private readonly customerDatabaseService: CustomerDatabaseServiceAbstract
    ) {}

    async execute(command: CreateCustomerCommand): Promise<ResponseDto<CustomerDto | ErrorResponseDto>> {
        this.logger.log(`Processing create request for customer: ${command.customerDto.customerName}`);

        try {
            // Validate that customer name doesn't already exist
            await this.validateCustomerNameUnique(command.customerDto.customerName);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateCustomerStatus(command, hasApprovalPermission);

            // Create record in database
            const createdRecord = await this.customerDatabaseService.createRecord(command.customerDto);

            this.logger.log(`Customer created successfully: ${createdRecord.customerId}`);
            return new ResponseDto<CustomerDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.customerDto.customerName);
        }
    }

    /**
     * Validates that the customer name is unique
     */
    private async validateCustomerNameUnique(customerName: string): Promise<void> {
        const existingRecord = await this.customerDatabaseService.findRecordByName(customerName);

        if (existingRecord) {
            this.logger.warn(`Customer name already exists: ${customerName}`);
            throw new BadRequestException('Customer name already exists');
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
    private updateCustomerStatus(command: CreateCustomerCommand, hasApprovalPermission: boolean): void {
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            command.customerDto.status = StatusEnum.ACTIVE;
            command.customerDto.activityLogs = [];
            command.customerDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Customer created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );

            // Limit activity logs to last 10 entries
            command.customerDto.activityLogs = reduceArrayContents(
                command.customerDto.activityLogs,
                ACTIVITY_LOGS_LIMIT
            );
        } else {
            // User needs approval - set to FOR_APPROVAL
            command.customerDto.status = StatusEnum.NEW_RECORD;
            command.customerDto.activityLogs = [];
            command.customerDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Customer created by ${command.user.username} for approval`
            );

            // Limit activity logs to last 10 entries
            command.customerDto.activityLogs = reduceArrayContents(
                command.customerDto.activityLogs,
                ACTIVITY_LOGS_LIMIT
            );

            //set the forApprovalVersion
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
    private handleError(error: unknown, customerName: string): never {
        this.logger.error(`Error processing create request for ${customerName}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException) {
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
