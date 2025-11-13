import { ErrorResponseDto, ResponseDto, SalesTypeDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { SalesTypeDatabaseServiceAbstract } from '@invoicing-database-service';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DenySalesTypeCommand } from './deny.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DenySalesTypeCommand)
export class DenySalesTypeHandler implements ICommandHandler<DenySalesTypeCommand> {
    protected readonly logger = new Logger(DenySalesTypeHandler.name);

    constructor(
        @Inject('SalesTypeDatabaseService')
        private readonly salesTypeDatabaseService: SalesTypeDatabaseServiceAbstract
    ) {}

    async execute(command: DenySalesTypeCommand): Promise<ResponseDto<SalesTypeDto | ErrorResponseDto>> {
        this.logger.log(`Processing denial request for sales type: ${command.salesTypeId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateSalesTypeExists(command.salesTypeId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process denial based on current status
            return await this.processDenial(existingRecord, command.user);
        } catch (error) {
            return this.handleError(error, command.salesTypeId);
        }
    }

    /**
     * Validates that the sales type record exists
     */
    private async validateSalesTypeExists(recordId: string): Promise<SalesTypeDto> {
        const existingRecord = await this.salesTypeDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Sales type not found: ${recordId}`);
            throw new NotFoundException(`Sales type record not found for id ${recordId}`);
        }

        return existingRecord;
    }

    /**
     * Validates that the user has authorization to deny
     */
    private validateUserAuthorization(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new ForbiddenException('User roles not found');
        }

        const hasApprovalPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasApprovalPermission) {
            throw new ForbiddenException('Current user is not authorized to deny sales type change request');
        }
    }

    /**
     * Processes the denial based on the current status of the record
     */
    private async processDenial(existingRecord: SalesTypeDto, user: any): Promise<ResponseDto<SalesTypeDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denySalesType(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.denyDeletion(existingRecord);
            case StatusEnum.NEW_RECORD:
                return await this.deleteRecord(existingRecord);
            default:
                throw new BadRequestException(`Cannot deny sales type with status: ${existingRecord.status}`);
        }
    }

    /**
     * Denies a sales type for approval
     */
    private async denySalesType(existingRecord: SalesTypeDto, user: any): Promise<ResponseDto<SalesTypeDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Sales type denied by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        
        // Clear forApprovalVersion first, then reset changeReason
        existingRecord.forApprovalVersion = {};
        existingRecord.changeReason = null;

        // Update record in database
        const updatedRecord = await this.salesTypeDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Sales type denied successfully: ${existingRecord.salesTypeId}`);
        return new ResponseDto<SalesTypeDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Denies deletion of a sales type
     */
    private async denyDeletion(existingRecord: SalesTypeDto): Promise<ResponseDto<SalesTypeDto>> {
        // Reset changeReason to null before reverting status
        existingRecord.changeReason = null;
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs = existingRecord.activityLogs || [];
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Sales type deletion denied, status reverted to ${StatusEnum.ACTIVE}`
        );
        
        // Limit activity logs to last 10 entries
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        
        const updatedRecord = await this.salesTypeDatabaseService.updateRecord(existingRecord);
        this.logger.log(`Sales type deletion denied: ${existingRecord.salesTypeId}`);
        return new ResponseDto<SalesTypeDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Deletes a sales type when it is a new record and it was denied
     */
    private async deleteRecord(existingRecord: SalesTypeDto): Promise<ResponseDto<SalesTypeDto>> {
        this.logger.log(`Sales type deleted: ${existingRecord.salesTypeId}`);
        await this.salesTypeDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<SalesTypeDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing denial request for ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof NotFoundException || error instanceof ForbiddenException) {
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
