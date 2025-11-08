import { ErrorResponseDto, ResponseDto, StatusEnum, SupplierDto, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { SupplierDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateSupplierCommand } from './create.command';

// Constants
const HTTP_STATUS_CREATED = 201;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(CreateSupplierCommand)
export class CreateSupplierHandler implements ICommandHandler<CreateSupplierCommand> {
    protected readonly logger = new Logger(CreateSupplierHandler.name);

    constructor(
        @Inject('SupplierDatabaseService')
        private readonly supplierDatabaseService: SupplierDatabaseServiceAbstract
    ) {}

    async execute(command: CreateSupplierCommand): Promise<ResponseDto<SupplierDto | ErrorResponseDto>> {
        this.logger.log(`Processing create request for supplier: ${command.supplierDto.supplierName}`);

        try {
            // Validate that supplier name doesn't already exist
            await this.validateSupplierNameUnique(command.supplierDto.supplierName);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateSupplierStatus(command, hasApprovalPermission);

            // Create record in database
            const createdRecord = await this.supplierDatabaseService.createRecord(command.supplierDto);

            this.logger.log(`Supplier created successfully: ${createdRecord.supplierId}`);
            return new ResponseDto<SupplierDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.supplierDto.supplierName);
        }
    }

    /**
     * Validates that the supplier name is unique
     */
    private async validateSupplierNameUnique(supplierName: string): Promise<void> {
        const existingRecord = await this.supplierDatabaseService.findRecordContainingName(supplierName);

        if (existingRecord && existingRecord.length > 0) {
            // Check if any record has exact match
            const exactMatch = existingRecord.find((record) => record.supplierName === supplierName);
            if (exactMatch) {
                this.logger.warn(`Supplier name already exists: ${supplierName}`);
                throw new BadRequestException('Supplier name already exists');
            }
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
     * Updates supplier status and activity logs based on user permissions
     */
    private updateSupplierStatus(command: CreateSupplierCommand, hasApprovalPermission: boolean): void {
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            command.supplierDto.status = StatusEnum.ACTIVE;
            command.supplierDto.activityLogs = [];
            command.supplierDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Supplier created by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );

            // Limit activity logs to last 10 entries
            command.supplierDto.activityLogs = reduceArrayContents(
                command.supplierDto.activityLogs,
                ACTIVITY_LOGS_LIMIT
            );
            // Clear changeReason for admin users since changes are applied directly
            command.supplierDto.changeReason = undefined;
        } else {
            // User needs approval - set to NEW_RECORD
            command.supplierDto.status = StatusEnum.NEW_RECORD;
            command.supplierDto.activityLogs = [];
            command.supplierDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Supplier created by ${command.user.username} for approval`
            );

            // Limit activity logs to last 10 entries
            command.supplierDto.activityLogs = reduceArrayContents(
                command.supplierDto.activityLogs,
                ACTIVITY_LOGS_LIMIT
            );
            command.supplierDto.forApprovalVersion = {};
            command.supplierDto.forApprovalVersion.supplierName = command.supplierDto.supplierName;
            command.supplierDto.forApprovalVersion.supplierAddress = command.supplierDto.supplierAddress;
            command.supplierDto.forApprovalVersion.supplierPhone = command.supplierDto.supplierPhone;
            command.supplierDto.forApprovalVersion.supplierEmail = command.supplierDto.supplierEmail;
            command.supplierDto.forApprovalVersion.supplierContactPerson = command.supplierDto.supplierContactPerson;
            // Store changeReason in main record for admin visibility
            command.supplierDto.changeReason = command.supplierDto.changeReason;
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, supplierName: string): never {
        this.logger.error(`Error processing create request for ${supplierName}:`, error);

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

