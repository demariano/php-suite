import { CustomerTypeDatabaseServiceAbstract } from '@customer-database-service';
import { CustomerTypeDto, ErrorResponseDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateCustomerTypeCommand } from './create.command';

// Constants

const HTTP_STATUS_CREATED = 201;

@CommandHandler(CreateCustomerTypeCommand)
export class CreateCustomerTypeHandler implements ICommandHandler<CreateCustomerTypeCommand> {
    protected readonly logger = new Logger(CreateCustomerTypeHandler.name);

    constructor(
        @Inject('CustomerTypeDatabaseService')
        private readonly customerTypeDatabaseService: CustomerTypeDatabaseServiceAbstract
    ) {}

    async execute(command: CreateCustomerTypeCommand): Promise<ResponseDto<CustomerTypeDto | ErrorResponseDto>> {
        this.logger.log(`Processing create request for customer type: ${command.customerTypeDto.customerTypeName}`);

        try {
            // Validate that customer type name doesn't already exist
            await this.validateCustomerTypeNameUnique(command.customerTypeDto.customerTypeName);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateCustomerTypeStatus(command, hasApprovalPermission);

            // Create record in database
            const createdRecord = await this.customerTypeDatabaseService.createRecord(command.customerTypeDto);

            this.logger.log(`Customer type created successfully: ${createdRecord.customerTypeId}`);
            return new ResponseDto<CustomerTypeDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.customerTypeDto.customerTypeName);
        }
    }

    /**
     * Validates that the customer type name is unique
     */
    private async validateCustomerTypeNameUnique(customerTypeName: string): Promise<void> {
        const existingRecord = await this.customerTypeDatabaseService.findRecordByName(customerTypeName);

        if (existingRecord) {
            this.logger.warn(`Customer type name already exists: ${customerTypeName}`);
            throw new BadRequestException('Customer type name already exists');
        }
    }

    /**
     * Checks if user has permission to approve updates directly
     */
    private hasApprovalPermission(userRoles?: string[]): boolean {
        console.log('userRoles', userRoles);
        if (!userRoles || userRoles.length === 0) {
            return false;
        }

        return userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);
    }

    /**
     * Updates customer type status and activity logs based on user permissions
     */
    private updateCustomerTypeStatus(command: CreateCustomerTypeCommand, hasApprovalPermission: boolean): void {
        console.log('hasApprovalPermission', hasApprovalPermission);
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            command.customerTypeDto.status = StatusEnum.ACTIVE;
            command.customerTypeDto.activityLogs = [];
            command.customerTypeDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Customer type created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );
        } else {
            // User needs approval - set to FOR_APPROVAL
            command.customerTypeDto.status = StatusEnum.NEW_RECORD;
            command.customerTypeDto.activityLogs = [];
            command.customerTypeDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Customer type created by ${command.user.username} for approval`
            );
            command.customerTypeDto.forApprovalVersion = {};
            command.customerTypeDto.forApprovalVersion.customerTypeName = command.customerTypeDto.customerTypeName;
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, customerTypeName: string): never {
        this.logger.error(`Error processing create request for ${customerTypeName}:`, error);

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
