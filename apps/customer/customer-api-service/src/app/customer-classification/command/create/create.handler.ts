import { CustomerClassificationDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerClassificationDto, ErrorResponseDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateCustomerClassificationCommand } from './create.command';

// Constants
const HTTP_STATUS_CREATED = 201;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(CreateCustomerClassificationCommand)
export class CreateCustomerClassificationHandler implements ICommandHandler<CreateCustomerClassificationCommand> {
    protected readonly logger = new Logger(CreateCustomerClassificationHandler.name);

    constructor(
        @Inject('CustomerClassificationDatabaseService')
        private readonly customerClassificationDatabaseService: CustomerClassificationDatabaseServiceAbstract
    ) {}

    async execute(
        command: CreateCustomerClassificationCommand
    ): Promise<ResponseDto<CustomerClassificationDto | ErrorResponseDto>> {
        this.logger.log(
            `Processing create request for customer classification: ${command.customerClassificationDto.customerClassificationName}`
        );

        try {
            // Validate that customer classification name doesn't already exist
            await this.validateCustomerClassificationNameUnique(
                command.customerClassificationDto.customerClassificationName
            );

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateCustomerClassificationStatus(command, hasApprovalPermission);

            // Create record in database
            const createdRecord = await this.customerClassificationDatabaseService.createRecord(
                command.customerClassificationDto
            );

            this.logger.log(`Customer classification created successfully: ${createdRecord.customerClassificationId}`);
            return new ResponseDto<CustomerClassificationDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.customerClassificationDto.customerClassificationName);
        }
    }

    /**
     * Validates that the customer classification name is unique
     */
    private async validateCustomerClassificationNameUnique(customerClassificationName: string): Promise<void> {
        const existingRecord = await this.customerClassificationDatabaseService.findRecordByName(
            customerClassificationName
        );

        if (existingRecord) {
            this.logger.warn(`Customer classification name already exists: ${customerClassificationName}`);
            throw new BadRequestException('Customer classification name already exists');
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
     * Updates customer classification status and activity logs based on user permissions
     */
    private updateCustomerClassificationStatus(
        command: CreateCustomerClassificationCommand,
        hasApprovalPermission: boolean
    ): void {
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            command.customerClassificationDto.status = StatusEnum.ACTIVE;
            command.customerClassificationDto.activityLogs = [];
            command.customerClassificationDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Customer classification created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );

            // Limit activity logs to last 10 entries
            command.customerClassificationDto.activityLogs = reduceArrayContents(
                command.customerClassificationDto.activityLogs,
                ACTIVITY_LOGS_LIMIT
            );
        } else {
            // User needs approval - set to FOR_APPROVAL
            command.customerClassificationDto.status = StatusEnum.NEW_RECORD;
            command.customerClassificationDto.activityLogs = [];
            command.customerClassificationDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Customer classification created by ${command.user.username} for approval`
            );

            // Limit activity logs to last 10 entries
            command.customerClassificationDto.activityLogs = reduceArrayContents(
                command.customerClassificationDto.activityLogs,
                ACTIVITY_LOGS_LIMIT
            );
            command.customerClassificationDto.forApprovalVersion = {};
            command.customerClassificationDto.forApprovalVersion.customerClassificationName =
                command.customerClassificationDto.customerClassificationName;
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, customerClassificationName: string): never {
        this.logger.error(`Error processing create request for ${customerClassificationName}:`, error);

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
