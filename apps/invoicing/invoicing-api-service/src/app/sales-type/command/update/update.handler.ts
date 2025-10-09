import { ErrorResponseDto, ResponseDto, SalesTypeDto, StatusEnum, UserRole } from '@dto';
import { SalesTypeDatabaseServiceAbstract } from '@invoicing-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateSalesTypeCommand } from './update.command';

// Constants
const HTTP_STATUS_OK = 200;

@CommandHandler(UpdateSalesTypeCommand)
export class UpdateSalesTypeHandler implements ICommandHandler<UpdateSalesTypeCommand> {
    protected readonly logger = new Logger(UpdateSalesTypeHandler.name);

    constructor(
        @Inject('SalesTypeDatabaseService')
        private readonly salesTypeDatabaseService: SalesTypeDatabaseServiceAbstract
    ) {}

    async execute(command: UpdateSalesTypeCommand): Promise<ResponseDto<SalesTypeDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for sales type: ${command.salesTypeId}`);

        try {
            // Fetch existing record
            const existingRecord = await this.fetchExistingSalesType(command.salesTypeId);

            // Validate that sales type name doesn't already exist (if changed)
            await this.validateSalesTypeNameUnique(command.salesTypeDto.salesTypeName, command.salesTypeId);

            // Check user authorization and determine status
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateSalesTypeStatus(command, existingRecord, hasApprovalPermission);

            // Update record in database
            const updatedRecord = await this.salesTypeDatabaseService.updateRecord(command.salesTypeDto);

            this.logger.log(`Sales type updated successfully: ${updatedRecord.salesTypeId}`);
            return new ResponseDto<SalesTypeDto>(updatedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.salesTypeId);
        }
    }

    /**
     * Fetches and validates an existing sales type record
     */
    private async fetchExistingSalesType(salesTypeId: string): Promise<SalesTypeDto> {
        const existingRecord = await this.salesTypeDatabaseService.findRecordById(salesTypeId);

        if (!existingRecord) {
            this.logger.warn(`Sales type not found for ID: ${salesTypeId}`);
            throw new NotFoundException(`Sales type not found for ID: ${salesTypeId}`);
        }

        return existingRecord;
    }

    /**
     * Validates that the sales type name is unique (if changed)
     */
    private async validateSalesTypeNameUnique(salesTypeName: string, salesTypeId: string): Promise<void> {
        const existingRecord = await this.salesTypeDatabaseService.findRecordByName(salesTypeName);

        if (existingRecord && existingRecord.salesTypeId !== salesTypeId) {
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
    private updateSalesTypeStatus(
        command: UpdateSalesTypeCommand,
        existingRecord: SalesTypeDto,
        hasApprovalPermission: boolean
    ): void {
        console.log('hasApprovalPermission', hasApprovalPermission);
        if (hasApprovalPermission) {
            // User can approve directly - set to ACTIVE
            command.salesTypeDto.status = StatusEnum.ACTIVE;
            command.salesTypeDto.activityLogs = existingRecord.activityLogs || [];
            command.salesTypeDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Sales type updated by ${command.user.username}, status set to ${StatusEnum.ACTIVE}`
            );
        } else {
            // User needs approval - set to FOR_APPROVAL
            command.salesTypeDto.status = StatusEnum.FOR_APPROVAL;
            command.salesTypeDto.activityLogs = existingRecord.activityLogs || [];
            command.salesTypeDto.activityLogs.push(
                `Date: ${new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                })}, Sales type updated by ${command.user.username} for approval`
            );
            command.salesTypeDto.forApprovalVersion = {};
            command.salesTypeDto.forApprovalVersion.salesTypeName = command.salesTypeDto.salesTypeName;
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, salesTypeId: string): never {
        this.logger.error(`Error processing update request for ${salesTypeId}:`, error);

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
