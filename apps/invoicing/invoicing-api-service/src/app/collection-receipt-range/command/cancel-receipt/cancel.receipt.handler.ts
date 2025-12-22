import {
    CancelReceiptNumberRequestDto,
    ErrorResponseDto,
    ResponseDto,
    UserRole,
} from '@dto';
import { CollectionReceiptRangeDatabaseServiceAbstract } from '@invoicing-database-service';
import { BadRequestException, Inject, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CancelReceiptNumberCommand } from './cancel.receipt.command';

// Constants
const HTTP_STATUS_OK = 200;

@CommandHandler(CancelReceiptNumberCommand)
export class CancelReceiptNumberHandler implements ICommandHandler<CancelReceiptNumberCommand> {
    protected readonly logger = new Logger(CancelReceiptNumberHandler.name);

    constructor(
        @Inject('CollectionReceiptRangeDatabaseService')
        private readonly collectionReceiptRangeDatabaseService: CollectionReceiptRangeDatabaseServiceAbstract
    ) {}

    async execute(command: CancelReceiptNumberCommand): Promise<ResponseDto<{ message: string } | ErrorResponseDto>> {
        this.logger.log(
            `Processing cancel receipt number request: ${command.requestDto.receiptNumber} for range ${command.requestDto.collectionReceiptRangeId}`
        );

        try {
            // Validate admin access
            this.validateAdminAccess(command.user.roles);

            // Fetch range by collectionReceiptRangeId
            const range = await this.validateRangeExists(command.requestDto.collectionReceiptRangeId);

            // Validate receipt number is within range
            this.validateReceiptNumberInRange(command.requestDto.receiptNumber, range);

            // Check if receipt number is already cancelled
            this.validateReceiptNumberNotCancelled(command.requestDto.receiptNumber, range);

            // Call cancelReceiptNumber with areaId from the fetched range
            await this.collectionReceiptRangeDatabaseService.cancelReceiptNumber(
                command.requestDto.receiptNumber,
                range.areaId,
                command.requestDto.cancellationReason,
                command.user.username
            );

            this.logger.log(
                `Receipt number ${command.requestDto.receiptNumber} cancelled successfully for range ${command.requestDto.collectionReceiptRangeId}`
            );
            return new ResponseDto<{ message: string }>(
                { message: `Receipt number ${command.requestDto.receiptNumber} cancelled successfully` },
                HTTP_STATUS_OK
            );
        } catch (error) {
            return this.handleError(error, command.requestDto.receiptNumber);
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
    private async validateRangeExists(collectionReceiptRangeId: string) {
        const range = await this.collectionReceiptRangeDatabaseService.findRecordById(collectionReceiptRangeId);

        if (!range) {
            this.logger.warn(`Collection receipt range not found: ${collectionReceiptRangeId}`);
            throw new NotFoundException(`Collection receipt range not found for id ${collectionReceiptRangeId}`);
        }

        return range;
    }

    /**
     * Validates that the receipt number is within the range boundaries
     */
    private validateReceiptNumberInRange(receiptNumber: number, range: { startNumber: number; endNumber: number }): void {
        if (receiptNumber < range.startNumber || receiptNumber > range.endNumber) {
            throw new BadRequestException(
                `Receipt number ${receiptNumber} is out of range. Valid range is ${range.startNumber} to ${range.endNumber}`
            );
        }
    }

    /**
     * Validates that the receipt number is not already cancelled
     */
    private validateReceiptNumberNotCancelled(receiptNumber: number, range: { cancelledReceiptNumbers?: Array<{ receiptNumber: number }> }): void {
        const isAlreadyCancelled =
            range.cancelledReceiptNumbers?.some((cancelled) => cancelled.receiptNumber === receiptNumber) ?? false;

        if (isAlreadyCancelled) {
            throw new BadRequestException(`Receipt number ${receiptNumber} is already cancelled`);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, receiptNumber: number): never {
        this.logger.error(`Error processing cancel receipt number request for ${receiptNumber}:`, error);

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

