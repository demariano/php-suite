import { CollectionReceiptRangeDto, ErrorResponseDto, ResponseDto, StatusEnum, UserRole } from '@dto';
import { reduceArrayContents } from '@dynamo-db-lib';
import { CollectionReceiptRangeDatabaseServiceAbstract } from '@invoicing-database-service';
import { BadRequestException, Inject, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteCollectionReceiptRangeCommand } from './delete.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(DeleteCollectionReceiptRangeCommand)
export class DeleteCollectionReceiptRangeHandler implements ICommandHandler<DeleteCollectionReceiptRangeCommand> {
    protected readonly logger = new Logger(DeleteCollectionReceiptRangeHandler.name);

    constructor(
        @Inject('CollectionReceiptRangeDatabaseService')
        private readonly collectionReceiptRangeDatabaseService: CollectionReceiptRangeDatabaseServiceAbstract
    ) {}

    async execute(
        command: DeleteCollectionReceiptRangeCommand
    ): Promise<ResponseDto<CollectionReceiptRangeDto | ErrorResponseDto>> {
        this.logger.log(`Processing delete request for collection receipt range: ${command.id}`);

        try {
            // Validate that range exists
            const existingRecord = await this.validateRangeExists(command.id);

            // Check user authorization
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status
            this.updateRangeStatus(command, existingRecord, hasApprovalPermission);

            // Perform deletion
            const result = await this.performDeletion(command, hasApprovalPermission);

            this.logger.log(`Collection receipt range deletion processed successfully: ${command.id}`);
            return new ResponseDto<CollectionReceiptRangeDto>(result, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.id);
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
     * Checks if user has permission to approve deletions
     */
    private hasApprovalPermission(userRoles?: string[]): boolean {
        if (!userRoles || userRoles.length === 0) {
            return false;
        }

        return userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);
    }

    /**
     * Updates the range status based on user permissions
     */
    private updateRangeStatus(
        command: DeleteCollectionReceiptRangeCommand,
        existingRecord: CollectionReceiptRangeDto,
        hasApprovalPermission: boolean
    ): void {
        // Set the ID
        command.rangeDto.collectionReceiptRangeId = command.id;

        if (hasApprovalPermission) {
            // User can delete directly - set to FOR_DEACTIVATION
            command.rangeDto.status = StatusEnum.FOR_DEACTIVATION;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Collection receipt range deleted by ${command.user.username}`;
            command.rangeDto.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        } else {
            // User needs approval - set to FOR_DEACTIVATION
            command.rangeDto.status = StatusEnum.FOR_DEACTIVATION;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Collection receipt range marked for deletion by ${command.user.username}`;
            command.rangeDto.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        }

        // Limit activity logs
        command.rangeDto.activityLogs = reduceArrayContents(command.rangeDto.activityLogs, ACTIVITY_LOGS_LIMIT);
    }

    /**
     * Performs the actual deletion based on user permissions
     */
    private async performDeletion(
        command: DeleteCollectionReceiptRangeCommand,
        hasApprovalPermission: boolean
    ): Promise<CollectionReceiptRangeDto> {
        if (hasApprovalPermission) {
            // Update with status for approval workflow
            return await this.collectionReceiptRangeDatabaseService.updateRecord(command.rangeDto);
        } else {
            // Mark for deletion approval
            return await this.collectionReceiptRangeDatabaseService.updateRecord(command.rangeDto);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing delete request for ${recordId}:`, error);

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
