import { UserCognito } from '@auth-guard-lib';
import { ErrorResponseDto, ResponseDto, ReturnGoodSoldDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { ReturnGoodSoldDatabaseServiceAbstractClass } from '@invoicing-database-service';
import { BadRequestException, ForbiddenException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DenyReturnGoodSoldCommand } from './deny.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(DenyReturnGoodSoldCommand)
export class DenyReturnGoodSoldHandler implements ICommandHandler<DenyReturnGoodSoldCommand> {
    protected readonly logger = new Logger(DenyReturnGoodSoldHandler.name);

    constructor(
        @Inject('ReturnGoodSoldDatabaseService')
        private readonly returnGoodSoldDatabaseService: ReturnGoodSoldDatabaseServiceAbstractClass
    ) {}

    async execute(command: DenyReturnGoodSoldCommand): Promise<ResponseDto<ReturnGoodSoldDto | ErrorResponseDto>> {
        this.logger.log(`Processing deny request for return good sold: ${command.recordId}`);

        try {
            // Validate record exists
            const existingRecord = await this.validateReturnGoodSoldExists(command.recordId);

            // Check user authorization
            this.validateUserAuthorization(command.user.roles);

            // Process denial based on current status
            return await this.processDenial(existingRecord, command.user);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Validates that the return good sold record exists
     */
    private async validateReturnGoodSoldExists(recordId: string): Promise<ReturnGoodSoldDto> {
        const existingRecord = await this.returnGoodSoldDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Return Good Sold not found: ${recordId}`);
            throw new NotFoundException(`Return Good Sold record not found for id ${recordId}`);
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

        const hasDenyPermission = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);

        if (!hasDenyPermission) {
            throw new ForbiddenException('Current user is not authorized to deny return good sold change request');
        }
    }

    /**
     * Processes the denial based on the current status of the record
     */
    private async processDenial(
        existingRecord: ReturnGoodSoldDto,
        user: UserCognito
    ): Promise<ResponseDto<ReturnGoodSoldDto>> {
        switch (existingRecord.status) {
            case StatusEnum.FOR_APPROVAL:
                return await this.denyUpdate(existingRecord, user);
            case StatusEnum.FOR_DELETION:
                return await this.denyDeletion(existingRecord, user);
            default:
                throw new BadRequestException(`Cannot deny return good sold with status: ${existingRecord.status}`);
        }
    }

    /**
     * Denies an update request
     */
    private async denyUpdate(
        existingRecord: ReturnGoodSoldDto,
        user: UserCognito
    ): Promise<ResponseDto<ReturnGoodSoldDto>> {
        // Revert status back to ACTIVE
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.changeReason = null;
        existingRecord.forApprovalVersion = {};

        // Add activity log
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Return Good Sold update denied by ${user.username}, status reverted to ${StatusEnum.ACTIVE}`
        );

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Update record in database
        const updatedRecord = await this.returnGoodSoldDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Return Good Sold update denied: ${existingRecord.returnGoodSoldId}`);
        return new ResponseDto<ReturnGoodSoldDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Denies a deletion request
     */
    private async denyDeletion(
        existingRecord: ReturnGoodSoldDto,
        user: UserCognito
    ): Promise<ResponseDto<ReturnGoodSoldDto>> {
        // Revert status back to ACTIVE
        existingRecord.status = StatusEnum.ACTIVE;
        existingRecord.changeReason = null;
        existingRecord.forApprovalVersion = {};

        // Add activity log
        existingRecord.activityLogs.push(
            `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Return Good Sold deletion denied by ${user.username}, status reverted to ${StatusEnum.ACTIVE}`
        );

        // Optimize activity logs
        existingRecord.activityLogs = reduceArrayContents(existingRecord.activityLogs, ACTIVITY_LOGS_LIMIT);

        // Update record in database
        const updatedRecord = await this.returnGoodSoldDatabaseService.updateRecord(existingRecord);

        this.logger.log(`Return Good Sold deletion denied: ${existingRecord.returnGoodSoldId}`);
        return new ResponseDto<ReturnGoodSoldDto>(updatedRecord, HTTP_STATUS_OK);
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing deny request for ${recordId}:`, error);

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
