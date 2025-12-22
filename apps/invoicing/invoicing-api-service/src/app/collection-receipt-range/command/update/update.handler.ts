import {
    CollectionReceiptRangeDto,
    ErrorResponseDto,
    RangeStatusEnum,
    ResponseDto,
    UserRole,
} from '@dto';
import { CollectionReceiptRangeDatabaseServiceAbstract } from '@invoicing-database-service';
import { BadRequestException, Inject, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateCollectionReceiptRangeCommand } from './update.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_OK = 200;

@CommandHandler(UpdateCollectionReceiptRangeCommand)
export class UpdateCollectionReceiptRangeHandler implements ICommandHandler<UpdateCollectionReceiptRangeCommand> {
    protected readonly logger = new Logger(UpdateCollectionReceiptRangeHandler.name);

    constructor(
        @Inject('CollectionReceiptRangeDatabaseService')
        private readonly collectionReceiptRangeDatabaseService: CollectionReceiptRangeDatabaseServiceAbstract
    ) {}

    async execute(
        command: UpdateCollectionReceiptRangeCommand
    ): Promise<ResponseDto<CollectionReceiptRangeDto | ErrorResponseDto>> {
        this.logger.log(`Processing update request for collection receipt range: ${command.id}`);

        try {
            // Check admin authorization
            this.validateAdminAccess(command.user.roles);

            // Validate that range exists
            const existingRecord = await this.validateRangeExists(command.id);

            // Don't allow manually setting rangeStatus to ALL_USED_UP (only via getNextAvailableReceiptNumber)
            if (
                command.rangeDto.rangeStatus === RangeStatusEnum.ALL_USED_UP &&
                existingRecord.rangeStatus !== RangeStatusEnum.ALL_USED_UP
            ) {
                throw new BadRequestException('Cannot manually set range status to ALL_USED_UP');
            }

            // Update the existing record with new values
            existingRecord.areaId = command.rangeDto.areaId;
            existingRecord.areaName = command.rangeDto.areaName;
            existingRecord.startNumber = command.rangeDto.startNumber;
            existingRecord.endNumber = command.rangeDto.endNumber;
            existingRecord.lastUsedNumber = command.rangeDto.lastUsedNumber;
            existingRecord.rangeStatus = command.rangeDto.rangeStatus;
            existingRecord.cancelledReceiptNumbers = command.rangeDto.cancelledReceiptNumbers ?? [];
            existingRecord.activityLogs = existingRecord.activityLogs ?? [];

            // Add activity log
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Collection receipt range updated by ${command.user.username}`;
            existingRecord.activityLogs.push(activityLog);

            // Limit activity logs to last 10 entries
            if (existingRecord.activityLogs.length > ACTIVITY_LOGS_LIMIT) {
                existingRecord.activityLogs = existingRecord.activityLogs.slice(-ACTIVITY_LOGS_LIMIT);
            }

            // Update record in database
            const updatedRecord = await this.collectionReceiptRangeDatabaseService.updateRecord(existingRecord);

            this.logger.log(`Collection receipt range updated successfully: ${updatedRecord.collectionReceiptRangeId}`);
            return new ResponseDto<CollectionReceiptRangeDto>(updatedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.id);
        }
    }

    /**
     * Validates that the user is an admin or super admin
     */
    private validateAdminAccess(userRoles?: string[]): void {
        if (!userRoles || userRoles.length === 0) {
            throw new UnauthorizedException('Admin access required');
        }

        const isAdmin = userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);
        if (!isAdmin) {
            throw new UnauthorizedException('Admin access required');
        }
    }

    /**
     * Validates that the range exists
     */
    private async validateRangeExists(recordId: string): Promise<CollectionReceiptRangeDto> {
        const existingRecord = await this.collectionReceiptRangeDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Collection receipt range not found: ${recordId}`);
            throw new NotFoundException(`Collection receipt range not found for id ${recordId}`);
        }

        return existingRecord;
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing update request for ${recordId}:`, error);

        // Re-throw known exceptions
        if (
            error instanceof BadRequestException ||
            error instanceof NotFoundException ||
            error instanceof UnauthorizedException
        ) {
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

