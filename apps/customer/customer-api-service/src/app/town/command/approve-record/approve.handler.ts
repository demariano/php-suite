import { UserCognito } from '@auth-guard-lib';
import { TownDatabaseServiceAbstract } from '@customer-database-service';
import { ErrorResponseDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { TownDto } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApproveTownCommand } from './approve.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(ApproveTownCommand)
export class ApproveTownHandler implements ICommandHandler<ApproveTownCommand> {
    protected readonly logger = new Logger(ApproveTownHandler.name);

    constructor(
        @Inject('TownDatabaseService')
        private readonly townDatabaseService: TownDatabaseServiceAbstract
    ) {}

    async execute(command: ApproveTownCommand): Promise<ResponseDto<TownDto | ErrorResponseDto>> {
        this.logger.log(`Processing approval request for town: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateTownExists(command.recordId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process approval based on current status
            return await this.processApproval(existingRecord, command.user);
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
     * Validates that the user has authorization to approve
     */
    private validateUserAuthorization(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new ForbiddenException('User roles not found');
        }

        const hasApprovalPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasApprovalPermission) {
            throw new ForbiddenException('Current user is not authorized to approve town change request');
        }
    }

    /**
     * Processes the approval based on the current status of the record
     */
    private async processApproval(
        existingRecord: TownDto,
        user: UserCognito
    ): Promise<ResponseDto<TownDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
            case StatusEnum.NEW_RECORD:
                return await this.approveTown(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.approveDeletion(existingRecord);
            default:
                throw new BadRequestException(`Cannot approve town with status: ${existingRecord.status}`);
        }
    }

    /**
     * Approves a town for approval
     */
    private async approveTown(
        existingRecord: TownDto,
        user: UserCognito
    ): Promise<ResponseDto<TownDto>> {
        // Update status and add activity log
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Town approved by ${user.username}, status set to ${StatusEnum.ACTIVE}`
        );

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        const forApprovalVersion = existingRecord.forApprovalVersion;
        existingRecord.townName = forApprovalVersion.townName as string;
        existingRecord.areaId = forApprovalVersion.areaId as string;
        existingRecord.areaName = forApprovalVersion.areaName as string;
        existingRecord.forApprovalVersion = {};

        // Reset changeReason after applying changes
        existingRecord.changeReason = null;

        // Update record in database
        const updatedRecord = await this.townDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Town approved successfully: ${existingRecord.townId}`);
        return new ResponseDto<TownDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Approves deletion of a town
     */
    private async approveDeletion(existingRecord: TownDto): Promise<ResponseDto<TownDto>> {
        // Reset changeReason before deleting
        existingRecord.changeReason = null;
        await this.townDatabaseService.deleteRecord(existingRecord);

        this.logger.log(`Town deletion approved: ${existingRecord.townId}`);
        return new ResponseDto<TownDto>(existingRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing approval request for ${recordId}:`, error);

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
