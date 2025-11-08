import { ErrorResponseDto, ResponseDto, StatusEnum, StockDeliveryDto, UserRole } from '@dto';
import { StockDeliveryDatabaseServiceAbstract } from '@inventory-database-service';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteStockDeliveryCommand } from './delete.command';

// Constants
const HTTP_STATUS_OK = 200;

@CommandHandler(DeleteStockDeliveryCommand)
export class DeleteStockDeliveryHandler implements ICommandHandler<DeleteStockDeliveryCommand> {
    protected readonly logger = new Logger(DeleteStockDeliveryHandler.name);

    constructor(
        @Inject('StockDeliveryDatabaseService')
        private readonly stockDeliveryDatabaseService: StockDeliveryDatabaseServiceAbstract
    ) {}

    async execute(command: DeleteStockDeliveryCommand): Promise<ResponseDto<StockDeliveryDto | ErrorResponseDto>> {
        this.logger.log(`Processing delete request for stock delivery: ${command.id}`);

        try {
            // Fetch and validate existing stock delivery record
            const existingRecord = await this.validateStockDeliveryExists(command.id);

            // Check user authorization
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateStockDeliveryStatus(command, existingRecord, hasApprovalPermission);

            // Delete or mark for deletion based on permissions
            const deletedRecord = await this.performDeletion(command, hasApprovalPermission);

            this.logger.log(`Stock delivery deleted successfully: ${deletedRecord.stockDeliveryId}`);
            return new ResponseDto<StockDeliveryDto>(deletedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.id);
        }
    }

    /**
     * Validates that the stock delivery exists
     */
    private async validateStockDeliveryExists(recordId: string): Promise<StockDeliveryDto> {
        const existingRecord = await this.stockDeliveryDatabaseService.findRecordById(recordId);

        if (!existingRecord) {
            this.logger.warn(`Stock delivery not found: ${recordId}`);
            throw new NotFoundException(`Stock delivery record not found for id ${recordId}`);
        }

        return existingRecord;
    }

    /**
     * Checks if user has permission to delete directly
     */
    private hasApprovalPermission(userRoles?: string[]): boolean {
        if (!userRoles || userRoles.length === 0) {
            return false;
        }

        return userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);
    }

    /**
     * Updates stock delivery status and activity logs based on user permissions
     */
    private updateStockDeliveryStatus(
        command: DeleteStockDeliveryCommand,
        existingRecord: StockDeliveryDto,
        hasApprovalPermission: boolean
    ): void {
        // Set the ID
        command.stockDeliveryDto.stockDeliveryId = command.id;

        if (hasApprovalPermission) {
            // User can delete directly - set to FOR_DELETION for hard delete
            command.stockDeliveryDto.status = StatusEnum.FOR_DELETION;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Stock delivery deleted by ${command.user.username}`;
            command.stockDeliveryDto.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        } else {
            // User needs approval - set to FOR_DELETION for soft delete
            command.stockDeliveryDto.status = StatusEnum.FOR_DELETION;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Stock delivery marked for deletion by ${command.user.username}`;
            command.stockDeliveryDto.activityLogs = [...(existingRecord.activityLogs || []), activityLog];
        }
    }

    /**
     * Performs the actual deletion based on user permissions
     */
    private async performDeletion(
        command: DeleteStockDeliveryCommand,
        hasApprovalPermission: boolean
    ): Promise<StockDeliveryDto> {
        if (hasApprovalPermission) {
            // Hard delete
            return await this.stockDeliveryDatabaseService.deleteRecord(command.stockDeliveryDto);
        } else {
            // Soft delete (mark for deletion)
            return await this.stockDeliveryDatabaseService.updateRecord(command.stockDeliveryDto);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: unknown, recordId: string): never {
        this.logger.error(`Error processing delete request for ${recordId}:`, error);

        // Re-throw known exceptions
        if (error instanceof BadRequestException || error instanceof NotFoundException) {
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
