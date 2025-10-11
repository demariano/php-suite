import { ErrorResponseDto, ResponseDto, SalesTypeDto, StatusEnum, UserRole } from '@dto';
import { SalesTypeDatabaseServiceAbstract } from '@invoicing-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteSalesTypeCommand } from './delete.command';

// Constants
const HTTP_STATUS_OK = 200;

@CommandHandler(DeleteSalesTypeCommand)
export class DeleteSalesTypeHandler implements ICommandHandler<DeleteSalesTypeCommand> {
    protected readonly logger = new Logger(DeleteSalesTypeHandler.name);

    constructor(
        @Inject('SalesTypeDatabaseService')
        private readonly salesTypeDatabaseService: SalesTypeDatabaseServiceAbstract
    ) {}

    async execute(command: DeleteSalesTypeCommand): Promise<ResponseDto<SalesTypeDto | ErrorResponseDto>> {
        this.logger.log(`Processing delete request for sales type: ${command.salesTypeId}`);

        try {
            // Fetch and validate existing sales type record
            const existingRecord = await this.fetchExistingSalesType(command.salesTypeId);

            // Check user authorization
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateSalesTypeStatus(command, existingRecord, hasApprovalPermission);

            // Delete or mark for deletion based on permissions
            const deletedRecord = await this.performDeletion(command, hasApprovalPermission);

            this.logger.log(`Sales type deleted successfully: ${deletedRecord.salesTypeId}`);
            return new ResponseDto<SalesTypeDto>(deletedRecord, HTTP_STATUS_OK);
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
        command: DeleteSalesTypeCommand,
        existingRecord: SalesTypeDto,
        hasApprovalPermission: boolean
    ): void {
        // Set the ID
        command.salesTypeDto.salesTypeId = command.salesTypeId;

        if (hasApprovalPermission) {
            // User can delete directly - set to FOR_DELETION for hard delete
            command.salesTypeDto.status = StatusEnum.FOR_DELETION;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Sales type deleted by ${command.user.username}`;
            command.salesTypeDto.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        } else {
            // User needs approval - set to FOR_DELETION for soft delete
            command.salesTypeDto.status = StatusEnum.FOR_DELETION;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Sales type marked for deletion by ${command.user.username}`;
            command.salesTypeDto.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        }
    }

    /**
     * Performs the actual deletion based on user permissions
     */
    private async performDeletion(
        command: DeleteSalesTypeCommand,
        hasApprovalPermission: boolean
    ): Promise<SalesTypeDto> {
        if (hasApprovalPermission) {
            // Hard delete
            return await this.salesTypeDatabaseService.deleteRecord(command.salesTypeDto);
        } else {
            // Soft delete (mark for deletion)
            return await this.salesTypeDatabaseService.updateRecord(command.salesTypeDto);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, salesTypeId: string): never {
        this.logger.error(`Error processing delete request for ${salesTypeId}:`, error);

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
