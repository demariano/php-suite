import { UserCognito } from '@auth-guard-lib';
import { TownDatabaseServiceAbstract } from '@customer-database-service';
import { ErrorResponseDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { TownDto } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DenyTownCommand } from './deny.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DenyTownCommand)
export class DenyTownHandler implements ICommandHandler<DenyTownCommand> {
    protected readonly logger = new Logger(DenyTownHandler.name);

    constructor(
        @Inject('TownDatabaseService')
        private readonly townDatabaseService: TownDatabaseServiceAbstract
    ) {}

    async execute(command: DenyTownCommand): Promise<ResponseDto<TownDto | ErrorResponseDto>> {
        this.logger.log(`Processing denial request for town: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateTownExists(command.recordId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process denial based on current status
            return await this.processDenial(existingRecord, command.user);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Validates that the town record exists
     */
    private async validateTownExists(recordId: string): Promise<TownDto> {
        const existingRecord = await this.townDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Town not found: ${recordId}`);
            throw new NotFoundException(`Town record not found for id ${recordId}`);
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
            throw new ForbiddenException('Current user is not authorized to deny town change request');
        }
    }

    /**
     * Processes the denial based on the current status of the record
     */
    private async processDenial(
        existingRecord: TownDto,
        user: UserCognito
    ): Promise<ResponseDto<TownDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denyTown(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.denyDeletion(existingRecord);
            case StatusEnum.NEW_RECORD:
                return await this.deleteRecord(existingRecord);
            default:
                throw new BadRequestException(`Cannot deny town with status: ${existingRecord.status}`);
        }
    }

    /**
     * Denies a town for approval
     */
    private async denyTown(
        existingRecord: TownDto,
        user: UserCognito
    ): Promise<ResponseDto<TownDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Town denied by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);
        existingRecord.forApprovalVersion = {};

        // Reset changeReason after clearing forApprovalVersion
        existingRecord.changeReason = null;

        // Update record in database
        const updatedRecord = await this.townDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Town denied successfully: ${existingRecord.townId}`);
        return new ResponseDto<TownDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Denies deletion of a town
     */
    private async denyDeletion(existingRecord: TownDto): Promise<ResponseDto<TownDto>> {
        // Reset changeReason before reverting status
        existingRecord.changeReason = null;
        this.logger.log(`Town deletion denied: ${existingRecord.townId}`);
        existingRecord.status = StatusEnum.ACTIVE;
        const updatedRecord = await this.townDatabaseService.updateRecord(existingRecord);
        return new ResponseDto<TownDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Deletes a town when it is a new record and it was denied
     */
    private async deleteRecord(existingRecord: TownDto): Promise<ResponseDto<TownDto>> {
        // Reset changeReason before deleting (for consistency)
        existingRecord.changeReason = null;
        this.logger.log(`Town deleted: ${existingRecord.townId}`);
        await this.townDatabaseService.deleteRecord(existingRecord);
        return new ResponseDto<TownDto>(existingRecord, HTTP_STATUS_OK);
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
