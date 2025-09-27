import { ErrorResponseDto, ResponseDto, StatusEnum, StockDto, UserRole } from '@dto';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { StockDatabaseServiceAbstract } from '@stock-database-service';
import { DeleteStockCommand } from './delete.command';

// Constants
const HTTP_STATUS_OK = 200;
const ACTIVITY_LOGS_LIMIT = 10;

@CommandHandler(DeleteStockCommand)
export class DeleteStockHandler implements ICommandHandler<DeleteStockCommand> {
    protected readonly logger = new Logger(DeleteStockHandler.name);

    constructor(
        @Inject('StockDatabaseService')
        private readonly stockDatabaseService: StockDatabaseServiceAbstract
    ) {}

    async execute(command: DeleteStockCommand): Promise<ResponseDto<StockDto | ErrorResponseDto>> {
        this.logger.log(`Processing delete request for stock: ${command.recordId}`);

        try {
            // Fetch and validate existing stock record
            const existingRecord = await this.fetchStockById(command.recordId);

            // Check user authorization
            const hasApprovalPermission = this.hasApprovalPermission(command.user.roles);

            // Update status and activity logs based on permissions
            this.updateStockStatus(command, existingRecord, hasApprovalPermission);

            // Delete or mark for deletion based on permissions
            const deletedRecord = await this.performDeletion(command, hasApprovalPermission);

            this.logger.log(`Stock deleted successfully: ${deletedRecord.stockId}`);
            return new ResponseDto<StockDto>(deletedRecord, HTTP_STATUS_OK);
        } catch (error) {
            return this.handleError(error, command.recordId);
        }
    }

    /**
     * Fetches and validates a stock record by ID
     */
    private async fetchStockById(recordId: string): Promise<StockDto> {
        const stockRecord = await this.stockDatabaseService.findRecordById(recordId);

        if (!stockRecord) {
            this.logger.warn(`Stock not found for ID: ${recordId}`);
            throw new NotFoundException(`Stock not found for ID: ${recordId}`);
        }

        return stockRecord;
    }

    /**
     * Checks if user has permission to approve updates directly
     */
    private hasApprovalPermission(userRoles?: string[]): boolean {
        if (!userRoles || userRoles.length === 0) {
            return false;
        }

        return userRoles.includes(UserRole.SUPER_ADMIN) || userRoles.includes(UserRole.ADMIN);
    }

    /**
     * Updates stock status and activity logs based on user permissions
     */
    private updateStockStatus(
        command: DeleteStockCommand,
        existingRecord: StockDto,
        hasApprovalPermission: boolean
    ): void {
        // Set the ID
        command.stockDto.stockId = command.recordId;

        if (hasApprovalPermission) {
            // User can delete directly - set to FOR_DELETION for hard delete
            command.stockDto.status = StatusEnum.FOR_DELETION;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Stock deleted by ${command.user.username}`;
            command.stockDto.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

            // Limit activity logs to last 10 entries
            command.stockDto.activityLogs = reduceArrayContents(command.stockDto.activityLogs, ACTIVITY_LOGS_LIMIT);
        } else {
            // User needs approval - set to FOR_DELETION for soft delete
            command.stockDto.status = StatusEnum.FOR_DELETION;
            const activityLog = `Date: ${new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Manila',
            })}, Stock marked for deletion by ${command.user.username}`;
            command.stockDto.activityLogs = [...(existingRecord.activityLogs || []), activityLog];

            // Limit activity logs to last 10 entries
            command.stockDto.activityLogs = reduceArrayContents(command.stockDto.activityLogs, ACTIVITY_LOGS_LIMIT);
        }
    }

    /**
     * Performs the actual deletion based on user permissions
     */
    private async performDeletion(command: DeleteStockCommand, hasApprovalPermission: boolean): Promise<StockDto> {
        if (hasApprovalPermission) {
            // Hard delete
            return await this.stockDatabaseService.deleteRecord(command.stockDto);
        } else {
            // Soft delete (mark for deletion)
            return await this.stockDatabaseService.updateRecord(command.stockDto);
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
