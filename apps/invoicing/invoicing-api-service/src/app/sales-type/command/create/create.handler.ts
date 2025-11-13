import { ErrorResponseDto, ResponseDto, SalesTypeDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { SalesTypeDatabaseServiceAbstract } from '@invoicing-database-service';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateSalesTypeCommand } from './create.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_CREATED = 201;

@CommandHandler(CreateSalesTypeCommand)
export class CreateSalesTypeHandler implements ICommandHandler<CreateSalesTypeCommand> {
    protected readonly logger = new Logger(CreateSalesTypeHandler.name);

    constructor(
        @Inject('SalesTypeDatabaseService')
        private readonly salesTypeDatabaseService: SalesTypeDatabaseServiceAbstract
    ) {}

    async execute(command: CreateSalesTypeCommand): Promise<ResponseDto<SalesTypeDto | ErrorResponseDto>> {
        this.logger.log(`Processing create request for sales type: ${command.salesTypeDto.salesTypeName}`);

        try {
            // Validate that sales type name doesn't already exist
            await this.validateSalesTypeNameUnique(command.salesTypeDto.salesTypeName);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateSalesTypeStatus(command, hasApprovalPermission);

            // Create record in database
            const createdRecord = await this.salesTypeDatabaseService.createRecord(command.salesTypeDto);

            this.logger.log(`Sales type created successfully: ${createdRecord.salesTypeId}`);
            return new ResponseDto<SalesTypeDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.salesTypeDto.salesTypeName);
        }
    }

    /**
     * Validates that the sales type name is unique
     */
    private async validateSalesTypeNameUnique(salesTypeName: string): Promise<void> {
        const existingRecord = await this.salesTypeDatabaseService.findRecordByName(salesTypeName);

        if (existingRecord) {
            this.logger.warn(`Sales type name already exists: ${salesTypeName}`);
            throw new BadRequestException('Sales type name already exists');
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
     * Updates sales type status and activity logs based on user permissions
     */
    private updateSalesTypeStatus(command: CreateSalesTypeCommand, hasApprovalPermission: boolean): void {
        console.log('hasApprovalPermission', hasApprovalPermission);
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            command.salesTypeDto.status = StatusEnum.ACTIVE;
            command.salesTypeDto.activityLogs = [];
            command.salesTypeDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Sales type created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );
            // Limit activity logs to last 10 entries
            command.salesTypeDto.activityLogs = reduceArrayContents(command.salesTypeDto.activityLogs, ACTIVITY_LOGS_LIMIT);
        } else {
            // User needs approval - set to FOR_APPROVAL
            command.salesTypeDto.status = StatusEnum.NEW_RECORD;
            command.salesTypeDto.activityLogs = [];
            command.salesTypeDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Sales type created by ${command.user.username} for approval`
            );
            // Limit activity logs to last 10 entries
            command.salesTypeDto.activityLogs = reduceArrayContents(command.salesTypeDto.activityLogs, ACTIVITY_LOGS_LIMIT);
            command.salesTypeDto.forApprovalVersion = {};
            command.salesTypeDto.forApprovalVersion.salesTypeName = command.salesTypeDto.salesTypeName;
            command.salesTypeDto.forApprovalVersion.allowDiscount = command.salesTypeDto.allowDiscount;
            command.salesTypeDto.forApprovalVersion.contractSales = command.salesTypeDto.contractSales;
            command.salesTypeDto.forApprovalVersion.defaultDiscount = command.salesTypeDto.defaultDiscount;
            command.salesTypeDto.forApprovalVersion.defaultTax = command.salesTypeDto.defaultTax;
            command.salesTypeDto.forApprovalVersion.incomeGenerating = command.salesTypeDto.incomeGenerating;
            command.salesTypeDto.forApprovalVersion.taxable = command.salesTypeDto.taxable;
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, salesTypeName: string): never {
        this.logger.error(`Error processing create request for ${salesTypeName}:`, error);

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
