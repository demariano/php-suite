import { UserCognito } from '@auth-guard-lib';
import { AreaDatabaseServiceAbstract } from '@customer-database-service';
import { AreaDto, ErrorResponseDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DenyAreaCommand } from './deny.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DenyAreaCommand)
export class DenyAreaHandler implements ICommandHandler<DenyAreaCommand> {
    protected readonly logger = new Logger(DenyAreaHandler.name);

    constructor(
        @Inject('AreaDatabaseService')
        private readonly areaDatabaseService: AreaDatabaseServiceAbstract
    ) {}

    async execute(command: DenyAreaCommand): Promise<ResponseDto<AreaDto | ErrorResponseDto>> {
        this.logger.log(`Processing denial request for area: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateAreaExists(command.recordId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process denial based on current status
            return await this.processDenial(existingRecord, command.user);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Validates that the area record exists
     */
    private async validateAreaExists(recordId: string): Promise<AreaDto> {
        const existingRecord = await this.areaDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Area not found: ${recordId}`);
            throw new NotFoundException(`Area record not found for id ${recordId}`);
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
            throw new ForbiddenException('Current user is not authorized to deny area change request');
        }
    }

    /**
     * Processes the denial based on the current status of the record
     */
    private async processDenial(existingRecord: AreaDto, user: UserCognito): Promise<ResponseDto<AreaDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denyArea(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.denyDeletion(existingRecord);
            case StatusEnum.NEW_RECORD:
                return await this.deleteRecord(existingRecord);
            default:
                throw new BadRequestException(`Cannot deny area with status: ${existingRecord.status}`);
        }
    }

    /**
     * Denies an area for approval
     */
    private async denyArea(existingRecord: AreaDto, user: UserCognito): Promise<ResponseDto<AreaDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Area denied by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.forApprovalVersion = {};

        // Reset changeReason after clearing forApprovalVersion
        existingRecord.changeReason = null;

        // Update record in database
        const updatedRecord = await this.areaDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Area denied successfully: ${existingRecord.areaId}`);
        return new ResponseDto<AreaDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Denies deletion of an area
     */
    private async denyDeletion(existingRecord: AreaDto): Promise<ResponseDto<AreaDto>> {
        // Reset changeReason when denying deletion
        existingRecord.changeReason = null;
        this.logger.log(`Area deletion denied: ${existingRecord.areaId}`);
        existingRecord.status = StatusEnum.ACTIVE;
        const updatedRecord = await this.areaDatabaseService.updateRecord(existingRecord);
        return new ResponseDto<AreaDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Deletes an area when it is a new record and it was denied
     */
    private async deleteRecord(existingRecord: AreaDto): Promise<ResponseDto<AreaDto>> {
        // Reset changeReason before deleting (for consistency)
        existingRecord.changeReason = null;
        this.logger.log(`Area deleted: ${existingRecord.areaId}`);
        await this.areaDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<AreaDto>(existingRecord, HTTP_STATUS_OK);
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
