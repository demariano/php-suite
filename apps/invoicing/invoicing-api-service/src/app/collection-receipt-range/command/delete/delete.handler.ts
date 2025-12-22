import { CollectionReceiptRangeDto, ErrorResponseDto, ResponseDto, UserRole } from '@dto';
import { CollectionReceiptRangeDatabaseServiceAbstract } from '@invoicing-database-service';
import { BadRequestException, Inject, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteCollectionReceiptRangeCommand } from './delete.command';

// Constants
const HTTP_STATUS_OK = 200;

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
            // Check admin authorization
            this.validateAdminAccess(command.user.roles);

            // Validate that range exists
            const existingRecord = await this.validateRangeExists(command.id);

            // Set the ID
            command.rangeDto.collectionReceiptRangeId = command.id;

            // Hard delete (admin-only, no approval needed)
            const deletedRecord = await this.collectionReceiptRangeDatabaseService.deleteRecord(existingRecord);

            this.logger.log(`Collection receipt range deleted successfully: ${deletedRecord.collectionReceiptRangeId}`);
            return new ResponseDto<CollectionReceiptRangeDto>(deletedRecord, HTTP_STATUS_OK);
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

