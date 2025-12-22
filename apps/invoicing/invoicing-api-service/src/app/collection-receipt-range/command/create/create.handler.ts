import {
    CollectionReceiptRangeDto,
    CreateCollectionReceiptRangeDto,
    ErrorResponseDto,
    RangeStatusEnum,
    ResponseDto,
    UserRole,
} from '@dto';
import { CollectionReceiptRangeDatabaseServiceAbstract } from '@invoicing-database-service';
import { BadRequestException, Inject, Logger, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateCollectionReceiptRangeCommand } from './create.command';

// Constants
const ACTIVITY_LOGS_LIMIT = 10;
const HTTP_STATUS_CREATED = 201;

@CommandHandler(CreateCollectionReceiptRangeCommand)
export class CreateCollectionReceiptRangeHandler implements ICommandHandler<CreateCollectionReceiptRangeCommand> {
    protected readonly logger = new Logger(CreateCollectionReceiptRangeHandler.name);

    constructor(
        @Inject('CollectionReceiptRangeDatabaseService')
        private readonly collectionReceiptRangeDatabaseService: CollectionReceiptRangeDatabaseServiceAbstract
    ) {}

    async execute(
        command: CreateCollectionReceiptRangeCommand
    ): Promise<ResponseDto<CollectionReceiptRangeDto | ErrorResponseDto>> {
        this.logger.log(`Processing create request for collection receipt range: ${command.rangeDto.areaId}`);

        try {
            // Check admin authorization
            this.validateAdminAccess(command.user.roles);

            // Validate range
            await this.validateRange(command.rangeDto);

            // Set defaults
            command.rangeDto.lastUsedNumber = command.rangeDto.lastUsedNumber ?? command.rangeDto.startNumber - 1;
            command.rangeDto.rangeStatus = command.rangeDto.rangeStatus ?? RangeStatusEnum.AVAILABLE;
            command.rangeDto.cancelledReceiptNumbers = command.rangeDto.cancelledReceiptNumbers ?? [];
            command.rangeDto.activityLogs = command.rangeDto.activityLogs ?? [];

            // Add activity log
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Collection receipt range created by ${command.user.username}`;
            command.rangeDto.activityLogs.push(activityLog);

            // Limit activity logs to last 10 entries
            if (command.rangeDto.activityLogs.length > ACTIVITY_LOGS_LIMIT) {
                command.rangeDto.activityLogs = command.rangeDto.activityLogs.slice(-ACTIVITY_LOGS_LIMIT);
            }

            // Create record in database
            const createdRecord = await this.collectionReceiptRangeDatabaseService.createRecord(command.rangeDto);

            this.logger.log(`Collection receipt range created successfully: ${createdRecord.collectionReceiptRangeId}`);
            return new ResponseDto<CollectionReceiptRangeDto>(createdRecord, HTTP_STATUS_CREATED);
        } catch (error) {
            return this.handleError(error, command.rangeDto.areaId);
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
     * Validates the range data
     */
    private async validateRange(rangeDto: CreateCollectionReceiptRangeDto): Promise<void> {
        // Validate startNumber < endNumber
        if (rangeDto.startNumber >= rangeDto.endNumber) {
            throw new BadRequestException('Start number must be less than end number');
        }

        // Validate range doesn't overlap with existing ranges for the same area
        const existingRanges = await this.collectionReceiptRangeDatabaseService.findRecordsByAreaId(
            1000,
            rangeDto.areaId,
            'next',
            ''
        );

        for (const existingRange of existingRanges.data) {
            // Check for overlap: new range overlaps if:
            // - new start is within existing range, OR
            // - new end is within existing range, OR
            // - new range completely contains existing range
            const overlaps =
                (rangeDto.startNumber >= existingRange.startNumber &&
                    rangeDto.startNumber <= existingRange.endNumber) ||
                (rangeDto.endNumber >= existingRange.startNumber && rangeDto.endNumber <= existingRange.endNumber) ||
                (rangeDto.startNumber <= existingRange.startNumber && rangeDto.endNumber >= existingRange.endNumber);

            if (overlaps) {
                throw new BadRequestException(
                    `Range overlaps with existing range ${existingRange.startNumber}-${existingRange.endNumber} for this area`
                );
            }
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, areaId: string): never {
        this.logger.error(`Error processing create request for area ${areaId}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
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

